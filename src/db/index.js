import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

const connetDB = async() => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${ DB_NAME }`)
        console.log(`MongoDB Connected: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error("Error Connecting to MongoDB:", error);
        process.exit(1);
    }
}

export default connetDB;