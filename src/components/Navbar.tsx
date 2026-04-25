import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuthContext } from '../context/AuthContext';
import { logout } from '../api/auth';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, isAuthenticated, clearAuth } = useAuthContext();
  const navigate = useNavigate();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearAuth();
      navigate('/');
    },
  });

  return (
    <nav className={styles.navbar}>
      <Link to="/" className={styles.logo}>
        <span className={styles.logoIcon}>🫐</span>
        <span className={styles.logoText}>태태농장</span>
      </Link>

      <div className={styles.actions}>
        {isAuthenticated ? (
          <>
            <span className={styles.userName}>{user?.name}님 환영합니다</span>
            <button
              className={styles.btnOutline}
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              로그아웃
            </button>
          </>
        ) : (
          <Link to="/login" className={styles.btnPrimary}>
            로그인
          </Link>
        )}
      </div>
    </nav>
  );
}
