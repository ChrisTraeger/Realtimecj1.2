import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

const userService = {
  getUser: async (id: number) => {
    const response = await apiClient.get(`/user/${id}`);
    return response.data;
  },
  updateUser: async (id: number, data: any) => {
    const response = await apiClient.patch(`/user/${id}`, data);
    return response.data;
  },
  deleteUser: async (id: number) => {
    const response = await apiClient.delete(`/user/${id}`);
    return response.data;
  },
};

export default userService;
