import express from 'express';
import { validateInputData } from '../utils/validation.util.js';
import User from '../models/user.model.js';
import { otpcooldown, otpGeneration, otpVerification } from '../utils/otp.util.js';
import createHttpError from 'http-errors';
import { isValidObjectId } from 'mongoose';
import Session from '../models/session.model.js';
import { createHash } from 'node:crypto';
import verifyAccessToken from '../middlewares/verifyAccessToken.middleware.js';
import verifyRefreshToken from '../middlewares/verifyRefreshToken.middleware.js';
import { authLimiter, otpLimiter } from '../middlewares/limiter.middleware.js';

const authRouter = express.Router();

interface ISignInRequestBody{
    name: string,
    email: string,
    password: string
}

interface IOtpverifyBody{
    email: string,
    otp: string
}

authRouter.use(authLimiter);

authRouter.post("/routes/authRoute/signup", otpLimiter, async(req, res) : Promise<void> => {
    try{
        const body = req.body as ISignInRequestBody;
        const {name, email, password} = body;
        validateInputData(req);
        const sameUser = await User.findOne({email}).select("+otpHash +otpExpiry +otpSentAt");

        if(sameUser){
            if(sameUser.isVerified) throw createHttpError(409, "User already exists!");
            else {
                const {otpSentAt} = sameUser;
                if(otpSentAt){
                    const otpCooldown = otpcooldown(otpSentAt);
                    if(!otpCooldown.isExpired){
                        throw createHttpError(429, `Too many attempts, try again after ${otpCooldown.timeleft}s`);
                    }
                }
                const {otp, otpHash, otpExpiry} = otpGeneration();
                sameUser.name = name;
                sameUser.otpHash = otpHash;
                sameUser.otpExpiry = otpExpiry;
                sameUser.otpSentAt = new Date(Date.now());
                await sameUser.save();
                res.json({
                    otp,
                    message: "OTP sent successfully, valid only for 5 minutes.",
                    user: {_id: sameUser._id, name, email}
                });
            }

        } else {
            const {otp, otpHash, otpExpiry} = otpGeneration();
            const newUser = new User({
                name,
                email,
                password,
                otpHash,
                otpExpiry,
                otpSentAt: new Date(Date.now())
            });
            await newUser.save();

            res.json({
                otp,
                message: "OTP sent successfully, valid only for 5 minutes.",
                user: {_id: newUser._id, name, email}
            });
        }

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

authRouter.post("/routes/authRoute/signup/otpverification", otpLimiter, async(req, res) : Promise<void> =>{
    try{
        //otp validation
        const body = req.body as IOtpverifyBody;
        const {email, otp} = body;

        const emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!email || typeof(email) != "string" || !emailRegex.test(email)){
            throw createHttpError(422, "Enter valid email!");
        }

        const user = await User
            .findOne({email})
            .select(["otpHash", "otpExpiry", "otpSentAt"]);

        if(!user){
            throw createHttpError(400, "Signup first!");
        }
        if(!user.otpHash || !user.otpExpiry){
            throw createHttpError(400, "Invalid OTP verification Request!");
        }

        const verifyotp = otpVerification({
            submittedOtp: otp, 
            storedOtp: user.otpHash, 
            otpExpiry: user.otpExpiry});

        if(!verifyotp.valid){
            throw createHttpError(422, verifyotp.message);
        }

        await User.findOneAndUpdate(
            {
                _id: user._id,
                isVerified: false,
            },
            {
                $set: {isVerified: true},
                $unset: {otpHash: 1, otpExpiry: 1, otpSentAt: 1}
            }
        );

        // login after otp verified
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
            path: "/routes/authRoute/refresh",
            maxAge: 1000*60*60*24*7
        })
        .cookie("accessToken", accessToken, {
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 1000*60*15
        })
        .json({
            message: "User signup successfull!"
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

authRouter.post("/routes/authRoute/refresh/login", verifyRefreshToken, async(req, res) : Promise<void> => {
    try{
        let session = req.session;
        const flag = session;
        const {email, password} = req.body;
        
        if(typeof(email) != "string"){
            throw createHttpError(422, "Enter valid email!");
        } 
        
        const emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const emailNormalized = email.trim().toLowerCase();
        if(!emailRegex.test(emailNormalized)){
            throw createHttpError(422, "Enter valid email!");
        }
        if(typeof(password) != "string" || password.length < 5 || password.length > 20){
            throw createHttpError(422, "Invalid email or password");
        }
        
        const user = await User.findOne({email}).select("+password");
        
        if(!user || !user.isVerified){
            throw createHttpError(422, "Invalid email or password");
        }
        
        if(!session || !flag){
            const isValid = await user.comparePassword(password);
            
            if(!isValid){
                throw createHttpError(422, "Invalid email or password");
            }
    
            session = new Session({
                userId: user._id,
                refreshTokenHash: "pending",
                expiresAt: new Date(Date.now() + 1000*60*60*24*7)
            });
        }

        const accessToken = session.generateAccessToken();
        const refreshToken = session.generateRefreshToken();
        const refreshTokenHash = createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        if(!flag){
            session.refreshTokenHash = refreshTokenHash;
            await session.save();
        }else {

            const updatedSession = await Session.findOneAndUpdate(
                {
                    _id: session._id,
                    userId: session.userId,
                    refreshTokenHash: session.refreshTokenHash,
                    revokedAt: null,
                    expiresAt: { $gt: new Date() }
                },
                {
                    refreshTokenHash: refreshTokenHash
                },
                { returnDocument: "after" }
            )

            if(!updatedSession) throw createHttpError(500, "Error in setting token");
        }

        res
        .cookie("refreshToken", refreshToken, {
            httpOnly: true,
            sameSite: 'lax',
            path: "/routes/authRoute/refresh",
            maxAge: 1000*60*60*24*7
        })
        .cookie("accessToken", accessToken, {
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 1000*60*15
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

authRouter.post("/routes/authRoute/logout", verifyAccessToken, async(req, res) : Promise<void> => {
    const userId = req.session?.userId;
    if(!userId || !isValidObjectId(userId)) throw createHttpError(400, "Invalid Id!");
    const updatedSession = await Session.findOneAndUpdate(
        { 
            _id: req.session?._id,
            userId: userId,
        },
        {
            $set: {
                expiresAt: new Date(Date.now()),
                revokedAt: new Date(Date.now())
            }
        },
        { returnDocument: "after" }
    );

    if(!updatedSession) throw createHttpError(500, "Error in setting token");

    res
    .clearCookie("refreshToken",{
        httpOnly: true,
        sameSite: 'lax',
        path: "/routes/authRoute/refresh",
        maxAge: 0
    })
    .clearCookie("accessToken",{
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 0
    })
    .json({
        message: "User logout successfull!"
    });
});

authRouter.post("/routes/authRoute/refresh/token",verifyRefreshToken, async(req, res) : Promise<void> => {
    try{
        const session = req.session;
        
        if(!session){
            throw createHttpError(401, "Session Expired");
        }
        if(!session?.userId || !isValidObjectId(session.userId)){
            throw createHttpError(400, "Invalid Token");
        }
        
        const user = await User.findById({_id: session.userId});
        if(!user){
            throw createHttpError(400, "Invalid Token");
        }
        
        const accessToken = session.generateAccessToken();
        const refreshToken = session.generateRefreshToken();
        const refreshTokenHash = createHash('sha256')
            .update(refreshToken)
            .digest("hex");

        const updatedSession = await Session.findOneAndUpdate(
            {
                _id: session._id,
                userId: session.userId,
                refreshTokenHash: session.refreshTokenHash,
                revokedAt: null,
                expiresAt: {$gt: new Date()}
            },
            {
                $set:{
                    refreshTokenHash: refreshTokenHash
                }
            },
            { returnDocument: "after" }
        );

        if(!updatedSession) throw createHttpError(500, "Error in setting token")
        
        res
        .cookie("refreshToken", refreshToken, {
            httpOnly: true,
            sameSite: 'lax',
            path: "/routes/authRoute/refresh",
            maxAge: 1000*60*60*24*7
        })
        .cookie("accessToken", accessToken, {
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 1000*60*15
        })
        .json({
            message: "Token generated successfully!"
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

export default authRouter;