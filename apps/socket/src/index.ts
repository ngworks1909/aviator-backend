import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import { extractJwtToken } from './lib/auth'
import {userManager} from './managers/users/UserManager'
import cors from 'cors'

import dotenv from 'dotenv'
import { prisma } from './lib/client'

dotenv.config();

const app = express();

app.use(cors({
  origin: '*', // Replace with frontend URL for production (e.g., 'https://yourapp.com')
  methods: ['GET', 'POST'],
  credentials: true
}));


app.get('/', async(_, res) => {
    try {
        const user = userManager.getUserCount();
        const revenue = await prisma.bet.aggregate({
            where: {
                cashout: false
            },
            _sum: {
                amount: true
            }
        });

        const payout = await prisma.withdrawals.aggregate({
            where: {
                paymentStatus: "Success"
            },
            _sum: {
                amount: true
            }
        });

        const payment = await prisma.payments.aggregate({
            where: {
                paymentStatus: "Success"
            },
            _sum: {
                amount: true
            }
        })

        return res.status(200).json({
            user,
            deposited: revenue._sum.amount || 0,
            payout: payout._sum.amount || 0,
            secured: payment._sum.amount || 0
        })

    } catch (error) {
        return res.status(500).json({message: "Internal server error"})
    }
});


const server = http.createServer(app);

export const io = new Server(server, {
    cors: {
        origin: "*", // Allow any origin (adjust as needed for production)
        methods: ["GET", "POST"], // Allow only specific HTTP methods
        
    }
})
app.get("/",async(_,res)=>{
    const onlineUserSize = userManager.getUserCount();
    if(onlineUserSize > 10000) return onlineUserSize
        const randomValue = Math.floor(Math.random() * (150000 - 100000 + 1)) + 100000;
    return res.status(200).json({count: randomValue});
})

io.on('connection', (socket) => {
    socket.send('Connected to socket server')
    socket.on('ADD_USER', (data) => {
        const token = data;
        if(!token){
            const message = 'Token not found'
            socket.emit('DISCONNECT_USER', message)
            return
        }
        const user = extractJwtToken(token, socket)
        if(!user){
            const message = 'Invalid Token'
            socket.emit('DISCONNECT_USER', message)
            return
        }
        console.log("User connected and added");
        userManager.addUser(user);
    })
    
    socket.on('disconnect', (reason) => {
        console.log(reason);
        userManager.removeUser(socket.id)
    });
})

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
    console.log(`Websocket server is running on port ${PORT}`)
})