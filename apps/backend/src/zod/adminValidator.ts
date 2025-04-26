import z from 'zod'

export const createAdminSchema = z.object({
    name: z.string().min(4).max(20, {message: "Invalid admin name"}),
    email: z.string().email({message: "Invalid email"}),
    password: z.string().min(6, {message: "Invalid password"}),
    role: z.enum(["admin", "superadmin"], {message: "Invalid role"}).optional()
})

export const loginAdminSchema = z.object({
    email: z.string().email({message: "Invalid email"}),
    password: z.string().min(6, {message: "Invalid password"}),
})
