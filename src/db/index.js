import mongoose from "mongoose";

const connectDB =async()=>{
    try{
        const connectionInstance= await mongoose.connect(`${process.env.MONGO_URI}`);
        console.log(`MONGODB CONNECTED: ${connectionInstance.connection.host}`);
    }catch(error){
        console.error("MONGODB CONNECTION ERROR: ",error);
        process.exit(1);
    }
}

export default connectDB;