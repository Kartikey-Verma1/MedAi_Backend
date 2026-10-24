import express from 'express'
import verifyAccessToken from '../middlewares/verifyAccessToken.middleware.js';
import createHttpError from 'http-errors';
import User from '../models/user.model.js';
import verifyUser from '../middlewares/verifyUser.middleware.js';
import { otpcooldown, otpGeneration, otpVerification } from '../utils/otp.js';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import Session from '../models/session.model.js';

const userRouter = express.Router();

userRouter.get("/routes/userRoute/my-info", 
    verifyAccessToken, 
    verifyUser, 
    async (req, res) : Promise<void> => {
    try{
        const user = req.user;
        if(!user) throw createHttpError(404, "user not found");
        res.json({
            message: "user fetched successfully",
            user: {
                name: user.name,
                email: user.email
            }
        });
    } catch (err: unknown) {
        if(createHttpError.isHttpError(err) &&  'statusCode' in err){
            const error = err;
            res.status(error.statusCode).json({
                message: error.message,
                data: error.data
            });
        } else {
            res.status(500).json({
                message: "Internal Server Error"
            });
        }
    }
});

userRouter.patch("/routes/userRoute/edit-name", 
    verifyAccessToken, 
    verifyUser,
    async (req, res) : Promise<void> => {
    try{
        const user = req.user;
        const {name} = req.body;
        if(!user || !name){
            throw createHttpError(404, "Name input not found");
        }
        if(typeof(name) != "string" || name.length < 2 || name.length > 20){
            throw createHttpError(422, "Number of character allowed is 2 to 20");
        }

        await User.findOneAndUpdate(
            {_id: user?._id},
            {name: name}
        )

        res.json({
            message: "name updated successfully",
            user: {
                name,
                email: user?.email
            }
        });
    } catch (err: unknown) {
        if(createHttpError.isHttpError(err) &&  'statusCode' in err){
            const error = err;
            res.status(error.statusCode).json({
                message: error.message,
                data: error.data
            });
        } else {
            res.status(500).json({
                message: "Internal Server Error"
            });
        }
    }
});

userRouter.post("/routes/userRoute/forget-password", async(req, res) : Promise<void> => {
    try{
        const { email } = req.body;
        const emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if(!email || typeof(email) != "string" || !emailRegex.test(email)){
            throw createHttpError(422, "Enter valid email");
        }

        const user = await User
            .findOne({email})
            .select("+otpHash +otpExpiry +otpSentAt");
        
        if(!user){
            throw createHttpError(404, "User account not found!");
        }
        if(user.otpSentAt){
            const {isExpired, timeleft} = otpcooldown(user.otpSentAt);
            if(!isExpired){
                throw createHttpError(429, `Too many attempts, try again after ${timeleft}s`);
            }
        }

        const {otp, otpHash, otpExpiry} = otpGeneration();
        user.otpHash = otpHash;
        user.otpExpiry = otpExpiry;
        user.otpSentAt = new Date(Date.now());
        
        await user.save();

        res.json({
            message: "OTP sent to your email",
            otp,
        });

    } catch (err: unknown) {
        if(createHttpError.isHttpError(err) &&  'statusCode' in err){
            const error = err;
            res.status(error.statusCode).json({
                message: error.message,
                data: error.data
            });
        } else {
            res.status(500).json({
                message: "Internal Server Error"
            });
        }
    }
});

userRouter.post("/routes/userRoute/reset-verification", async(req, res) : Promise<void> => {
    try{
        const {email, otp} = req.body;
        const emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!email || typeof(email) != "string" || !emailRegex.test(email) || !otp || typeof(otp) != "string"){
            throw createHttpError(404, "Missing field");
        }

        const user = await User
            .findOne({email})
            .select("+otpHash +otpExpiry");

        if(!user){
            throw createHttpError(404, "User not found!");
        }
        if(!user?.otpHash || !user?.otpExpiry){
            throw createHttpError(400, "Invalid verification request");
        }

        const { valid, message } = otpVerification({
            storedOtp: user?.otpHash,
            otpExpiry: user?.otpExpiry,
            submittedOtp: otp
        });

        if(!valid){
            throw createHttpError(422, message);
        }

        const resetToken = randomBytes(32).toString('hex');
        const resetTokenHash = createHash('sha256')
            .update(resetToken)
            .digest("hex");
        const resetTokenExpiry = new Date(Date.now() + 1000*60*5);
        
        await User.findOneAndUpdate(
            {email},
            {
                $set: {
                    resetTokenHash,
                    resetTokenExpiry
                },
                $unset: {
                    otpHash: 1,
                    otpExpiry: 1,
                    otpSentAt: 1
                }
            }
        )
        
        res
        .cookie("resetToken", resetToken, {
            httpOnly: true,
            sameSite: "lax",
            path: "/routes/userRoute/reset-password",
            maxAge: 1000*60*5
        })
        .json({
            message: "otp verified successfully"
        });
    } catch (err: unknown) {
        if(createHttpError.isHttpError(err) &&  'statusCode' in err){
            const error = err;
            res.status(error.statusCode).json({
                message: error.message,
                data: error.data
            });
        } else {
            res.status(500).json({
                message: "Internal Server Error"
            });
        }
    }
});

