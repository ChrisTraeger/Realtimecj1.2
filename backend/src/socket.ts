// src/socket.ts

import { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

/**
 * Establece la instancia de Socket.IO para que pueda ser usada en otros módulos
 */
export const setIo = (socketServer: SocketIOServer): void => {
  io = socketServer;
  console.log('✅ Socket.IO instancia establecida');
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