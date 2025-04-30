import { Router } from "express";
import { verifyAdmin } from "../middleware/verifyUser";
import { prisma } from "../lib/client";
import z from 'zod'


const router = Router()

router.get('/count', verifyAdmin, async(_, res) => {
    try {
        const visitors = await prisma.visitors.count()
        return res.status(200).json({visitors})

    } catch (error) {
        return res.status(500).json({message: "Internal server error"})
    }
})

router.post('/create', async(req, res) => {
    try {
        const isValidCreate = z.object({
            visitorId: z.string(),
        }).safeParse(req.body);
        if(!isValidCreate.success){
            return res.status(400).json({message: isValidCreate.error.message})
        }
        const {visitorId} = isValidCreate.data;

        const visitorAlreadyExists = await prisma.visitors.findUnique({
            where: {
                visitorId
            },
            select: {visitorId: true}
        });
        if (visitorAlreadyExists){
            return res.status(400).json({message: "Visitor already exists"});
        }
        await prisma.visitors.create({
            data: {
                visitorId
            }
        });
        return res.status(200).json({message: "Added visitor"})
    } catch (error) {
        return res.status(500).json({message: "Internal server error"})
    }
})