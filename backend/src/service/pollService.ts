import prisma from "../config/database";
import { httpError } from "../middleware/errorHanddler";
import * as cron from "node-cron";

export const pollService = {
  // Scheduler para cerrar encuestas expiradas
  initScheduler() {
    console.log("Inicializando scheduler de encuestas...");
    // Ejecutar cada 10 segundos para verificar deadlines
    cron.schedule('*/10 * * * * *', async () => {
      console.log("Ejecutando scheduler de encuestas...");
      try {
        const now = new Date();
        const expiredPolls = await prisma.poll.findMany({
          where: {
            isOpen: true,
            deadline: {
              not: null,
              lte: now
            }
          },
          include: {
            room: {
              include: {
                members: true
              }
            },
            votes: true
          }
        });

        console.log(`Encontradas ${expiredPolls.length} encuestas expiradas`);

        for (const poll of expiredPolls) {
          console.log(`Cerrando encuesta expirada: ${poll.id} - ${poll.question}`);
          await prisma.poll.update({
            where: { id: poll.id },
            data: { isOpen: false, closedAt: now }
          });

          try {
            const { getIo } = require("../socket");
            const io = getIo();
            io.to(`room-${poll.room.code}`).emit("pollClosed", { pollId: poll.id, autoClosed: true });

            for (const member of poll.room.members) {
              io.to(`user-${member.userId}`).emit("pollExpired", {
                pollId: poll.id,
                roomCode: poll.room.code,
                message: `La votación "${poll.question}" ha expirado y se cerró automáticamente.`
              });
            }
            
            console.log(`Notificaciones de cierre enviadas a ${poll.room.members.length} miembros`);
          } catch (e) {
            console.error("Error emitiendo eventos de cierre automático:", e);
          }
        }

        // Verificar encuestas que expiran en 5 minutos
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
        const expiringSoonPolls = await prisma.poll.findMany({
          where: {
            isOpen: true,
            deadline: {
              not: null,
              lte: fiveMinutesFromNow,
              gt: now
            }
          },
          include: {
            room: {
              include: {
                members: true
              }
            },
            votes: true
          }
        });

        console.log(`Encontradas ${expiringSoonPolls.length} encuestas que expiran pronto`);

        for (const poll of expiringSoonPolls) {
          try {
            const { getIo } = require("../socket");
            const io = getIo();
            
            const votedUserIds = poll.votes.map(v => v.userId);
            
            for (const member of poll.room.members) {
              const hasVoted = votedUserIds.includes(member.userId);
              const message = hasVoted 
                ? `La votación "${poll.question}" expira en menos de 5 minutos.`
                : `La votación "${poll.question}" expira en menos de 5 minutos. ¡Vota ahora!`;
              
              io.to(`user-${member.userId}`).emit("pollExpiringSoon", {
                pollId: poll.id,
                roomCode: poll.room.code,
                deadline: poll.deadline,
                message: message
              });
            }
            
            console.log(`Notificaciones de expiración próxima enviadas a ${poll.room.members.length} miembros`);
          } catch (e) {
            console.error("Error emitiendo notificación de expiración próxima:", e);
          }
        }
      } catch (error) {
        console.error("Error en scheduler de encuestas:", error);
      }
    });
  },

  async vote(pollId: number, optionId: number, userId: number) {
    // Verificar si la votación está abierta y no ha expirado
    const poll = await prisma.poll.findUnique({ where: { id: pollId } });
    if (!poll) throw httpError(404, "Votación no encontrada");
    if (!poll.isOpen || (poll.deadline && new Date() > poll.deadline)) {
      throw httpError(403, "La votación está cerrada o ha expirado");
    }
    // Verificar si el usuario ya votó
    const existingVote = await prisma.vote.findUnique({
      where: { userId_pollId: { userId, pollId } }
    });
    if (existingVote) {
      // Permitir cambiar el voto
      return prisma.vote.update({
        where: { id: existingVote.id },
        data: { optionId }
      });
    }
    // Registrar nuevo voto
    return prisma.vote.create({
      data: { userId, pollId, optionId }
    });
  },
  async createPoll(question: string, options: string[], roomId: number, creatorId: number, deadline?: string) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw httpError(404, "Sala no encontrada");
    if (room.creatorId !== creatorId) throw httpError(403, "Solo el moderador puede crear votaciones");

    let pollDeadline: Date | null = null;
    if (deadline) {
      const d = new Date(deadline);
      pollDeadline = isNaN(d.getTime()) ? null : d;
    }
    const poll = await prisma.poll.create({
      data: {
        question,
        options: {
          create: options.map((option) => ({ text: option })),
        },
        roomId,
        deadline: pollDeadline,
      },
      include: {
        options: {
          include: {
            votes: {
              select: { userId: true }
            }
          }
        },
      },
    });
    // Map votes to array of userIds
    const formattedPoll = {
      ...poll,
      options: poll.options.map(opt => ({
        ...opt,
        votes: opt.votes.map(v => v.userId.toString())
      }))
    };
    return formattedPoll;
  },

  async getPollResults(pollId: number) {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          include: {
            votes: {
              select: { userId: true }
            },
            _count: {
              select: { votes: true }
            }
          }
        },
        _count: {
          select: { votes: true }
        }
      }
    });

    if (!poll) throw httpError(404, "Votación no encontrada");
    // Cerrar automáticamente si deadline expiró
    if (poll.deadline && new Date() > poll.deadline && poll.isOpen) {
      await prisma.poll.update({ where: { id: pollId }, data: { isOpen: false, closedAt: new Date() } });
      poll.isOpen = false;
    }

    return {
      id: poll.id,
      question: poll.question,
      isOpen: poll.isOpen,
      totalVotes: poll._count.votes,
      options: poll.options.map(opt => ({
        id: opt.id,
        text: opt.text,
        votes: opt.votes.map(v => v.userId.toString())
      }))
    };
  },

  async closePoll(pollId: number, userId: number) {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { room: true }
    });
    if (!poll) throw httpError(404, "Votación no encontrada");
    if (poll.room.creatorId !== userId) throw httpError(403, "Solo el moderador puede cerrar la votación");

    return prisma.poll.update({
      where: { id: pollId },
      data: { isOpen: false, closedAt: new Date() }
    });
  },

  async deletePoll(pollId: number, userId: number) {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { room: true }
    });
    if (!poll) throw httpError(404, "Votación no encontrada");
    if (poll.room.creatorId !== userId) throw httpError(403, "Solo el moderador puede eliminar la votación");

    return prisma.poll.delete({
      where: { id: pollId }
    });
  }
};