import type { Request } from "express";
import createError from "http-errors";

export const validateInputData = (req: Request)=>{
    const {name, email, password} = req.body;

    if(name.length < 2 || name.length > 20){
        throw createError(422, "Name length should be between 2 to 20 characters!");
    }
    
    const emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRegex.test(email)){
        throw createError(422, "Enter valid email!");
    }

    if(password.length < 5){
        throw createError(422, "Password too samll");
    }

    if(password.length > 20){
        throw createError(422, "Password length must be less than 20");
    }
}