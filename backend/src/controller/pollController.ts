import { Request, Response, NextFunction } from "express";
import { pollService } from "../service/pollService";

export const createPoll = async (req: Request, res: Response, next: NextFunction) => {
  try {
  const { question, options, roomId, deadline } = req.body;
  const creatorId = req.user.id;
  const poll = await pollService.createPoll(question, options, roomId, creatorId, deadline);
    // Emitir evento socket a la sala correspondiente
    try {
      const { getIo } = require("../socket");
      const io = getIo();
      // Obtener el código de la sala
      const prisma = require("../config/database").default;
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (room) {
        io.to(`room-${room.code}`).emit("newPoll", poll);
      }
    } catch (e) {
      console.error("Error emitiendo newPoll:", e);
    }
    res.status(201).json(poll);
  } catch (err) {
    next(err);
  }
};

export const vote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pollId, optionId } = req.body;
    const userId = req.user.id;
    await pollService.vote(pollId, optionId, userId);
    res.json({ message: "Voto registrado" });
  } catch (err) {
    next(err);
  }
};

export const getPollResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pollId } = req.params;
    const results = await pollService.getPollResults(Number(pollId));
    res.json(results);
  } catch (err) {
    next(err);
  }
};

export const closePoll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pollId } = req.params;
    const userId = req.user.id;
    await pollService.closePoll(Number(pollId), userId);

    // Emitir notificaciones a miembros que no votaron
    try {
      const { getIo } = require("../socket");
      const io = getIo();
      const prisma = require("../config/database").default;
      const poll = await prisma.poll.findUnique({
        where: { id: Number(pollId) },
        include: {
          room: {
            include: {
              members: true
            }
          },
          votes: true
        }
      });
      if (poll) {
        const votedUserIds = poll.votes.map((v: any) => v.userId);
        const nonVoters = poll.room.members.filter((m: any) => !votedUserIds.includes(m.userId));
        for (const member of nonVoters) {
          io.to(`user-${member.userId}`).emit("pollExpired", {
            pollId: poll.id,
            roomCode: poll.room.code,
            message: `La encuesta "${poll.question}" ha sido cerrada por el moderador.`
          });
        }
      }
    } catch (e) {
      console.error("Error emitiendo notificaciones de cierre manual:", e);
    }

    res.json({ message: "Votación cerrada" });
  } catch (err) {
    next(err);
  }
};

export const deletePoll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pollId } = req.params;
    const userId = req.user.id;
    await pollService.deletePoll(Number(pollId), userId);

    // Emitir evento de eliminación a la sala
    try {
      const { getIo } = require("../socket");
      const io = getIo();
      const prisma = require("../config/database").default;
      const poll = await prisma.poll.findUnique({
        where: { id: Number(pollId) },
        include: { room: true }
      });
      if (poll) {
        io.to(`room-${poll.room.code}`).emit("pollDeleted", { pollId: Number(pollId) });
      }
    } catch (e) {
      console.error("Error emitiendo evento de eliminación:", e);
    }

    res.json({ message: "Votación eliminada" });
  } catch (err) {
    next(err);
  }
};
