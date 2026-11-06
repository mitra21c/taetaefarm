import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuthContext } from '../context/AuthContext';
import { useSubMenu } from '../context/SubMenuContext';
import { logout } from '../api/auth';
import styles from './Navbar.module.css';

const SMART_FARM_ITEMS = [
  { to: '/smart-farm/irrigation', label: '관수 자동화' },
  { to: '/smart-farm/nutrient', label: '양액기 자동화' },
];

// 마우스가 있고 메뉴가 가로로 펼쳐진 화면에서만 hover 로 하위 메뉴를 연다
const canHover = () => window.matchMedia('(hover: hover) and (min-width: 1301px)').matches;

export default function Navbar() {
  const { user, isAuthenticated, clearAuth } = useAuthContext();
  const { subItems, selected, setSelected } = useSubMenu();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [smartOpen, setSmartOpen] = useState(false);
  const smartRef = useRef<HTMLDivElement>(null);

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearAuth();
      navigate('/');
    },
  });

  // 스마트 팜 하위 메뉴: 바깥을 누르면 닫는다
  useEffect(() => {
    if (!smartOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!smartRef.current?.contains(e.target as Node)) setSmartOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [smartOpen]);

  const isStaff = isAuthenticated && (user?.role === 'admin' || user?.role === 'manager');
  const isSmartFarm = pathname.startsWith('/smart-farm');
  const close = () => {
    setMenuOpen(false);
    setSmartOpen(false);
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;

  return (
    <header className={styles.header}>
      {/* Top Bar: 로고(좌) · 메뉴(가운데) · 로그인(우) */}
      <div className={styles.topBar}>
        <div className={styles.left}>
          <button
            className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
            onClick={() => setMenuOpen(prev => !prev)}
            aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={menuOpen}
          >
            <span />
            <span />
          </button>

          <Link to="/" className={styles.logo} onClick={close} title={`ver. ${__BUILD_TIME__}`}>
            <img
              src="https://mitra21c.github.io/data/images/taetaefarm/icon.png"
              alt=""
              className={styles.logoIcon}
            />
            <span className={styles.logoText}>TaeTaeFarm</span>
          </Link>
        </div>

        <nav className={`${styles.navMenu} ${menuOpen ? styles.navMenuOpen : ''}`}>
          <NavLink to="/farm" className={navClass} onClick={close}>태태 농장</NavLink>

          {/* 스마트 팜: 하위 메뉴 */}
          <div
            ref={smartRef}
            className={`${styles.dropdown} ${smartOpen ? styles.dropdownOpen : ''}`}
            onMouseEnter={() => canHover() && setSmartOpen(true)}
            onMouseLeave={() => canHover() && setSmartOpen(false)}
          >
            <button
              className={`${styles.navLink} ${styles.dropdownToggle} ${isSmartFarm ? styles.navLinkActive : ''}`}
              onClick={() => setSmartOpen(prev => (canHover() ? true : !prev))}
              aria-haspopup="true"
              aria-expanded={smartOpen}
            >
              스마트 팜
              <svg className={styles.caret} width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className={styles.dropdownMenu} role="menu">
              {SMART_FARM_ITEMS.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  role="menuitem"
                  className={({ isActive }) =>
                    isActive ? `${styles.dropdownItem} ${styles.dropdownItemActive}` : styles.dropdownItem}
                  onClick={close}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          <NavLink to="/crops" className={navClass} onClick={close}>수확 작물</NavLink>
          <NavLink to="/order" className={navClass} onClick={close}>상품 주문</NavLink>
          <NavLink to="/order-status" className={navClass} onClick={close}>주문 현황</NavLink>
          {isStaff && (
            <NavLink to="/crop-price" className={navClass} onClick={close}>작물 가격</NavLink>
          )}
          <NavLink to="/market-price" className={navClass} onClick={close}>가락동 도매 시장</NavLink>
          {isStaff && (
            <NavLink to="/members" className={navClass} onClick={close}>회원 정보</NavLink>
          )}
          {isAuthenticated && user?.role === 'admin' && (
            <NavLink to="/dev" className={navClass} onClick={close}>개발자모드</NavLink>
          )}
          {isAuthenticated && (
            <button
              className={`${styles.navLink} ${styles.mobileOnly}`}
              onClick={() => { close(); logoutMutation.mutate(); }}
              disabled={logoutMutation.isPending}
            >
              로그아웃
            </button>
          )}
        </nav>

        <div className={styles.actions}>
          {isAuthenticated ? (
            <>
              <button
                className={styles.btnText}
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                로그아웃
              </button>
              <Link to="/mypage" className={styles.btnPrimary}>계정 정보</Link>
            </>
          ) : (
            <Link to="/login" className={styles.btnPrimary}>로그인</Link>
          )}
        </div>
      </div>

      {/* Sub Menu: Dribbble 필터 칩 */}
      {subItems.length > 0 && (
        <nav className={styles.subMenuBar} aria-label="하위 메뉴">
          <div className={styles.subMenuInner}>
            {subItems.map(item => (
              <button
                key={item.label}
                className={`${styles.chip} ${selected?.label === item.label ? styles.chipActive : ''}`}
                onClick={() => setSelected(item)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
