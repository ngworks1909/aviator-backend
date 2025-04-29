import { Router } from "express";
import { prisma } from "../lib/client";
import { verifyAdmin } from "../middleware/verifyUser";

const router = Router();

router.get('/version', async(_, res) => {
    const version = await prisma.version.findFirst() as {version: string}
    return res.status(200).json({version: version.version})
})


router.put('/version', verifyAdmin, async(req, res) => {
    try {
        const {version} = req.body;
        const previousVersion = await prisma.version.findFirst() as {version: string}
        await prisma.version.update({
            where: {
                version: previousVersion.version
            },
            data: {
                version
            }
        })
        return res.status(200).json({message: 'Version updated'})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
})