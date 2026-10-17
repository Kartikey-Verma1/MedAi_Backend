import 'dotenv/config';
import mongoose from "mongoose";

const connectDB = async function (): Promise<void> {
    const DB_URI: string | undefined = process.env.DB_URI;
    if(!DB_URI){
        throw new Error("Database URI not found!");
    }
    await mongoose.connect(DB_URI);
    console.log("Database connected successfully!")
}

export default connectDB;