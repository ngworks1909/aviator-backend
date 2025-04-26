import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { User } from '../managers/users/User';
import dotenv from 'dotenv'

dotenv.config();
export interface userJwtClaims {
    userId: string,
    username: string
}

export const extractJwtToken = (token: string, socket: Socket): User | null => {
    try {
    
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret") as userJwtClaims;
        if(!decoded.userId) return null
        return new User(decoded.userId, socket, decoded.username)
    } catch (error) {
        return null
    }
    
}