import prisma from "../config/database";
import { httpError } from "../middleware/errorHanddler";

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const roomService = {
  async createRoom(name: string, description: string, creatorId: number) {
    const code = generateRoomCode();
    const room = await prisma.room.create({
      data: {
        name,
        description,
        code,
        creatorId,
        members: {
          create: {
            userId: creatorId
          }
        }
      },
      include: {
        creator: {
          select: { id: true, username: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true }
            }
          }
        }
      }
    });
    return room;
  },

  async getRoomByCode(code: string) {
    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        creator: {
          select: { id: true, username: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true }
            }
          }
        },
        polls: {
          include: {
            options: {
              include: {
                votes: {
                  select: { userId: true }
                }
              }
            }
          }
        }
      }
    });
    if (!room) {
      throw httpError(404, "Sala no encontrada");
    }
    // Format polls to match frontend expectations
    const formattedPolls = room.polls.map(poll => ({
      ...poll,
      options: poll.options.map(opt => ({
        ...opt,
        votes: opt.votes.map(v => v.userId.toString())
      }))
    }));

    // Format members to match frontend expectations
    const formattedMembers = room.members.map(member => ({
      id: member.user.id,
      username: member.user.username
    }));

    // Return creatorId so frontend can check if user is owner
    return {
      ...room,
      polls: formattedPolls,
      creatorId: room.creatorId,
      messages: [], // Initialize empty messages array
      members: formattedMembers
    };
  },

  async getActiveRooms() {
    return prisma.room.findMany({
      where: { isActive: true },
      include: {
        creator: {
          select: { id: true, username: true }
        },
        _count: {
          select: { polls: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  async getUserRooms(userId: number) {
    const rooms = await prisma.room.findMany({
      where: {
        isActive: true,
        members: {
          some: {
            userId: userId
          }
        }
      },
      include: {
        creator: {
          select: { id: true, username: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true }
            }
          }
        },
        _count: {
          select: { polls: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Add createdBy field for frontend compatibility and format members
    return rooms.map(room => ({
      ...room,
      createdBy: room.creatorId,
      members: room.members.map(member => ({
        id: member.user.id,
        username: member.user.username
      }))
    }));
  },

  async closeRoom(roomId: number, userId: number) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw httpError(404, "Sala no encontrada");
    if (room.creatorId !== userId) throw httpError(403, "No tienes permiso");

    return prisma.room.update({
      where: { id: roomId },
      data: { isActive: false }
    });
  },



  async joinRoom(code: string, userId: number) {
    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        creator: {
          select: { id: true, username: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true }
            }
          }
        },
        polls: {
          include: {
            options: {
              include: {
                votes: {
                  select: { userId: true }
                }
              }
            }
          }
        }
      }
    });

    if (!room) {
      throw httpError(404, "Sala no encontrada");
    }

    if (!room.isActive) {
      throw httpError(400, "La sala ya no está activa");
    }

    // Check if user is already a member
    const isAlreadyMember = room.members.some(member => member.userId === userId);

    if (!isAlreadyMember) {
      // Add user as member
      await prisma.roomMember.create({
        data: {
          userId: userId,
          roomId: room.id
        }
      });
    }

    // Format polls to match frontend expectations
    const formattedPolls = room.polls.map(poll => ({
      ...poll,
      options: poll.options.map(opt => ({
        ...opt,
        votes: opt.votes.map(v => v.userId.toString())
      }))
    }));

    // Format members to match frontend expectations
    const formattedMembers = room.members.map(member => ({
      id: member.user.id,
      username: member.user.username
    }));

    return {
      ...room,
      polls: formattedPolls,
      creatorId: room.creatorId,
      messages: [],
      members: formattedMembers
    };
  },

  async leaveRoom(code: string, userId: number) {
    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        creator: {
          select: { id: true, username: true }
        }
      }
    });

    if (!room) {
      throw httpError(404, "Sala no encontrada");
    }

    if (room.creatorId === userId) {
      throw httpError(400, "El creador no puede salir de la sala. Usa 'Cerrar sala' en su lugar");
    }

    // Remove user from room members
    await prisma.roomMember.deleteMany({
      where: {
        roomId: room.id,
        userId: userId
      }
    });
  },



  async kickMember(roomCode: string, userIdToKick: number, requesterId: number) {
    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        creator: true,
        members: true
      }
    });

    if (!room) throw httpError(404, "Sala no encontrada");
    if (room.creatorId !== requesterId) throw httpError(403, "Solo el creador puede expulsar miembros");
    if (userIdToKick === requesterId) throw httpError(400, "No puedes expulsarte a ti mismo");

    // Verificar que el usuario a expulsar es miembro
    const isMember = room.members.some(member => member.userId === userIdToKick);
    if (!isMember) throw httpError(400, "El usuario no es miembro de la sala");

    // Remover de roomMember
    await prisma.roomMember.deleteMany({
      where: {
        roomId: room.id,
        userId: userIdToKick
      }
    });
  },

  async updateRoomByCode(code: string, name: string, description: string, userId: number) {
    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) throw httpError(404, "Sala no encontrada");
    if (room.creatorId !== userId) throw httpError(403, "No tienes permiso");
    const updatedRoom = await prisma.room.update({
      where: { code },
      data: { name, description }
    });
    return updatedRoom;
  }
};
