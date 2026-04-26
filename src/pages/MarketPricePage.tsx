import styles from './MarketPricePage.module.css';

const PRICES = [
  { name: '블루베리', unit: '1kg', low: 12000, mid: 16000, high: 22000, trend: 'up' },
  { name: '단감(대봉)', unit: '10kg', low: 18000, mid: 25000, high: 35000, trend: 'down' },
  { name: '대추', unit: '1kg', low: 8000, mid: 12000, high: 18000, trend: 'same' },
  { name: '건시(감말랭이)', unit: '1kg', low: 14000, mid: 19000, high: 28000, trend: 'up' },
  { name: '울금', unit: '1kg', low: 15000, mid: 22000, high: 32000, trend: 'same' },
];

const TREND_ICON: Record<string, string> = { up: '▲', down: '▼', same: '─' };
const TREND_CLASS: Record<string, string> = { up: 'trendUp', down: 'trendDown', same: 'trendSame' };

export default function MarketPricePage() {
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <main className={styles.main}>
      <div className={styles.inner}>
        <div className={styles.hero}>
          <h1 className={styles.title}>농작물 시세</h1>
          <p className={styles.subtitle}>서울 가락동 농수산물 시장 기준 시세 정보</p>
        </div>

        <div className={styles.notice}>
          <span className={styles.noticeIcon}>ℹ️</span>
          <span>기준일 : {today} · 가락동 농수산물 도매시장 · 단위는 품목별 기재</span>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>품목</th>
                <th>단위</th>
                <th className={styles.thCenter}>하한가</th>
                <th className={styles.thCenter}>평균가</th>
                <th className={styles.thCenter}>상한가</th>
                <th className={styles.thCenter}>동향</th>
              </tr>
            </thead>
            <tbody>
              {PRICES.map(item => (
                <tr key={item.name}>
                  <td className={styles.tdName}>{item.name}</td>
                  <td className={styles.tdUnit}>{item.unit}</td>
                  <td className={styles.tdPrice}>{item.low.toLocaleString()}원</td>
                  <td className={`${styles.tdPrice} ${styles.tdMid}`}>{item.mid.toLocaleString()}원</td>
                  <td className={styles.tdPrice}>{item.high.toLocaleString()}원</td>
                  <td className={styles.tdCenter}>
                    <span className={`${styles.trend} ${styles[TREND_CLASS[item.trend]]}`}>
                      {TREND_ICON[item.trend]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className={styles.disclaimer}>
          ※ 위 시세는 참고용이며, 실제 거래가와 다를 수 있습니다. 정확한 시세는 가락동 농수산물 시장 공식 홈페이지를 확인하세요.
        </p>
      </div>
    </main>
  );
}
