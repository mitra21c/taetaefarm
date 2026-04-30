import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <img
          src="https://mitra21c.github.io/data/images/taetaefarm/taetaefarm/icon.png"
          alt="태태농장"
          className={styles.icon}
        />
        <div className={styles.details}>
          <p className={styles.line}>주소 : 전라남도 장성군 삼서면 수해리</p>
          <p className={styles.line}>연락처 : mitra21c@naver.com</p>
        </div>
      </div>
    </footer>
  );
}
