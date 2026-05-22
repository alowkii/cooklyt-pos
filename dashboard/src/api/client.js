import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 8000,
  withCredentials: true, // send HttpOnly auth cookie on every request
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pos_user');
      localStorage.removeItem('pos_restaurant');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;
