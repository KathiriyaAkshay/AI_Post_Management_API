import { useMutation, useQuery } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCredentials, logout } from '../store/slices/authSlice';
import { authService } from '../services/authService';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, token } = useAppSelector((state) => state.auth);

  const loginMutation = useMutation({
    mutationFn: ({ identifier, password }) => authService.login(identifier, password),
    onSuccess: (data) => {
      if (data.success && data.data) {
        dispatch(setCredentials(data.data));
      }
    },
  });

  const signupMutation = useMutation({
    mutationFn: ({ email, password, full_name }) =>
      authService.signup(email, password, full_name),
    onSuccess: (data) => {
      if (data.success && data.data) {
        dispatch(setCredentials(data.data));
      }
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: (email) => authService.forgotPassword(email),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ access_token, password }) =>
      authService.resetPassword(access_token, password),
  });

  const updatePasswordMutation = useMutation({
    mutationFn: (password) => authService.updatePassword(password),
  });

  const handleLogout = () => {
    dispatch(logout());
  };

  return {
    user,
    isAuthenticated,
    token,
    login: loginMutation.mutate,
    signup: signupMutation.mutate,
    forgotPassword: forgotPasswordMutation.mutate,
    resetPassword: resetPasswordMutation.mutate,
    updatePassword: updatePasswordMutation.mutate,
    isLoading:
      loginMutation.isPending ||
      signupMutation.isPending ||
      forgotPasswordMutation.isPending ||
      resetPasswordMutation.isPending ||
      updatePasswordMutation.isPending,
    logout: handleLogout,
  };
};
