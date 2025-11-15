import prisma from "../config/database";

export const chatService = {
  async saveMessage(userId: number, content: string, roomId?: number) {
    // Detectar menciones en el contenido
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      if (match[1]) {
        mentions.push(match[1]); // username sin @
      }
    }

    // Crear el mensaje
    const msg = await prisma.message.create({
      data: {
        userId,
        content,
        roomId: roomId || null
      },
      include: { user: { select: { username: true } } },
    });

    // Procesar menciones si hay alguna
    if (mentions.length > 0 && roomId) {
      // Obtener usuarios conectados en la sala (todos los usuarios que han enviado mensajes en la sala)
      const roomUsers = await prisma.message.findMany({
        where: { roomId },
        include: { user: { select: { id: true, username: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100 // Últimos 100 mensajes para encontrar usuarios activos
      });

      if (roomUsers.length > 0) {
        // Extraer usernames únicos de mensajes recientes
        const activeUsernames = [...new Set(roomUsers.map(m => m.user.username))];

        // Crear menciones para usuarios válidos
        for (const username of mentions) {
          if (activeUsernames.includes(username)) {
            const mentionedUser = await prisma.user.findUnique({
              where: { username: username },
              select: { id: true }
            });

            if (mentionedUser) {
              await prisma.mention.create({
                data: {
                  messageId: msg.id,
                  userId: mentionedUser.id,
                  username: username
                }
              });
            }
          }
        }
      }
    }

    return {
      id: msg.id,
      content: msg.content,
      username: msg.user.username,
      createdAt: msg.createdAt,
      mentions: mentions // Incluir menciones en la respuesta
    };
  },

  async getRecentMessages(limit = 20, roomId?: number) {
    const msgs = await prisma.message.findMany({
      where: roomId ? { roomId } : { roomId: null },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { username: true } },
        mentions: {
          include: { user: { select: { username: true } } }
        }
      },
    });
    return msgs.reverse().map((m) => ({
      id: m.id,
      content: m.content,
      username: m.user.username,
      createdAt: m.createdAt,
      mentions: m.mentions.map(mention => mention.username)
    }));
  },

  async getUserMentions(userId: number, limit = 10) {
    const mentions = await prisma.mention.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        message: {
          include: {
            user: { select: { username: true } },
            room: { select: { id: true, name: true, code: true } }
          }
        }
      }
    });

    return mentions.map(mention => ({
      id: mention.id,
      messageId: mention.messageId,
      content: mention.message.content,
      fromUser: mention.message.user.username,
      room: mention.message.room,
      createdAt: mention.createdAt
    }));
  },
};
