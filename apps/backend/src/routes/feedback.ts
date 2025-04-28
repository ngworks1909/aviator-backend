import { Router } from "express";
import z from 'zod'
import { prisma } from "../lib/client";

const router = Router()

router.post('/create', async(req, res) => {
    try {
        const feedBackValidation = z.object({
            message: z.string()
        }).safeParse(req.body)

        if(!feedBackValidation.success){
            return res.status(400).json({message: "Invalid data"})
        }

        const {message} = feedBackValidation.data
        await prisma.feedback.create({
            data: {
                text: message
            }
        })
        return res.status(200).json({message: "Thank you for you feedback"})
    } catch (error) {
        return res.status(500).json({message: "Internal server error"})
    }
})


router.get('/fetchall', async(_, res) => {
    try {
        const feedbacks = await prisma.feedback.findMany({
            take: 100
        });
        return res.status(200).json({feedbacks})
    } catch (error) {
        return res.status(500).json({message: "Internal server error"})
    }
})

export default router