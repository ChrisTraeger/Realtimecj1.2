import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos timeout
});

// Interceptor para agregar token automáticamente
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores globalmente
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      console.error('❌ Backend no está corriendo en http://localhost:8000');
      console.error('Solución: Ejecuta tu backend con: npm run dev (en la carpeta del backend)');
    }
    
    if (error.response?.status === 401) {
      console.error('❌ Token inválido o expirado');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

const roomService = {
  createRoom: async ({ name, description }: { name: string; description: string }) => {
    try {
      const response = await apiClient.post('/rooms', { name, description });
      return response.data;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  },

  getUserRooms: async () => {
    try {
      const response = await apiClient.get('/rooms');
      return response.data;
    } catch (error) {
      console.error('Error getting rooms:', error);
      throw error;
    }
  },

  getRoomByCode: async (code: string) => {
    try {
      const response = await apiClient.get(`/rooms/${code}`);
      return response.data;
    } catch (error) {
      console.error('Error getting room by code:', error);
      throw error;
    }
  },

  joinRoom: async (code: string) => {
    try {
      const response = await apiClient.post(`/rooms/${code}/join`, {});
      return response.data;
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  },

  closeRoom: async (roomId: number) => {
    try {
      const response = await apiClient.delete(`/rooms/${roomId}`);
      return response.data;
    } catch (error) {
      console.error('Error closing room:', error);
      throw error;
    }
  },

  leaveRoom: async (code: string) => {
    try {
      const response = await apiClient.delete(`/rooms/${code}/leave`);
      return response.data;
    } catch (error) {
      console.error('Error leaving room:', error);
      throw error;
    }
  },

  kickMember: async (code: string, userId: number) => {
    try {
      const response = await apiClient.delete(`/rooms/${code}/kick/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error kicking member:', error);
      throw error;
    }
  },

  updateRoom: async (code: string, name: string, description: string) => {
    try {
      const response = await apiClient.put(`/rooms/${code}`, { name, description });
      return response.data;
    } catch (error) {
      console.error('Error updating room:', error);
      throw error;
    }
  },
};

export default roomService;