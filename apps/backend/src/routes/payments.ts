
import Razorpay from 'razorpay'
import { Router } from 'express';
import { prisma } from '../lib/client';
import crypto from 'crypto'
import { createPaymentSchema, validatePaymentSchema } from '../zod/paymentValidator';
import { authenticateToken, UserRequest } from '../middleware/verifyUser';
import z from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const razrKey = process.env.RAZR_KEY!
const razrSecret = process.env.RAZR_SECRET!


const razorpayInstance = new Razorpay({
    key_id: razrKey,
    key_secret: razrSecret,
});

const router = Router()


router.post('/create', authenticateToken,  async(req: UserRequest, res) => {
    try {
        const isValidPaymentCreation = createPaymentSchema.safeParse(req.body);
        if (!isValidPaymentCreation.success) {
            return res.status(400).json({ message: isValidPaymentCreation.error.message });
        }
        const authUser = req.user
        if(!authUser){
            return res.status(401).json({message: 'Unauthorized'})
        }
        const {userId} = authUser

        const user = await prisma.user.findUnique({
            where: {
                userId
            },
            select: {
              userId: true
            }
        });
  
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        

        const {amount} = isValidPaymentCreation.data
  
        // Razorpay order options
        const options = {
            amount: Math.round(amount * 100), // Convert to paise and ensure it's an integer
            currency: 'INR',
            receipt: `receipt_order_${new Date().getTime()}`, // Dynamic receipt
            payment_capture: 1, // Auto-capture
        };
  
        const order = await razorpayInstance.orders.create(options);
        await prisma.payments.create({
            data: {
                paymentId: order.id,
                userId,
                amount,
                currency: order.currency,
            },
        });
  
        return res.status(200).json({ message: 'Payment created', orderId: order.id, amount: order.amount });
    } catch (error) {
        console.error("Razorpay Error:", error);
        return res.status(500).json({ message: 'Internal server error' });
    }
  });


  router.post('/updateRazr', async (req, res) => {

    const isValidUpdate = validatePaymentSchema.safeParse(req.body);
    if (!isValidUpdate.success) {
        return res.status(400).json({ message: isValidUpdate.error.message });
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, status } = isValidUpdate.data;
  
    // If status is failed, no need to verify signature, directly update status
    if (status === 'failed') {
      try {
        const updatedTransaction = await prisma.payments.update({
          where: { paymentId: razorpay_order_id },
          data: {
            paymentStatus: "Failed", // Mark transaction as failed
          },
        });
        return res.status(200).json({ message: 'Transaction marked as failed', transaction: updatedTransaction });
      } catch (error) {
        console.error('Error updating transaction:', error);
        return res.status(500).json({ message: 'Error updating transaction', error });
      }
    }
  
    const generatedSignature = crypto.createHmac('sha256', razrSecret).update(razorpay_order_id + '|' + razorpay_payment_id).digest('hex');
    const isValid = crypto.timingSafeEqual(
      Buffer.from(generatedSignature, 'hex'),
      Buffer.from(razorpay_signature, 'hex')
    );
    
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid signature. Payment verification failed' });
    }
  
    try {
      const updatedTransaction = await prisma.$transaction(async(tx) => {
        const transaction = await tx.payments.update({
          where: { paymentId: razorpay_order_id },
          data: {
            paymentStatus: "Success",
          },
        });
        
        const user = await tx.user.findUnique({
          where: { userId: transaction.userId },
          select: {wallet: {select: {walletId: true}}}
        });
        
        if(!user){
          return res.status(400).json({ message: 'User not found' });
        }

        if(!user.wallet){
          return res.status(400).json({ message: 'Wallet not found' });
        }

        await tx.wallet.update({
          where: {
            walletId: user.wallet.walletId
          },
          data: {
            balance: {
              increment: transaction.amount
            }
          }
        })
        return transaction
      })
  
      res.status(200).json({ message: 'Transaction updated successfully', transaction: updatedTransaction });
    } catch (error) {
      console.error('Error updating transaction:', error);
      res.status(500).json({ message: 'Error updating transaction', error });
    }
});

interface Transaction{
  id: string,
  amount: number,
  createdAt: Date,
  updatedAt: Date,
  paymentStatus: "Pending" | "Success" | "Failed",
  type: "Withdraw" | "Deposit"
}

router.get('/fetchallpayments', authenticateToken, async(req: UserRequest, res) => {
  try {
    const authUser = req.user
        if(!authUser){
            return res.status(401).json({message: 'Unauthorized'})
        }
        const {userId} = authUser

        const user = await prisma.user.findUnique({
            where: {
                userId
            },
            select: {
              userId: true,
              payments: {
                select: {
                  paymentId: true,
                  amount: true,
                  createdAt: true,
                  updatedAt: true,
                  paymentStatus: true
                }
              },
              withdrawls: {
                select: {
                  withdrawlId: true,
                  amount: true,
                  createdAt: true,
                  updatedAt: true,
                  paymentStatus: true
                }
              }
            }
        });
  
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const data: Transaction[] = []
        user.payments.forEach((payment) => {
            data.push({
                id: payment.paymentId,
                amount: payment.amount,
                createdAt: payment.createdAt,
                updatedAt: payment.updatedAt,
                paymentStatus: payment.paymentStatus,
                type: "Deposit"
            })
        })

        user.withdrawls.forEach((withdrawl) => {
            data.push({
                id: withdrawl.withdrawlId,
                amount: withdrawl.amount,
                createdAt: withdrawl.createdAt,
                updatedAt: withdrawl.updatedAt,
                paymentStatus: withdrawl.paymentStatus,
                type: "Withdraw"
            })
        })

        const sortedTransactions = data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        return res.status(200).json({data: sortedTransactions})

  } catch (error) {
    return res.status(500).json({message: 'Internal server error'})
  }
})

router.get('/fetchbalance', authenticateToken, async(req: UserRequest, res) => {
  try {
      const authUser = req.user
      if(!authUser){
          return res.status(401).json({message: 'Unauthorized'})
      }
      const {userId} = authUser;
      const user = await prisma.user.findUnique({
          where: {
              userId,
          },
          select: {
             wallet: {
                select: {
                    balance: true,
                    bonus: true
                }
             },
             referralId: true
          }
      });
      if(!user){
          return res.status(400).json({message: 'User not found'})  
      }
      if(!user.wallet){
          return res.status(400).json({message: 'Wallet not found'})
      }
      return res.status(200).json({balance: user.wallet.balance, referralId: user.referralId, bonus: user.wallet.bonus})
  } catch (error) {
      return res.status(500).json({message: "Internal server error"})
  }
})


router.get('/fetchtransactionDetails', authenticateToken, async(req: UserRequest, res) => {
  try {
    const authUser = req.user
      if(!authUser){
          return res.status(401).json({message: 'Unauthorized'})
      }
      const {userId} = authUser;
      const isVlidFetch = z.object({
        orderId: z.string()
      }).safeParse(req.body)
      if(!isVlidFetch.success){
          return res.status(400).json({message: 'Invalid data'})
      }
      const payment = await prisma.payments.findUnique({
        where: {
          paymentId: isVlidFetch.data.orderId
        },
        select: {
          paymentStatus: true,
          userId: true
        }
      });
      if(!payment){
          return res.status(400).json({message: 'Payment not found'})
      }
      if(payment.userId !== userId){
          return res.status(400).json({message: 'Unauthorized'})
      }
      return res.status(200).json({status: payment.paymentStatus})
  } catch (error) {
    return res.status(500).json({message: "Internal server error"})
  }
})

export default router;