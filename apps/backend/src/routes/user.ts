import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/client';
import { validateUser } from '../zod/userValidator';
import { authenticateToken, UserRequest, verifyAdmin } from '../middleware/verifyUser';
import { sendMessage } from '../lib/messenger';

const router = express.Router();

function generateReferralId() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
  
    // Pick 3 random letters
    const randomLetters = Array.from({ length: 3 }, () =>
      letters.charAt(Math.floor(Math.random() * letters.length))
    );
  
    // Pick 3 random digits
    const randomDigits = Array.from({ length: 3 }, () =>
      digits.charAt(Math.floor(Math.random() * digits.length))
    );
  
    // Pick 2 random from both
    const allChars = letters + digits;
    const randomOthers = Array.from({ length: 2 }, () =>
      allChars.charAt(Math.floor(Math.random() * allChars.length))
    );
  
    // Combine and shuffle
    const combined = [...randomLetters, ...randomDigits, ...randomOthers];
    return combined.sort(() => 0.5 - Math.random()).join('');
}

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
}
router.post('/create', async(req, res) => {
    try {
        const userValidate = validateUser.safeParse(req.body);
        if(!userValidate.success){
            return res.status(400).json({message: 'Invalid credentials'})
        }
        const {name, mobile, referralId} = userValidate.data;
        let user = await prisma.user.findUnique({
            where: {
                mobile
            }
        });
        if(user){
            return res.status(400).json({message: 'User already exists'})
        }
        const otp = generateOtp()
        await prisma.$transaction(async(tx) => {
            user = await tx.user.create({
                data: {
                    username: name,
                    mobile,
                    otp,
                    referralId: generateReferralId()
                }
            });
            await tx.wallet.create({
                data: {
                    userId: user.userId
                }
            })

            if(referralId){
                const referredUser = await tx.user.findUnique({
                    where: {
                        referralId
                    }
                });
                if(referredUser){
                    await tx.user.update({
                        where: {
                            userId: referredUser.userId
                        },
                        data: {
                            wallet: {
                                update: {
                                    balance: {
                                        increment: 100
                                    }
                                }
                            }
                        }
                    })
                }
            }
        })

        await sendMessage(mobile, otp)
        
        return res.status(200).json({message: 'OTP generated. Please verify.'})        
    } catch (error) {
        return res.status(500).json({message: 'Internal server error', error})
    }
});

router.post('/login', async(req, res) => {
    try {
        const {mobile} = req.body;
        let user = await prisma.user.findUnique({
            where: {
                mobile
            }
        });
        if(!user){
            return res.status(400).json({message: 'Mobile number not registered'})
        }
        if(user.suspended){
            return res.status(403).json({message: "User suspended"})
        }
        const otp = generateOtp()
        user = await prisma.user.update({
            where: {
                mobile
            },
            data: {
                otp
            }
        });

        await sendMessage(mobile, otp)
        

        return res.status(200).json({message: "OTP sent"})
    } catch (error) {
        return res.status(500).json({message: 'Some error occured', error})
    }
})


router.post('/update', authenticateToken ,async(req: UserRequest, res) => {
    try {
        const authUser = req.user
        if(!authUser){
            return res.status(401).json({message: 'Unauthorized'})
        }
        const {userId} = authUser
        const userValidate = validateUser.safeParse(req.body);
        if(!userValidate.success){
            return res.status(400).json({message: 'Invalid credentials'})
        }

        const {username} = req.body;
        

        let user = await prisma.user.findUnique({
            where: {
                userId
            }
        })
        if(!user){
            return res.status(400).json({message: 'User not found'})
        }
        const previousName = user.username
        user = await prisma.user.update({
            where: {
                userId
            },
            data: {
                username: username || previousName
            }
        });
        return res.status(200).json({message: 'User updated successfully', user})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
});

router.post('/verifyotp', async(req, res) => {
    try {
        const {otp, mobile} = req.body;
        const user = await prisma.user.findUnique({
            where: {
                mobile
            }
        });
        if(!user){
            return res.status(400).json({message: 'User not found'})
        }
        if(otp !== user.otp){
            return res.status(400).json({message: 'Incorrect OTP'})
        }
        const token = jwt.sign( { mobile: user.mobile, userId: user.userId, username: user.username }, 
            process.env.JWT_SECRET || "secret", 
        );
        return res.status(200).json({token, message: 'Login successful'})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error', error})
    }
})

router.put('/resendotp', async(req, res) => {
    try {
        const {mobile} = req.body
        const user = await prisma.user.findUnique({
            where: {
                mobile
            }
        });
        if(!user){
            return res.status(400).json({message: 'User not found'})
        }
        const otp = generateOtp();
        await prisma.user.update({
            where: {
                mobile
            },
            data: {
                otp
            }
        });

        await sendMessage(mobile, otp)
        return res.status(200).json({message: 'OTP updated'})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
})


router.get('/fetchall', verifyAdmin, async(_, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                userId: true,
                username: true,
                mobile: true,
                suspended: true,
                wallet: {
                    select: {
                        balance: true
                    }
                },
                bets: {
                    select: {
                        betId: true,
                        amount: true,
                        cashoutValue: true,
                        room: {
                            select: {
                                maxRate: true
                            }
                        }
                    }
                }
            }
        });
        return res.status(200).json({users})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
})

router.put('/suspend/:userId', verifyAdmin, async(req, res) => {
    try {
        const userId = req.params.userId;
        if(!userId){
            return res.status(400).json({message: 'Invalid user'})
        }
        await prisma.user.update({
            where: {
                userId
            },
            data: {
                suspended: true
            }
        });
        return res.status(200).json({message: 'User suspended successfully'})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
})


export default router;