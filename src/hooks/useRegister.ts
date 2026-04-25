import { useMutation } from '@tanstack/react-query';
import { register } from '../api/auth';
import type { RegisterRequest } from '../types/auth';

export function useRegister(onSuccess: () => void) {
  return useMutation({
    mutationFn: (payload: RegisterRequest) => register(payload),
    onSuccess,
  });
}
