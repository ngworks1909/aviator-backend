import { aviatorManager } from "../aviator/AviatorManager";
import { User } from "./User";
import z from 'zod'

class UserManager {
    private static instance: UserManager
    private readonly onlineUsers: Map<string, User>
    constructor(){
        this.onlineUsers = new Map()
    }
    static getInstance(){
        if(UserManager.instance){
            return UserManager.instance;
        }
        UserManager.instance = new UserManager();
        return UserManager.instance;
    }

    addUser(user: User) {
        this.addAviatorListener(user);
        this.onlineUsers.set(user.socket.id, user);
    }

    removeUser(socketId: string) {
        this.onlineUsers.delete(socketId)
    }

    getUserCount(){
        return this.onlineUsers.size
    }

    private addAviatorListener(user: User) {
        aviatorManager.addPlayer(user);
        user.socket.on("ADD_AVIATOR_BID", (data) => {
            console.log(data);
            const amount = parseInt(data);
            const isValidAddition = z.number().safeParse(amount);
            console.log("Valid add bid: " + isValidAddition.success)
            if(!isValidAddition.success) return;
            console.log("Adding bid");
            aviatorManager.addBid(user, amount)
        })

        user.socket.on("AVIATOR_CASHOUT", () => {
            aviatorManager.cashOutBid(user);
        })
    }

}


export const userManager = UserManager.getInstance();