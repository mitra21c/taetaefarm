import { axiosInstance } from './axiosInstance';
import type { LoginRequest, LoginResponse, RegisterRequest } from '../types/auth';
import { encryptPassword } from '../utils/crypto';

export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const { data } = await axiosInstance.post<LoginResponse>('/auth/login', {
    ...credentials,
    password: encryptPassword(credentials.password),
  });
  return data;
};

export const logout = async (): Promise<void> => {
  await axiosInstance.post('/auth/logout');
};

export const register = async (payload: RegisterRequest): Promise<void> => {
  await axiosInstance.post('/auth/register', {
    ...payload,
    password: encryptPassword(payload.password),
  });
};

export const checkDuplicateApi = async (
  email: string,
  phone: string,
): Promise<{ isDuplicate: boolean }> => {
  const { data } = await axiosInstance.post<{ isDuplicate: boolean }>('/auth/check-duplicate', {
    email,
    phone,
  });
  return data;
};

export interface UserInfo {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  post: string;
  role: string;
  reference_id: number;
  created_at: string;
}

export const getAllUsers = async (): Promise<UserInfo[]> => {
  const { data } = await axiosInstance.get<UserInfo[]>('/users');
  return data;
};

export const getUserInfo = async (email: string): Promise<UserInfo> => {
  const { data } = await axiosInstance.get<UserInfo>(
    `/users/email/${encodeURIComponent(email)}`,
  );
  return data;
};

export interface OrderRequest {
  user_id: number;
  name: string;
  phone: string;
  email: string;
  order_item: string;
  order_weight: number;
  order_price: number;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  receiver_post: string;
}

export const createOrder = async (payload: OrderRequest): Promise<void> => {
  await axiosInstance.post('/orders', payload);
};

export const updateOrderStatus = async (id: number, delivery_status: string): Promise<void> => {
  await axiosInstance.patch(`/orders/${id}/status`, { delivery_status });
};

export const getOrders = async (params?: { email?: string; year?: number }): Promise<any[]> => {
  const { data } = await axiosInstance.get('/orders', { params });
  return data;
};

export const verifyReferrerApi = async (
  name: string,
  email: string,
): Promise<{ found: boolean; referrerId?: number }> => {
  const { data } = await axiosInstance.post<{ found: boolean; referrerId?: number }>(
    '/auth/verify-referrer',
    { name, email },
  );
  return data;
};
