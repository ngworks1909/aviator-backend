import { z } from "zod";

export const createPaymentSchema = z.object({
    amount: z.number().min(50, {message: "Enter amount greater than 50"}),
})