userRouter.patch("/routes/userRoute/reset-password", async(req, res) : Promise<void> => {
    try{
        const { resetToken } = req.cookies;
        const { email, password } = req.body;
        
        if(!resetToken){
            throw createHttpError(400, "Verify email first!");
        }
        const emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!email || typeof(email) != "string" || !emailRegex.test(email) || !password){
            throw createHttpError(404, "Missing field");
        }
        
        const user = await User.findOne({email}).select("+resetTokenHash +resetTokenExpiry");
        
        if(!user){
            throw createHttpError(404, "Account not found!");
        }
        if(!user.resetTokenHash || !user.resetTokenExpiry || user.resetTokenExpiry < new Date(Date.now())){
            throw createHttpError(400, "Email verification expired!");
        }
        
        const submittedTokenHash = createHash("sha256").update(resetToken).digest("hex");
        const submittedBuffer = Buffer.from(submittedTokenHash, "hex");
        const storedBuffer = Buffer.from(user.resetTokenHash, "hex");
        
        if(submittedBuffer.length != storedBuffer.length || !timingSafeEqual(submittedBuffer, storedBuffer)){
            throw createHttpError(400, "reset token is invalid!");
        }
        
        if(typeof(password) != "string" || password.length < 5 || password.length > 20){
            throw createHttpError(422, "Number of characters should be between 5 to 20");
        }
        
        user.password = password;
        user.resetTokenHash = null;
        user.resetTokenExpiry = null;
        await user.save();
        
        const session = new Session({
            userId: user._id,
            refreshTokenHash: "pending",
            expiresAt: new Date(Date.now() + 1000*60*60*24*7)
        })
        
        const accessToken = session.generateAccessToken();
        const refreshToken = session.generateRefreshToken();
        const refreshTokenHash = createHash("sha256")
        .update(refreshToken)
        .digest("hex");
        
        session.refreshTokenHash = refreshTokenHash;
        await session.save();
        res
        .cookie("refreshToken", refreshToken, {
            httpOnly: true,
            sameSite: 'lax',
            path: "/routes/authProfile/refresh",
            maxAge: 1000*60*60*24*7
        })
        .cookie("accessToken", accessToken, {
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 1000*60*15
        })
        .clearCookie("resetToken", {
            httpOnly: true,
            sameSite: "lax",
            path: "/routes/userRoute/reset-password",
            maxAge: 0
        })
        .json({
            message: "User login successfull!"
        });
    } catch (err: unknown) {
        if(createHttpError.isHttpError(err) &&  'statusCode' in err){
            const error = err;
            res.status(error.statusCode).json({
                message: error.message,
                data: error.data
            });
        } else {
            res.status(500).json({
                message: "Internal Server Error"
            });
        }
    }
});

userRouter.delete("/routes/userRoute/deleteprofile", 
    verifyAccessToken, 
    verifyUser,
    async(req, res) : Promise<void> => {
    try{
        const user = req.user;
        if(!user){
            throw createHttpError(404, "Account not found!");
        }
        
        const { _id } = user;
        await User.findOneAndDelete({_id});
        await Session.deleteMany({userId: _id});
        
        res
        .clearCookie("refreshToken", {
            httpOnly: true,
            sameSite: "lax",
            maxAge: 0
        })
        .clearCookie("accessToken", {
            httpOnly: true,
            sameSite: "lax",
            maxAge: 0
        }).json({
            message: "Account deleted successfully"
        });
    } catch (err: unknown) {
        if(createHttpError.isHttpError(err) &&  'statusCode' in err){
            const error = err;
            res.status(error.statusCode).json({
                message: error.message,
                data: error.data
            });
        } else {
            res.status(500).json({
                message: "Internal Server Error"
            });
        }
    }
});

export default userRouter;