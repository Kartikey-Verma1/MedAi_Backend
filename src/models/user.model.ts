import mongoose, { Model } from "mongoose";
import bcrypt from 'bcrypt';

interface IUser {
    name: string,
    email: string,
    password: string,
    otpHash?: string,
    otpExpiry?: Date,
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
    isVerified: {
        type: Boolean,
        required: true,
        default: false
    }
},{
    timestamps: true,
});

userSchema.pre("save", async function (): Promise<void>{
    if(this.isModified("password")){
        this.password = await bcrypt.hash(this.password, 10);
    }
});

userSchema.methods.comparePassword = async function (password: string): Promise<boolean>{
   return await bcrypt.compare(password, this.password);
}

const User = mongoose.model<IUser, userModel>("user", userSchema);

export default User;