import { Router } from "express";
import { synthesizeSpeech } from "../controllers/tts.controller.js";

const router = Router();

router.post("/synthesize", synthesizeSpeech);

export default router;