import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from 'express';
import connectDB from "./config/database.js";
import type { HttpError } from "http-errors";
import authRouter from "./routes/authProfile.js";

const app = express();
app.use(express.json());

const PORT: string | undefined = process.env.PORT;

app.use("/", authRouter);



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
