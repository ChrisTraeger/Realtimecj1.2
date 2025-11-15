import { Request, Response, NextFunction } from "express";
import { chatService } from "../service/chatService";
import prisma from "../config/database";
import { getIo } from "../socket";

export const getMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const msgs = await chatService.getRecentMessages();
    res.json(msgs);
  } catch (err) {
    next(err);
  }
};

export const getRoomMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roomId = Number(req.params.roomId);
    if (Number.isNaN(roomId)) return res.status(400).json({ message: "roomId inválido" });
    const msgs = await chatService.getRecentMessages(50, roomId);
    res.json(msgs);
  } catch (err) {
    next(err);
  }
};

export const postMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content, roomId } = req.body;
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: 'usuario no autenticado' });
    if (!content || typeof content !== 'string') return res.status(400).json({ message: 'content es requerido' });

    const msg = await chatService.saveMessage(userId, content, roomId ? Number(roomId) : undefined);

    // Emitir el mensaje a la sala por sockets si existe (fallback HTTP -> realtime)
    try {
      if (roomId) {
        const room = await prisma.room.findUnique({ where: { id: Number(roomId) }, select: { code: true, name: true } });
        if (room && room.code) {
          const io = getIo();
          io.to(`room-${room.code}`).emit("newRoomMessage", msg);

          // Enviar notificaciones de menciones a usuarios mencionados
          if (msg.mentions && msg.mentions.length > 0) {
            for (const username of msg.mentions) {
              // Encontrar el socket del usuario mencionado
              const sockets = io.sockets.sockets;
              for (const [socketId, socket] of sockets) {
                if (socket.data.user && socket.data.user.username === username) {
                  socket.emit("mentionNotification", {
                    messageId: msg.id,
                    content: msg.content,
                    fromUser: msg.username,
                    roomCode: room.code,
                    roomName: room.name || 'Sala'
                  });
                  break; // Solo enviar a un socket por usuario
                }
              }
            }
          }
        }
      } else {
        // Mensaje público
        const io = getIo();
        io.emit("newPublicMessage", msg);
      }
    } catch (emitErr) {
      // no bloquear por errores de emisión
      console.warn("No se pudo emitir el mensaje por socket:", emitErr);
    }

    res.status(201).json(msg);
  } catch (err) {
    next(err);
  }
};

export const getUserMentions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: 'usuario no autenticado' });

    const mentions = await chatService.getUserMentions(userId);
    res.json(mentions);
  } catch (err) {
    next(err);
  }
};
