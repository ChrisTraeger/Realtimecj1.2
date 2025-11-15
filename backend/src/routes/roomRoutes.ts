import { Router } from "express";
import verifyToken from "../middleware/jwt/verifyToken";
import { createRoom, getRoomByCode, getActiveRooms, getUserRooms, closeRoom, joinRoom, leaveRoom, kickMember, updateRoomByCode } from "../controller/roomController";

const router = Router();

router.use(verifyToken);

router.post("/", createRoom);
router.get("/", getUserRooms); // Cambiado para devolver solo salas del usuario
router.get("/all", getActiveRooms); // Nuevo endpoint para todas las salas activas (si es necesario)
router.get("/:code", getRoomByCode);
router.post("/:code/join", joinRoom); // Nuevo endpoint para unirse a sala
router.delete("/:code/leave", leaveRoom); // Nuevo endpoint para salir de sala
router.delete("/:code/kick/:userId", kickMember); // Nuevo endpoint para expulsar miembro
router.put("/:code", updateRoomByCode);
router.delete("/:id", closeRoom);

export default router;