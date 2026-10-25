import rateLimit from "express-rate-limit";

export const generalLimiter = rateLimit({
    windowMs: 1000*60,
    limit: 60,
    standardHeaders: "draft-8",
    legacyHeaders: false,

    skip: (req)=> req.path.endsWith("/status"),
    
    message: {
        message: "Too many attempts, please try again later."
    }
});

export const authLimiter = rateLimit({
    windowMs: 1000*60,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message: "Too many attempts, please try again later."
    }
});

export const otpLimiter = rateLimit({
    windowMs: 1000*60,
    limit: 6,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message: "Too many attempts, please try again later."
    }
})

export const statusLimiter = rateLimit({
    windowMs: 1000,
    limit: 2,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message: "Too many attempts, please try again later."
    }
});