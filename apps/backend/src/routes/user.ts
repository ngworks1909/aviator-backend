import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/client';
import { validateUser } from '../zod/userValidator';
import { authenticateToken, UserRequest, verifyAdmin } from '../middleware/verifyUser';
import { sendMessage } from '../lib/messenger';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import bcrypt from 'bcryptjs'

const router = express.Router();

const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // 10 requests per IP
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
});

const verifylimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // 10 requests per IP
    message: 'Too many verification attempts, please try again later',
    standardHeaders: true,
})

const resendlmiter = rateLimit({
    windowMs: 2 * 60 * 1000, // 2 minutes
    max: 3, // 3 requests per IP
    message: 'Too many resend attempts, please try again later',
    standardHeaders: true,
})

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
    return crypto.randomInt(100000, 999999).toString();
  }
router.post('/create', authLimiter, async(req, res) => {
    try {
        const userValidate = validateUser.safeParse(req.body);
        if(!userValidate.success){
            return res.status(400).json({message: 'Invalid credentials'})
        }
        const {name, mobile, referralId, deviceId} = userValidate.data;
        const existingDevice = await prisma.user.findFirst({
            where: {
                deviceId
            }
        });
        if(existingDevice){
            return res.status(400).json({message: 'Device already registered'})
        }
        let user = await prisma.user.findUnique({
            where: {
                mobile
            }
        });
        if(user && user.verified){
            return res.status(400).json({message: 'User already exists'})
        }

        if(referralId){
            const referralIdExists = await prisma.user.findUnique({
                where: {
                    referralId
                }
            })
            if(!referralIdExists){
                return res.status(400).json({message: 'Invalid Referral ID'})
            }
        }
        const otp = generateOtp()
        const otpHash = await bcrypt.hash(otp, 10);
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); 
        await prisma.$transaction(async(tx) => {

            user = await tx.user.upsert({
                where: {
                    mobile
                },
                update: {
                    otp: otpHash,
                    otpExpire: otpExpiresAt,
                    referredBy: referralId
                },
                create: {
                    username: name,
                    mobile,
                    otp: otpHash,
                    otpExpire: otpExpiresAt,
                    referralId: generateReferralId(),
                    referredBy: referralId,
                    deviceId,
                    referralStatus: referralId ? 'Pending' : 'None'
                }
            });
            await tx.wallet.create({
                data: {
                    userId: user.userId
                }
            })
        })
        await sendMessage(mobile, otp)
        
        return res.status(200).json({message: 'OTP generated. Please verify.'})        
    } catch (error) {
        return res.status(500).json({message: 'Internal server error', error})
    }
});

router.post('/login', authLimiter, async(req, res) => {
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
        const otpHash = await bcrypt.hash(otp, 10);
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); 
        user = await prisma.user.update({
            where: {
                mobile
            },
            data: {
                otp: otpHash,
                otpExpire: otpExpiresAt
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

router.post('/verifyotp', verifylimiter, async(req, res) => {
    try {
        const {otp, mobile} = req.body;
        const user = await prisma.user.findUnique({
            where: {
                mobile
            },
            select: {
                otp: true,
                otpExpire: true,
                referredBy: true,
                userId: true,
                mobile: true,
                username: true,
                verified: true
            }
        });
        if(!user){
            return res.status(400).json({message: 'User not found'})
        }

        if (user.otpExpire && user.otpExpire < new Date()) {
            return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
        }
  
        const isOtpValid = await bcrypt.compare(otp, user.otp);
        if (!isOtpValid) {
          return res.status(400).json({ message: 'Invalid OTP' });
        }

        if(!user.verified){
            await prisma.user.update({
                where: {
                    userId: user.userId
                },
                data: {
                    verified: true
                }
            })
        }

        
        const token = jwt.sign( { mobile: user.mobile, userId: user.userId, username: user.username }, 
            process.env.JWT_SECRET!, 
        );
        return res.status(200).json({token, message: 'Login successful'})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error', error})
    }
})

router.put('/resendotp', resendlmiter ,async(req, res) => {
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
        const otp = generateOtp()
        const otpHash = await bcrypt.hash(otp, 10);
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); 
        
        await prisma.user.update({
            where: {
                mobile
            },
            data: {
                otp: otpHash,
                otpExpire: otpExpiresAt
            }
        });

        await sendMessage(mobile, otp)
        return res.status(200).json({message: 'OTP updated'})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
})


router.get('/fetchall', verifyAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.skip as string) || 1; // Default to 1 if not provided
        const pageSize = parseInt(req.query.limit as string) || 10;

        console.log(page, pageSize)

        // Calculate the skip and take values for pagination
        const skip = (page - 1)
        const take = pageSize;

        // Fetch the users from the database
        const users = await prisma.user.findMany({
            skip,
            take,
            select: {
                userId: true,
                username: true,
                mobile: true,
                suspended: true,
                wallet: {
                    select: {
                        balance: true,
                        bonus: true
                    }
                },
                bets: {
                    select: {
                        betId: true,
                        amount: true,
                        cashoutValue: true,
                        room: {
                            select: {
                                maxRate: true,
                                createdAt: true
                            }
                        }
                    }
                }
            }
        });

        // Fetch total count of users to support pagination in frontend
        const totalUsers = await prisma.user.count();

        // Return the response with user data and pagination info
        return res.status(200).json({
            users,
            totalUsers, // Total number of users to calculate total pages on the frontend
            totalPages: Math.ceil(totalUsers / pageSize), // Total pages for pagination
            currentPage: page
        });
    } catch (error) {
        console.error(error); // Log the error for debugging
        return res.status(500).json({ message: 'Internal server error' });
    }
});



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