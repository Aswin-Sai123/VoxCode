import { Router } from "express";
import { getVoiceModels, synthesizeSpeech } from "../controllers/tts.controller.js";

const router = Router();

router.get("/models", getVoiceModels);
router.post("/synthesize", synthesizeSpeech);

export default router;
