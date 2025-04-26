import express from 'express'
import { validateResolve, validateTicket } from '../zod/ticketValidator';
import { prisma } from '../lib/client';

const router = express.Router();



async function solveTicket(ticketId: string){
    await prisma.ticket.update({
        where: {
            ticketId
        },
        data: {
            status: "Closed"
        }
    })

}



router.post('/create', async (req, res) => {
    try {
        const ticketValidation = validateTicket.safeParse(req.body);
        if(!ticketValidation.success) return res.status(400).json({message: 'Invalid data'})
        const { email, name, issue, description, image } = ticketValidation.data;
        const ticket = await prisma.ticket.create({
            data: {
                email,
                name,
                issue,
                description,
                image
            },
            select: {
                ticketId: true
            }
        })
        return res.status(200).json({message: 'Ticket created successfully', ticketId: ticket.ticketId})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
});

router.get('/tickets', async(req, res) => {
    try {
        const tickets = await prisma.ticket.findMany()
        return res.status(200).json({tickets})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
})

router.post('/resolve', async (req, res) => {
    try {
        const resolveValidation = validateResolve.safeParse(req.body);
        if(!resolveValidation.success) return res.status(400).json({message: 'Invalid data'})
        const { input, textarea, solved, ticketId } = resolveValidation.data;
        var mailOptions = {
            from: 'support@v1games.com',
            to: input,
            subject: 'You have reached out to V1 games support',
            text: textarea + `${solved === "Closed" ? " Your issue has been resolved. Please feel free to contact us if you encounter any further concerns.": ""}`
        };
        try {
            if(solved === "Closed"){
                const ticket = await prisma.ticket.findUnique({
                    where:{
                        ticketId
                    }
                });
                if(!ticket) return res.status(404).json({message: 'Ticket not found'});
                await solveTicket(ticketId);
            }
            return res.status(200).json({message: 'Email sent successfully'})
        } catch (error) {
            return res.status(500).json({message: 'Failed sending response'})
        }
    } catch (error) {
       return res.status(500).json({message: 'Internal server error'}) 
    }
})

router.put('/ticketSolved/:ticketId', async(req, res) => {
    try {
        const ticketId = req.params.ticketId
        if(!ticketId) return res.status(400).json({message: 'Invalid ticket'});
        const ticket = await prisma.ticket.findUnique({
            where:{
                ticketId
            }
        });
        if(!ticket) return res.status(404).json({message: 'Ticket not found'});
        if(ticket.status === "Closed") return res.status(400).json({message: 'Ticket is already closed'});
        await prisma.ticket.update({
            where: {
                ticketId
            },
            data: {
                status: "Closed"
            }
        });
        return res.status(200).json({message: 'Ticket solved successfully'})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
});

export default router