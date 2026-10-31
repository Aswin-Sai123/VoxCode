import http from 'http';
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import { mountInterviewSocket } from "./ws/interviewSocket.js";

dotenv.config({
    path: './.env'
});

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const wss = mountInterviewSocket(server);

server.listen(PORT, () => {
    console.log(`⚙️ Server is running at port : ${PORT}`);
    console.log(`🔌 Real-time interview WebSocket mounted at /ws/interview`);
});

connectDB()
    .then(() => {
        console.log("MongoDB connection verified");
    })
    .catch((err) => {
        console.warn("MongoDB connection warning:", err.message);
    });

export { server, wss };
