import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/**
 * Hook to check JWT token expiration and automatically log out when expired
 * This hook provides additional token checking beyond the AuthContext
 */
export const useTokenExpiration = () => {
  const { userSession, logout } = useAuth();
  const navigate = useNavigate();

  //const now22 = Math.floor(Date.now() / 1000);
  //console.log('useTokenExpiration hook initialized, userSession::',userSession.expires_at < now22);
  //console.log('useTokenExpiration hook initialized, profiledata::', profiledata);

  useEffect(() => {
    if (!userSession) return;

    const checkToken = () => {
      const now = Math.floor(Date.now() / 1000);
      if (userSession.expires_at && userSession.expires_at < now) {
        console.log('Token expired via useTokenExpiration hook');
        logout().finally(() => {
          navigate('/', { replace: true });
        });
      }
    };

    // Check immediately
    checkToken();

    // Check every minute
    const interval = setInterval(checkToken, 60 * 1000);

    return () => clearInterval(interval);
  }, [userSession, logout, navigate]);

  return null;
};