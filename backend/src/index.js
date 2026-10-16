import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: './.env'
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`⚙️ Server is running at port : ${PORT}`);
});

connectDB()
    .then(() => {
        console.log("MongoDB connection verified");
    })
    .catch((err) => {
        console.warn("MongoDB connection warning:", err.message);
    });
