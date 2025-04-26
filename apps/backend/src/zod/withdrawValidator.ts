import {z} from 'zod';

export const createWithdrawSchema = z.object({
    amount: z.number().min(1000, {message: "Minimum withdraw amount is 1000"}),
    withdrawType: z.enum(["Bank", "UPI", "Crypto"], {message: "Invalid withdraw method"}),
    username: z.string({message: "Invalid username"}),
    accountNumber: z.string().optional(),
    ifsc: z.string().optional(),
    upi: z.string().optional(),
    cryptoId: z.string().optional()
});
