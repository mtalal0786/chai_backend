import dotenv from 'dotenv';
import connectDB from './db/index.js';
import { app } from './app.js';

dotenv.config(
    {
        path: '.env'
    }
);

connectDB() // Connect to the database
    .then(() => {
        app.on("error", (error) => {
            console.error("Server Error:", error);
            throw error;
        });
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running on port ${process.env.PORT || 8000}`);
        });
    })
    .catch((error) => {
        console.error("Conection MONGODB Error:", error);
    });