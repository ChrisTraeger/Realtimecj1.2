import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

const roomService = {
  createRoom: async ({ name, description }: { name: string; description: string }) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await apiClient.post('/rooms', { name, description }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },
  getUserRooms: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await apiClient.get('/rooms', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },
  getRoomByCode: async (code: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await apiClient.get(`/rooms/${code}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },
  joinRoom: async (code: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await apiClient.post(`/rooms/${code}/join`, {}, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },
  closeRoom: async (roomId: number) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await apiClient.delete(`/rooms/${roomId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },
  leaveRoom: async (code: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await apiClient.delete(`/rooms/${code}/leave`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },
  kickMember: async (code: string, userId: number) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await apiClient.delete(`/rooms/${code}/kick/${userId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },
  updateRoom: async (code: string, name: string, description: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await apiClient.put(`/rooms/${code}`, { name, description }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },
};

export default roomService;
