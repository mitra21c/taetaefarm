import { Link } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import styles from './MainPage.module.css';

export default function MainPage() {
  const { isAuthenticated, user } = useAuthContext();

  return (
    <main className={styles.main}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroIllustration}>
          <FarmIllustration />
        </div>
        <div className={styles.heroContent}>
          <p className={styles.heroTag}>🫐 신선함을 그대로</p>
          <h1 className={styles.heroTitle}>
            태태농장에서 키운<br />
            <span className={styles.accent}>블루베리</span>와&nbsp;
            <span className={styles.accentOrange}>단감</span>
          </h1>
          <p className={styles.heroDesc}>
            청정 자연 속에서 정성껏 재배한 농산물을<br />
            산지 직송으로 여러분의 식탁에 전달합니다.
          </p>
          <div className={styles.heroCta}>
            {isAuthenticated ? (
              <p className={styles.welcome}>
                {user?.name}님, 오늘도 건강한 하루 되세요 🌿
              </p>
            ) : (
              <>
                <Link to="/login" className={styles.ctaPrimary}>
                  로그인하고 주문하기
                </Link>
                <a href="#products" className={styles.ctaSecondary}>
                  상품 둘러보기
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className={styles.features} id="products">
        <h2 className={styles.sectionTitle}>대표 농산물</h2>
        <div className={styles.cards}>
          <div className={styles.card}>
            <div className={styles.cardEmoji}>🫐</div>
            <h3>블루베리</h3>
            <p>항산화 성분이 풍부한 신선한 블루베리. 매년 6~8월 수확합니다.</p>
          </div>
          <div className={`${styles.card} ${styles.cardOrange}`}>
            <div className={styles.cardEmoji}>🍊</div>
            <h3>단감</h3>
            <p>달콤하고 아삭한 단감. 가을 햇살을 듬뿍 받아 9~11월에 출하합니다.</p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardEmoji}>📦</div>
            <h3>산지 직송</h3>
            <p>수확 당일 포장 후 냉장 배송. 신선도를 그대로 유지합니다.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function FarmIllustration() {
  return (
    <svg viewBox="0 0 600 450" xmlns="http://www.w3.org/2000/svg" className={styles.svg}>
      {/* Sky */}
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b8e4f7" />
          <stop offset="100%" stopColor="#e8f5e9" />
        </linearGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7cb342" />
          <stop offset="100%" stopColor="#558b2f" />
        </linearGradient>
        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff9c4" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fff9c4" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="600" height="450" fill="url(#sky)" />

      {/* Sun */}
      <circle cx="500" cy="80" r="50" fill="#fff9c4" opacity="0.6" />
      <circle cx="500" cy="80" r="35" fill="#ffee58" />

      {/* Clouds */}
      <g opacity="0.85">
        <ellipse cx="120" cy="90" rx="55" ry="28" fill="#fff" />
        <ellipse cx="155" cy="78" rx="38" ry="30" fill="#fff" />
        <ellipse cx="85" cy="82" rx="30" ry="22" fill="#fff" />
      </g>
      <g opacity="0.75">
        <ellipse cx="350" cy="60" rx="45" ry="22" fill="#fff" />
        <ellipse cx="380" cy="50" rx="32" ry="25" fill="#fff" />
        <ellipse cx="320" cy="56" rx="28" ry="18" fill="#fff" />
      </g>

      {/* Ground */}
      <rect x="0" y="300" width="600" height="150" fill="url(#ground)" />
      <ellipse cx="300" cy="300" rx="310" ry="18" fill="#8bc34a" />

      {/* Barn */}
      <rect x="60" y="190" width="130" height="115" fill="#d32f2f" />
      <polygon points="55,190 195,190 125,130" fill="#b71c1c" />
      <rect x="105" y="255" width="40" height="50" fill="#5d4037" />
      <rect x="70" y="210" width="30" height="25" fill="#fff9c4" opacity="0.8" rx="2" />
      <rect x="155" y="210" width="30" height="25" fill="#fff9c4" opacity="0.8" rx="2" />

      {/* Blueberry bushes */}
      {[220, 260, 300, 340, 380].map((x, i) => (
        <g key={i}>
          <ellipse cx={x} cy={295} rx="22" ry="16" fill="#388e3c" />
          {[...Array(5)].map((_, j) => (
            <circle
              key={j}
              cx={x - 12 + j * 6}
              cy={285 + (j % 2) * 5}
              r="5"
              fill="#5c35be"
              opacity="0.9"
            />
          ))}
        </g>
      ))}

      {/* Persimmon tree */}
      <rect x="470" y="210" width="14" height="90" fill="#795548" />
      <ellipse cx="477" cy="195" rx="50" ry="45" fill="#388e3c" />
      {[440, 460, 480, 500, 455, 475, 495].map((x, i) => (
        <circle
          key={i}
          cx={x}
          cy={185 + (i % 3) * 18}
          r="11"
          fill="#f57c00"
          opacity="0.92"
        />
      ))}

      {/* Path */}
      <polygon points="250,450 350,450 320,300 280,300" fill="#d7ccc8" opacity="0.7" />

      {/* Fence */}
      {[215, 245, 275, 305, 335, 365, 395].map((x, i) => (
        <rect key={i} x={x} y={290} width="6" height="22" fill="#a1887f" rx="2" />
      ))}
      <rect x="215" y="294" width="186" height="5" fill="#a1887f" rx="2" />
      <rect x="215" y="304" width="186" height="5" fill="#a1887f" rx="2" />
    </svg>
  );
}
