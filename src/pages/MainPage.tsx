import styles from './MainPage.module.css';

export default function MainPage() {
  return (
    <div className={styles.page}>
      <div className={styles.content} />
      <div className={styles.farmInfo}>
        <img
          src="https://mitra21c.github.io/data/images/taetaefarm/taetaefarm/icon.png"
          alt="태태농장"
          className={styles.farmIcon}
        />
        <div className={styles.farmDetails}>
          <span className={styles.farmDetailRow}>주소 : 전라남도 장성군 삼서면 수해리</span>
          <span className={styles.farmDetailRow}>연락처 : mitra21c@naver.com</span>
        </div>
      </div>
    </div>
  );
}
