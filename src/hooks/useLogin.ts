import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuthContext } from '../context/AuthContext';
import type { LoginRequest } from '../types/auth';

export function useLogin() {
  const { setTokens } = useAuthContext();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (credentials: LoginRequest) => login(credentials),
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      navigate(data.user.role === 'admin' ? '/members' : '/');
    },
  });
}
