import dotenv from "dotenv";
import connectDB from "./db/index.js";
dotenv.config({
    path: "./env"
});
connectDB();








/*
import express from "express"
const app=express()

;(async () => {
    try{
        await mongoose.connect(`${process.env.MONGO_URI}`)
        app.on("error",(err)=>{
            console.error("ERROR: ",err)
            throw err
        })
        app.listen(process.env.PORT,()=>{
            console.log(`Server started at http://localhost:${process.env.PORT}`)
        })
    }
    catch(err){
        console.error("ERROR: ",err)
        throw err
    }
})()
*/