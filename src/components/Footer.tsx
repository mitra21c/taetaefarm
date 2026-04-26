import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.line}>
          <span className={styles.label}>주소</span>
          전라남도 장성군 삼서면 수해리
        </p>
        <p className={styles.line}>
          <span className={styles.label}>연락처</span>
          mitra21c@naver.com
        </p>
      </div>
    </footer>
  );
}
