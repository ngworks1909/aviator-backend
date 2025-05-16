import { Router } from "express";
import { createAdminSchema, loginAdminSchema } from "../zod/adminValidator";
import { prisma } from "../lib/client";
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { verifyAdmin } from "../middleware/verifyUser";


const router = Router();


router.post('/create', verifyAdmin, async(req, res) => {
    try {
        const isValidCreate = createAdminSchema.safeParse(req.body);
        if(!isValidCreate.success){
            return res.status(400).json({message: isValidCreate.error.message})
        }

        const {name, email, password, role} = isValidCreate.data;

        const isAdminAlreadyExists = await prisma.admin.findUnique({
            where: {
                email
            },
            select: {adminId: true}
        });
        if(isAdminAlreadyExists){
            return res.status(400).json({message: "Admin already exists"});
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt)
        await prisma.admin.create({
            data: {
                adminName: name,
                email: email,
                password: hashedPassword,
                role: role ?? "admin"
            }
        });
        return res.status(200).json({message: "Admin created successfully"})
    } catch (error) {
        return res.status(500).json({message: "Internal server error"})
    }
});


router.post('/login', async(req, res) => {
    try {
        const isValidLogin = loginAdminSchema.safeParse(req.body);
        if(!isValidLogin.success){
            return res.status(400).json({message: "Invalid credentials"})
        }
        const {email, password} = isValidLogin.data;
        const admin = await prisma.admin.findUnique({
            where: {
                email
            },
            select: {
                password: true,
                adminName: true,
                adminId: true, 
                role: true
            }
        });
        if(!admin){
            return res.status(400).json({message: "Admin not found"})
        }

        const isMatched = await bcrypt.compare(password, admin.password);
        if(!isMatched){
            return res.status(400).json({message: "Invalid email or password"})
        }

        const token = jwt.sign( { adminId: admin.adminId, role: admin.role, username: admin.adminName }, 
            process.env.JWT_SECRET!, 
            {expiresIn: "8h"}
        );

        return res.status(200).json({token})

    } catch (error) {
        return res.status(500).json({message: "Internal server error"})
    }
});


router.get('/admins', verifyAdmin, async(_, res) => {
    try {
        const admins = await prisma.admin.findMany();
        res.status(200).json({admins})
    } catch (error) {
        res.status(500).json({message: "Internal server error"})
    }
})


export default router