import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import userRouter from './routes/user'
import paymentRouter from './routes/payments'
import withdrawRouter from './routes/withdrawls'
import adminRouter from './routes/admin'

dotenv.config()



const app = express()
app.use(cors())

app.use(express.json());



app.use('/api/user',userRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/withdrawls', withdrawRouter);
app.use('/api/admin', adminRouter)

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});