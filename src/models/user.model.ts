import mongoose, { Model } from "mongoose";
import bcrypt from 'bcrypt';
import createHttpError from "http-errors";

interface IUser {
    name: string,
    email: string,
    password: string,
    otpHash?: string,
    otpExpiry?: Date,
    otpSentAt?: Date,
    isVerified: boolean
}

interface IUserMethods {
    comparePassword(password: string): Promise<boolean>;
}

type userModel = Model<IUser, {}, IUserMethods>;

const userSchema = new mongoose.Schema<IUser, userModel, IUserMethods>({
    name: {
        type: String,
        required: true,
        minLength: [2, "Name must have minimum 2 characters."],
        maxLength: [20, "Name can have maximum 20 characters."],
        trim: true,
        set: (value: string) => value.replace(/\s+/g, " ")
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        unique: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email address."],
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    otpHash: {
        type: String,
        select: false
    },
    otpExpiry: {
        type: Date
    },
    otpSentAt: {
        type: Date,
        default: null
    },
    isVerified: {
        type: Boolean,
        required: true,
        default: false
    }
},{
    timestamps: true,
});

userSchema.pre("save", async function (): Promise<void>{
    try{
        if(this.isModified("password")){
            this.password = await bcrypt.hash(this.password, 10);
        }
    } catch (err) {
        throw createHttpError(500, "Error in generating password hash");
    }
});

userSchema.methods.comparePassword = async function (password: string): Promise<boolean>{
    try{
        return await bcrypt.compare(password, this.password);
    } catch (err) {
        throw createHttpError(500, "Error in comparing password");
    }
}

const User = mongoose.model<IUser, userModel>("User", userSchema);

export default User;