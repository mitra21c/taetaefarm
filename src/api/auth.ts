import { axiosInstance } from './axiosInstance';
import type { LoginRequest, LoginResponse } from '../types/auth';

export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const { data } = await axiosInstance.post<LoginResponse>('/auth/login', credentials);
  return data;
};

export const logout = async (): Promise<void> => {
  await axiosInstance.post('/auth/logout');
};
