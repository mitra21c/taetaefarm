import axios from 'axios';

// 우선순위: VITE_API_BASE_URL → 개발 서버(:8080) → 같은 도메인의 /api (Vercel)
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.DEV ? `http://${window.location.hostname}:8080/api` : '/api');
const BASE_URL = API_BASE_URL;

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return axiosInstance(originalRequest);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = `${import.meta.env.BASE_URL}login`;
        }
      }
    }
    return Promise.reject(error);
  }
);
