import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuthContext } from '../context/AuthContext';
import { useSubMenu } from '../context/SubMenuContext';
import { logout } from '../api/auth';
import styles from './Navbar.module.css';

const NAV_ITEMS = [
  { to: '/farm', label: '태태 농장' },
  { to: '/crops', label: '수확 작물' },
  { to: '/order', label: '상품 주문' },
  { to: '/order-status', label: '주문 현황' },
];

export default function Navbar() {
  const { user, isAuthenticated, clearAuth } = useAuthContext();
  const { subItems, selected, setSelected } = useSubMenu();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearAuth();
      navigate('/');
    },
  });

  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;

  return (
    <header className={styles.header}>
      {/* Title Bar */}
      <div className={styles.titleBar}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>🫐</span>
          <span className={styles.logoText}>태태농장</span>
        </Link>

        <div className={styles.actions}>
          {isAuthenticated ? (
            <>
              <Link to="/mypage" className={styles.btnAccount}>
                계정 정보
              </Link>
              <button
                className={styles.btnLogout}
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link to="/login" className={styles.btnLogin}>
              로그인
            </Link>
          )}
        </div>
      </div>

      {/* Menu Bar */}
      <nav className={styles.menuBar}>
        <div className={`${styles.navMenu} ${menuOpen ? styles.navMenuOpen : ''}`}>
          {NAV_ITEMS.map(item => (
            <NavLink key={item.to} to={item.to} className={navClass} onClick={() => setMenuOpen(false)}>
              {item.label}
            </NavLink>
          ))}
          {isAuthenticated && user?.role === 'admin' && (
            <NavLink to="/members" className={navClass} onClick={() => setMenuOpen(false)}>
              회원 정보
            </NavLink>
          )}
        </div>

        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label="메뉴 열기"
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      {/* Sub Menu Bar */}
      {subItems.length > 0 && (
        <nav className={styles.subMenuBar}>
          {subItems.map(item => (
            <button
              key={item.label}
              className={`${styles.subLink} ${selected?.label === item.label ? styles.subLinkActive : ''}`}
              onClick={() => setSelected(item)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
