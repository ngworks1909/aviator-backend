import { createId } from "@paralleldrive/cuid2";
import { AviatorGame } from "./AviatorGame";
import { User } from "../users/User";
import { prisma } from "../../lib/client";

export interface Bid{
    userId: string,
    investedAmount: number,
    betId: string,
    cashedOut: boolean,
    rate?: number
}

class AviatorManager{
    private static instance: AviatorManager;
    private queue: Map<string, boolean> = new Map();
    
    private game: AviatorGame;
    constructor(){
        const roomId = createId();
        this.game = new AviatorGame(roomId)
    }
    static getInstance(): AviatorManager{
            if(AviatorManager.instance){
                return AviatorManager.instance;
            }
            AviatorManager.instance = new AviatorManager();
            return AviatorManager.instance;
    }

    public addPlayer(user: User){
        const userId = user.userId;
        this.game.players.set(user.userId, user)
        if(this.game.isRunning){
            const data = this.game.getCurrentData();
            user.socket.emit("AVIATOR_RUNNING_GAME", data);
        }
        else{
            const data = this.game.getRemainingWaitingTime().toString()
            user.socket.emit("AVIATOR_WAITING", data);
        }
    }

    public removePlayer(userId: string){
        this.game.players.delete(userId);
    }

    private async addReferral(referralId: string){
        await prisma.user.update({
            where: {
                referralId
            },
            data: {
                wallet: {
                    update: {
                        bonus: {
                            increment: 100
                        }
                    }
                }
            }
        })
    }



    private async checkReferral(userId: string){
        const user = await prisma.user.findUnique({
           where: {
            userId,
           },
           select: {
            mobile: true,
            referredBy: true,
            referralStatus: true,
            _count: {
                select: {
                    bets: true,
                    payments: {
                        where: {
                            paymentStatus: 'Success'
                        }
                    }
                }
            }
           }
        });

        if(!user || !user.referredBy) return
        if(user.referralStatus === "None" || user.referralStatus === "Done") return
        if(user._count.bets < 10 || user._count.payments < 1) return
        await this.addReferral(user.referredBy)
        await prisma.user.update({
            where: {
                userId
            },
            data: {
                referralStatus: "Done"
            }
        })
    }


    public addBid(user: User, amount: number){
        const userId = user.userId;
        if(amount < 10) return;
        if(this.game.isRunning) return;
        if(this.queue.get(user.userId)) return
        this.queue.set(user.userId, true);
        const bid = this.game.biddings.get(user.userId);
        if(bid) return;
        const roomId = this.game.roomId
        const maxRate = this.game.maxRate;
        prisma.$transaction(async(tx) => {
            const wallet = await tx.wallet.findUnique({
                where: {
                    userId
                },
                select: {
                   balance: true,
                   walletId: true,
                   bonus: true
                }
            })
            if(!wallet) return
            if(wallet.balance + wallet.bonus < amount) return
            if(wallet.balance >= amount){
                await tx.wallet.update({
                    where: {
                        walletId: wallet.walletId
                    },
                    data: {
                        balance: {
                            decrement: amount
                        }
                    }
                })
            }
            else if (wallet.balance > 0 ){
                await tx.wallet.update({
                    where: {
                        walletId: wallet.walletId
                    },
                    data: {
                        balance: {
                            set: 0
                        },
                        bonus: {
                            set: (wallet.balance + wallet.bonus) - amount
                        }
                    }
                })
            }
            else{
                await tx.wallet.update({
                    where: {
                        walletId: wallet.walletId
                    },
                    data: {
                        bonus: {
                            decrement: amount
                        }
                    }
                })
            }

            const betId = createId();

            const room = await tx.room.findUnique({
                where: {
                    roomId
                }
            });
            if(!room){
                await tx.room.create({
                    data: {
                        roomId,
                        maxRate
                    }
                })
            }

            await tx.bet.create({
                data: {
                    betId,
                    userId,
                    amount,
                    roomId
                }
            })

            this.checkReferral(userId)

            const bet: Bid = {userId, investedAmount: amount, cashedOut: false, betId}
            this.game.biddings.set(userId, bet)
            user.socket.emit("AVIATOR_BID_SUCCESS");
            this.queue.delete(user.userId);

        })
    }


    public cashOutBid(user: User){
        if(!this.game.isRunning) return;
        const rate = this.game.getCurrentRate();
        const bid = this.game.biddings.get(user.userId);
        if(!bid) return;
        this.game.biddings.delete(user.userId)
        const winAmount = bid.investedAmount * rate;
        prisma.$transaction(async(tx) => {
            await tx.bet.update({
                where: {
                    betId: bid.betId
                },
                data: {
                    cashout: true,
                    cashoutValue: rate
                }
            })

            await tx.wallet.update({
                where: {
                    userId: user.userId
                },
                data: {
                    balance: {
                        increment: winAmount
                    }
                }
            })
        });
        const message = JSON.stringify({amount: winAmount.toFixed(2)});
        user.socket.emit("AVIATOR_CASHOUT_SUCCESS", message);
    }
}

export const aviatorManager = AviatorManager.getInstance();