import styles from './FarmPage.module.css';

export default function FarmPage() {
  return (
    <main className={styles.main}>
      <div className={styles.inner}>
        <div className={styles.hero}>
          <span className={styles.heroEmoji}>🌾</span>
          <h1 className={styles.title}>태희태균 농장</h1>
          <p className={styles.subtitle}>청정 자연 속에서 정성껏 키운 건강한 먹거리</p>
        </div>

        <div className={styles.cards}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>📍</div>
            <h3>위치</h3>
            <p>경상북도 청송군 일원의 맑은 계곡과 비옥한 토지에서 운영되고 있습니다.</p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon}>🌱</div>
            <h3>농법</h3>
            <p>화학비료를 최소화하고 자연 퇴비와 친환경 농법으로 건강한 작물을 재배합니다.</p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon}>🚚</div>
            <h3>산지 직송</h3>
            <p>수확 당일 포장 후 신선도를 최대한 유지한 상태로 고객의 식탁에 직접 배송합니다.</p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon}>👨‍🌾</div>
            <h3>운영자</h3>
            <p>두 형제가 함께 땀 흘려 가꾸는 농장입니다. 태희와 태균, 자연과 함께합니다.</p>
          </div>
        </div>

        <section className={styles.story}>
          <h2>우리 농장 이야기</h2>
          <p>
            태희태균 농장은 형제가 함께 일군 작은 농장에서 시작했습니다.
            블루베리, 대봉감, 대추, 울금, 감 말랭이 등 다양한 작물을
            자연 그대로의 방식으로 재배하여, 소비자에게 가장 신선한 상태로 전달하는 것을 목표로 합니다.
          </p>
          <p>
            매 계절 정직한 땀으로 가꾼 작물들을 산지 직송으로 보내드립니다.
            우리 가족이 먹는다는 마음으로, 안전하고 건강한 먹거리를 만들겠습니다.
          </p>
        </section>
      </div>
    </main>
  );
}
