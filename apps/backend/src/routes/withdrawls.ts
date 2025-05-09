import { Router } from "express";
import { authenticateToken, UserRequest, verifyAdmin } from "../middleware/verifyUser";
import { prisma } from "../lib/client";
import { createWithdrawSchema } from "../zod/withdrawValidator";
import { z } from "zod";

const router = Router();

router.post('/create', authenticateToken, async(req: UserRequest, res) => {
    try {
        const authUser = req.user
        if(!authUser){
            return res.status(401).json({message: 'Unauthorized'})
        }
        const {userId} = authUser;
        await prisma.$transaction(async(tx) => {
            const user = await tx.user.findUnique({
                where: {
                    userId
                },
                select: {
                   userId: true,
                   wallet: {
                      select: {
                        balance: true
                      }
                   }
                }
            });
      
            if (!user) {
                return res.status(400).json({ message: 'User not found' });
            }

            if(!user.wallet){
                return res.status(400).json({ message: 'Wallet not found' });
            }

            
            const isValidWithdraw = createWithdrawSchema.safeParse(req.body);
            if(!isValidWithdraw.success){
                return res.status(400).json({message: isValidWithdraw.error.message})
            }
            const {withdrawType, amount, username} = isValidWithdraw.data;
            
            if(user.wallet.balance < amount){
                return res.status(400).json({message: "Insufficient funds"})
            }
    
            if(withdrawType === "Bank"){
                const {accountNumber, ifsc} = isValidWithdraw.data;
                if(!accountNumber || !ifsc ){
                    return res.status(400).json({message: "Enter account number and ifsc"})
                }
                await tx.withdrawals.create({
                    data: {
                        userId,
                        username,
                        amount,
                        withdrawType,
                        accountNumber,
                        ifsc
                    }
                });
                
            }
    
            else if(withdrawType === "UPI"){
                const {upi} = isValidWithdraw.data;
                if(!upi){
                    return res.status(400).json({message: "Enter UPI"})
                }
                await tx.withdrawals.create({
                    data: {
                        userId,
                        username,
                        amount,
                        withdrawType,
                        upi
                    }
                });
            }
            else{
                const {cryptoId} = isValidWithdraw.data;
                if(!cryptoId){
                    return res.status(400).json({message: "Enter crypto id"})
                }
                await tx.withdrawals.create({
                    data: {
                        userId,
                        username,
                        amount,
                        withdrawType,
                        cryptoId
                    }
                });
            }

            await tx.wallet.update({
                where: {
                    userId
                },
                data: {
                    balance: {
                        decrement: amount
                    }
                }
            })
        })
        return res.status(200).json({message: "Withdrawal created successfully"})
    } catch (error) {
        return res.status(500).json({message: "Internal server error"})
    }
})

router.get('/fetchall', verifyAdmin, async(_, res) => {
    try {
        const withdrawals = await prisma.withdrawals.findMany({
            where: {
                paymentStatus: "Pending"
            },
            select: {
                withdrawlId: true,
                paymentStatus: true,
                amount: true,
                accountNumber: true,
                ifsc: true,
                upi: true,
                cryptoId: true,
                createdAt: true,
                user: {
                    select: {
                        userId: true,
                        username: true
                    }
                }
            }
        });
        return res.status(200).json({withdrawals})
    } catch (error) {
        return res.status(500).json({message: "Internal server error"})
    }
});

router.put('/update/:withdrawId', verifyAdmin, async(req, res) => {
    try {
        const withdrawlId = req.params.withdrawId;
        if(!withdrawlId){
            return res.status(400).json({message: "Withdraw id not found"})
        }
        const isValidUpdate = z.object({status: z.enum(["Success", "Failed"])}).safeParse(req.body);
        if(!isValidUpdate.success){
            return res.status(400).json({message: "Invalid data"})
        }
        const {status} = isValidUpdate.data
        
        const withdraw = await prisma.withdrawals.findUnique({
            where: {
                withdrawlId
            },
            select: {
                withdrawlId: true
            }
        })
        if(!withdraw){
            return res.status(400).json({message: "Withdraw not found"});
        }
        await prisma.withdrawals.update({
            where: {
                withdrawlId
            },
            data: {
                paymentStatus: status
            }
        });
        return res.status(200).json({message: 'Withdraw successful'})
    } catch (error) {
        return res.status(500).json({message: "Internal server error"})
    }
});

export default router