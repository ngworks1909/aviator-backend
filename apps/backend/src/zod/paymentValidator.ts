import { z } from "zod";

export const createPaymentSchema = z.object({
    amount: z.number().min(10, {message: "Enter amount greater than 10"}),
})

export const validatePaymentSchema = z.object({
    razorpay_payment_id: z.string(),
    razorpay_order_id: z.string(),
    razorpay_signature: z.string(),
    status: z.enum(['success', 'failed'])
})