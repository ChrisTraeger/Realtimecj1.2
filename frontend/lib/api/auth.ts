import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token JWT automáticamente
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

const authService = {
  login: async ({ username, password }: { username: string; password: string }) => {
    try {
      const response = await apiClient.post('/auth/login', { username, password });
      const { user } = response.data;
      const token = response.headers['token'] || response.data.token;
      if (token) {
        localStorage.setItem('auth_token', token);
      }
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error: any) {
      // Si el backend retorna status 400 por contraseña incorrecta
      if (error.response && error.response.status === 400) {
        throw new Error(error.response.data?.message || 'Contraseña incorrecta');
      }
      // Otros errores
      throw new Error('Error al iniciar sesión');
    }
  },
  register: async ({ username, password }: { username: string; password: string }) => {
    await apiClient.post('/auth/register', { username, password, role: 'user' });
    // Login automático después de registro
    return await authService.login({ username, password });
  },
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },
  getCurrentUser: () => {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
};

export default authService;
