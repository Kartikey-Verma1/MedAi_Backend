import express, { type Request, type Response, type NextFunction } from 'express';
import connectDB from "./config/database.js";
import type { HttpError } from "http-errors";
import authRouter from "./routes/authRoute.js";
import userRouter from './routes/userRoute.js';
import cookieParser from "cookie-parser";

import "dotenv/config";
import { generalLimiter } from './middlewares/limiter.middleware.js';
import documentRouter from './routes/documentRoute.js';

const app = express();
app.use(express.json());
app.use(cookieParser());

const PORT: string | undefined = process.env.PORT;

app.use("/", generalLimiter);
app.use("/", authRouter);
app.use("/", userRouter);
app.use("/", documentRouter);



app.use("/", (err: HttpError, req: Request, res: Response, next: NextFunction)=>{
    console.error(err);
    res.status(err.statusCode || 500).json({
        message: "Something went wrong!"
    });
});

connectDB()
.then(()=>{
    app.listen(PORT, ()=>{
        console.log("Server is running of port:", PORT);
    });
})
.catch((err: unknown)=>{
    console.error("Error in starting server:", err);
})
