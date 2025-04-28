import express from 'express'
import { prisma } from '../lib/client';
import z from 'zod'
import { verifyAdmin } from '../middleware/verifyUser';

const router = express.Router();


router.post('/upload', verifyAdmin, async(req, res) => {
   try {
    const bannerValidate = z.object({
        imageUrl: z.string(),
        redirectUrl: z.string()
    }).safeParse(req.body);
    if(!bannerValidate.success){
      return res.status(400).json({message: bannerValidate.error?.errors[0]?.message});
    }
    const {imageUrl: url, redirectUrl} = bannerValidate.data
    const banner = await prisma.banner.create({
      data: {
        imageUrl: url,
        redirectUrl
      }
    });
    return res.status(200).json({message: 'Banner created successfully', banner})
   } catch (error) {
    return res.status(500).json({message: 'Internal server error', error})
   }
})

router.get('/fetchallbanners', async(_, res) => {
  try {
    const banners = await prisma.banner.findMany({
      select: {
        bannerId: true,
        imageUrl: true,
        redirectUrl: true
      }
    });
    return res.status(200).json({banners})
  } catch (error) {
    return res.status(500).json({message: 'Internal server error'})
  }
})




router.delete('/deletebanner/:bannerId',verifyAdmin, async(req, res) => {
    try {
      const bannerId = req.params.bannerId
    if(!bannerId){
      return res.status(400).json({message: 'Invalid banner'})
    }
    const banner = await prisma.banner.findUnique({
      where: {
        bannerId
      }
    })
    if(!banner){
      return res.status(400).json({message: 'Banner not found'})
    }
    await prisma.banner.delete({
      where: {
        bannerId
      }
    })
    return res.status(200).json({ message: 'Banner deleted successfully.', url: banner.imageUrl })
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' })
    }
});


export default router