import z from 'zod'

export const validateUser = z.object({
    name: z.string().min(4, {message: "Invalid username"}),
    mobile: z.string().refine((value) => {
        return /^[6-9][0-9]{9}$/.test(value);
      }, {message: "Invalid mobile number"}),
    deviceId: z.string().optional(),
    referralId: z.string().optional()
})

export const validateUpdate = z.object({
    name: z.string().min(4, {message: "Invalid username"}),
})