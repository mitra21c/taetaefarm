import styles from './Footer.module.css';

// 메인 화면 Bottom: 농장 정보 (가운데 정렬)
export default function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.line}>주소 : 전라남도 장성군</p>
      <p className={styles.line}>
        연락처 : <a href="mailto:mitra21c@naver.com" className={styles.mail}>mitra21c@naver.com</a>
      </p>
    </footer>
  );
}
