import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

const chatService = {
  sendMessage: async ({ content, roomId }: { content: string; roomId: number }) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await apiClient.post('/chat', { content, roomId }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },
  getRoomMessages: async (roomId: number) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await apiClient.get(`/chat/room/${roomId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },
  getUserMentions: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await apiClient.get('/chat/mentions', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },
};

export default chatService;
