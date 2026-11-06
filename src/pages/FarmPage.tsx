import Placeholder from '../components/Placeholder';
import farmImage from '../assets/farm-construction.svg';
import styles from './FarmPage.module.css';

// 태태 농장 소개 (메인 화면 기본 Contents)
export default function FarmPage() {
  return (
    <div className={styles.page}>
      <Placeholder image={farmImage} imageAlt="공사 중인 농장 그림" message="웹 서버 구축 중입니다" />
    </div>
  );
}
