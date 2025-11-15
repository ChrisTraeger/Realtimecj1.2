// src/socket.ts

import { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

/**
 * Establece la instancia de Socket.IO para que pueda ser usada en otros módulos
 */
export const setIo = (socketServer: SocketIOServer): void => {
  io = socketServer;
  console.log('✅ Socket.IO instancia establecida');
  
  // Configurar manejadores de eventos de videollamada
  setupVideoCallHandlers(socketServer);
};

/**
 * Configura los manejadores de eventos para videollamadas WebRTC
 */
const setupVideoCallHandlers = (io: SocketIOServer): void => {
  io.on('connection', (socket) => {
    console.log('👤 Usuario conectado:', socket.id);

    // Cuando un usuario se une a una sala de videollamada
    socket.on('join-video-room', (roomId: string) => {
      socket.join(roomId);
      console.log(`📹 Usuario ${socket.id} se unió a la videollamada ${roomId}`);

      // Obtener todos los usuarios en la sala (excepto el que acaba de entrar)
      const roomSockets = io.sockets.adapter.rooms.get(roomId);
      const existingUsers = roomSockets 
        ? Array.from(roomSockets).filter(id => id !== socket.id)
        : [];

      // Enviar al nuevo usuario la lista de usuarios ya conectados
      socket.emit('existing-users', existingUsers);

      // Notificar a todos los demás en la sala que un nuevo usuario se unió
      socket.to(roomId).emit('webrtc-user-joined', socket.id);

      console.log(`📊 Usuarios en sala ${roomId}:`, existingUsers.length + 1);
    });

    // Manejar las ofertas WebRTC
    socket.on('webrtc-offer', (payload: { targetPeerId: string; offer: any }) => {
      const { targetPeerId, offer } = payload;
      io.to(targetPeerId).emit('webrtc-offer', {
        offer,
        offererPeerId: socket.id
      });
      console.log(`🔄 Oferta WebRTC de ${socket.id} a ${targetPeerId}`);
    });

    // Manejar las respuestas WebRTC
    socket.on('webrtc-answer', (payload: { targetPeerId: string; answer: any }) => {
      const { targetPeerId, answer } = payload;
      io.to(targetPeerId).emit('webrtc-answer', {
        answer,
        answererPeerId: socket.id
      });
      console.log(`✅ Respuesta WebRTC de ${socket.id} a ${targetPeerId}`);
    });

    // Manejar los candidatos ICE
    socket.on('webrtc-ice-candidate', (payload: { targetPeerId: string; candidate: any }) => {
      const { targetPeerId, candidate } = payload;
      io.to(targetPeerId).emit('webrtc-ice-candidate', {
        candidate,
        senderPeerId: socket.id
      });
    });

    // Manejar reacciones de emojis
    socket.on('emoji-reaction', (data: { roomId: string; emoji: string; timestamp: number }) => {
      const { roomId, emoji, timestamp } = data;
      socket.to(roomId).emit('emoji-reaction', {
        emoji,
        userId: socket.id,
        timestamp
      });
      console.log(`😊 Reacción ${emoji} de ${socket.id} en sala ${roomId}`);
    });

    // Cuando un usuario sale explícitamente de una sala de video
    socket.on('leave-video-room', (roomId: string) => {
      socket.leave(roomId);
      socket.to(roomId).emit('webrtc-user-left', socket.id);
      console.log(`👋 Usuario ${socket.id} salió de la videollamada ${roomId}`);
    });

    // Cuando un usuario se desconecta
    socket.on('disconnect', () => {
      console.log('❌ Usuario desconectado:', socket.id);
      
      // Notificar a todas las salas que el usuario se fue
      const rooms = Array.from(socket.rooms);
      rooms.forEach(roomId => {
        if (roomId !== socket.id) {
          socket.to(roomId).emit('webrtc-user-left', socket.id);
        }
      });
    });
  });
};

/**
 * Obtiene la instancia de Socket.IO
 * @throws Error si Socket.IO no ha sido inicializado
 */
export const getIo = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO no ha sido inicializado. Llama a setIo() primero.');
  }
  return io;
};

/**
 * Emite un evento a una sala específica
 */
export const emitToRoom = (roomCode: string, event: string, data: any): void => {
  if (!io) {
    console.error('Socket.IO no está inicializado');
    return;
  }
  io.to(`room-${roomCode}`).emit(event, data);
};

/**
 * Emite un evento a todos los clientes conectados
 */
export const emitToAll = (event: string, data: any): void => {
  if (!io) {
    console.error('Socket.IO no está inicializado');
    return;
  }
  io.emit(event, data);
};

/**
 * Obtiene los usuarios conectados en una sala
 */
export const getRoomUsers = (roomCode: string): Array<{ username: string; userId: number }> => {
  if (!io) {
    console.error('Socket.IO no está inicializado');
    return [];
  }

  const roomSockets = io.sockets.adapter.rooms.get(`room-${roomCode}`);
  const connectedUsers: Array<{ username: string; userId: number }> = [];

  if (roomSockets) {
    for (const socketId of roomSockets) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket && socket.data.user) {
        connectedUsers.push({
          username: socket.data.user.username,
          userId: socket.data.user.id
        });
      }
    }
  }

  return connectedUsers;
};

/**
 * Obtiene los usuarios conectados en una videollamada
 */
export const getVideoRoomUsers = (roomId: string): string[] => {
  if (!io) {
    console.error('Socket.IO no está inicializado');
    return [];
  }

  const roomSockets = io.sockets.adapter.rooms.get(roomId);
  return roomSockets ? Array.from(roomSockets) : [];
};

/**
 * Desconecta a un usuario específico de una sala
 */
export const kickUserFromRoom = (userId: number, roomCode: string): void => {
  if (!io) {
    console.error('Socket.IO no está inicializado');
    return;
  }

  const sockets = io.sockets.sockets;
  for (const [socketId, socketInstance] of sockets) {
    if (socketInstance.data.user && socketInstance.data.user.id === userId) {
      socketInstance.emit("kicked", { roomCode });
      socketInstance.leave(`room-${roomCode}`);
      break;
    }
  }
};

/**
 * Desconecta a un usuario de una videollamada
 */
export const kickUserFromVideoRoom = (socketId: string, roomId: string): void => {
  if (!io) {
    console.error('Socket.IO no está inicializado');
    return;
  }

  const socket = io.sockets.sockets.get(socketId);
  if (socket) {
    socket.emit("kicked-from-video", { roomId });
    socket.leave(roomId);
    socket.to(roomId).emit('webrtc-user-left', socketId);
    console.log(`🚫 Usuario ${socketId} expulsado de videollamada ${roomId}`);
  }
};

/**
 * Envía una notificación a un usuario específico por username
 */
export const notifyUserByUsername = (username: string, event: string, data: any): void => {
  if (!io) {
    console.error('Socket.IO no está inicializado');
    return;
  }

  const sockets = io.sockets.sockets;
  for (const [socketId, socketInstance] of sockets) {
    if (socketInstance.data.user && socketInstance.data.user.username === username) {
      socketInstance.emit(event, data);
    }
  }
};

/**
 * Envía una notificación a un usuario específico por userId
 */
export const notifyUserById = (userId: number, event: string, data: any): void => {
  if (!io) {
    console.error('Socket.IO no está inicializado');
    return;
  }

  const sockets = io.sockets.sockets;
  for (const [socketId, socketInstance] of sockets) {
    if (socketInstance.data.user && socketInstance.data.user.id === userId) {
      socketInstance.emit(event, data);
      break;
    }
  }
};
