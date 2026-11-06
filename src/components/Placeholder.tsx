import styles from './Placeholder.module.css';

interface Props {
  image: string;
  message: string;
  imageAlt?: string;
}

/** 아직 내용이 없는 화면: 일러스트 + 안내 문구 */
export default function Placeholder({ image, message, imageAlt = '' }: Props) {
  return (
    <div className={styles.wrap}>
      <img src={image} alt={imageAlt} className={styles.image} />
      <p className={styles.message}>{message}</p>
    </div>
  );
}
