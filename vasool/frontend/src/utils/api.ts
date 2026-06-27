import axios from 'axios';

const api = axios.create({
  baseURL: 'https://vasool-reminder.onrender.com/api',
});

// Automatically inject JWT token into requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vasool_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('vasool_token');
      localStorage.removeItem('vasool_user');
      // Only redirect if not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
