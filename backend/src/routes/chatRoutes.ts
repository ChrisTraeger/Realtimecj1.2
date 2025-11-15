import { Router } from "express";
import verifyToken from "../middleware/jwt/verifyToken";
import { getMessages, getRoomMessages, postMessage, getUserMentions } from "../controller/chatController";

const router = Router();

// Ruta para obtener mensajes públicos recientes
router.get("/", verifyToken, getMessages);

// Obtener mensajes de una sala específica
router.get("/room/:roomId", verifyToken, getRoomMessages);

// Obtener menciones del usuario
router.get("/mentions", verifyToken, getUserMentions);

// Enviar mensaje (guarda en DB). Preferimos sockets para realtime, pero mantenemos endpoint HTTP
router.post("/", verifyToken, postMessage);

export default router;
