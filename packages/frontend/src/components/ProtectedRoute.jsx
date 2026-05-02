import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/slices/authSlice';

const ProtectedRoute = ({ children }) => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAuthenticated && !isAdmin) {
      dispatch(logout());
    }
  }, [isAuthenticated, isAdmin, dispatch]);

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
