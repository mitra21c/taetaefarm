import styles from './MainPage.module.css';

// 기본 Contents 화면 (메뉴 미선택 시)
export default function MainPage() {
  return (
    <div className={styles.page}>
      <p className={styles.message}>웹 서버 구축 중</p>
    </div>
  );
}
