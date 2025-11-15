import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

const pollService = {
  createPoll: async ({ roomId, question, options, deadline }: { roomId: number; question: string; options: string[]; deadline?: string }) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await apiClient.post('/polls', { roomId, question, options, deadline }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },
  vote: async ({ pollId, optionId }: { pollId: number; optionId: number }) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await apiClient.post('/polls/vote', { pollId, optionId }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },
  deletePoll: async (pollId: number) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await apiClient.delete(`/polls/${pollId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },
};

export default pollService;
