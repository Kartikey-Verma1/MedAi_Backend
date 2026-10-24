import { createHmac, randomInt, timingSafeEqual } from "node:crypto"
import createHttpError from "http-errors";

interface Iotpgenreturn{
    otp: string,
    otpHash: string,
    otpExpiry: Date
}
interface Iotpverparameter{
    submittedOtp: string,
    storedOtp: string,
    otpExpiry: Date
}

const secret_key = process.env.OTP_SECRET_KEY;
if(!secret_key) throw createHttpError(500, "Error in loading environment for otp");

export const otpGeneration = (): Iotpgenreturn=>{

    const otp = randomInt(100000, 1000000).toString();
    const otpExpiry = new Date(Date.now() + (1000*60*5));
    const otpHash = createHmac('sha256', secret_key)
        .update(`${otp}.${otpExpiry.toDateString()}`)
        .digest('hex');
        
    return {otp, otpHash, otpExpiry};
}


export const otpVerification = (options: Iotpverparameter): {valid: boolean, message: string} => {

    const {submittedOtp, storedOtp, otpExpiry} = options
    const currentTime = new Date(Date.now());
    if(currentTime > otpExpiry){
        return {
            valid: false,
            message: "OTP Expired!"
        }
    }
    const submittedHash = createHmac('sha256', secret_key)
        .update(`${submittedOtp}.${otpExpiry.toDateString()}`)
        .digest('hex');

    const submittedBuffer = Buffer.from(submittedHash, 'hex');
    const storedBuffer = Buffer.from(storedOtp, 'hex');

    if(submittedBuffer.length === storedBuffer.length && timingSafeEqual(submittedBuffer, storedBuffer)){
        return {
            valid: true,
            message: "OTP Verified successfully!"
        }
    } else {
        return {
            valid: false,
            message: "OTP is invalid!"
        }
    }

}


export const otpcooldown = (otpSentAt: Date) : {isExpired: boolean, timeleft: number} => {
    const elapsed = Date.now() - otpSentAt.getTime();
    if(elapsed > 1000*30){
        return {
            isExpired: true,
            timeleft: 0
        }
    }
    return {
        isExpired: false,
        timeleft: Math.ceil((1000*30 - elapsed) / 1000)
    }
}