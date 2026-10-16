import dns from "node:dns";
import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

// Use public DNS resolvers to prevent Windows SRV ETIMEOUT with Atlas clusters
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
    // Ignore if not supported in environment
}

const connectDB = async () => {
    const primaryUri = process.env.MONGODB_URI;

    // 1. Attempt connection to primary URI (Atlas) with a 4-second timeout
    if (primaryUri) {
        try {
            const connectionInstance = await mongoose.connect(primaryUri, {
                dbName: DB_NAME,
                serverSelectionTimeoutMS: 4000,
            });
            console.log(`\nMongoDB Atlas connected !! DB HOST: ${connectionInstance.connection.host}`);
            return;
        } catch (error) {
            console.warn("MongoDB Atlas connection error:", error.message);
            console.log("Falling back to local MongoDB daemon (mongodb://127.0.0.1:27017)...");
        }
    }

    // 2. Seamless Local Fallback (local MongoDB service on 127.0.0.1:27017)
    try {
        const localInstance = await mongoose.connect('mongodb://127.0.0.1:27017', {
            dbName: DB_NAME,
            serverSelectionTimeoutMS: 3000,
        });
        console.log(`\nLocal MongoDB connected seamlessly !! DB HOST: ${localInstance.connection.host}`);
    } catch (localErr) {
        console.error("Local MongoDB fallback also unavailable:", localErr.message);
        // Retry connection in background without terminating process
        setTimeout(connectDB, 8000);
    }
};

export default connectDB;
