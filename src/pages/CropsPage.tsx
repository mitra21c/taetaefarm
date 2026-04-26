import { useEffect } from 'react';
import { useSubMenu } from '../context/SubMenuContext';
import styles from './CropsPage.module.css';

const CROPS = [
  {
    label: '블루베리',
    img: 'https://mitra21c.github.io/data/images/taetaefarm/%EB%B8%94%EB%A3%A8%EB%B2%A0%EB%A6%AC_%EC%86%8C%EA%B0%9C.png',
  },
  {
    label: '태추 단감',
    img: 'https://mitra21c.github.io/data/images/taetaefarm/%ED%83%9C%EC%B6%94_%EC%86%8C%EA%B0%9C.png',
  },
  {
    label: '대봉',
    img: 'https://mitra21c.github.io/data/images/taetaefarm/%EB%8C%80%EB%B4%89_%EC%86%8C%EA%B0%9C.png',
  },
  {
    label: '감 말랭이',
    img: 'https://mitra21c.github.io/data/images/taetaefarm/%EA%B0%90%EB%A7%90%EB%9E%AD%EC%9D%B4_%EC%86%8C%EA%B0%9C.png',
  },
  {
    label: '울금',
    img: 'https://mitra21c.github.io/data/images/taetaefarm/%EC%9A%B8%EA%B8%88_%EC%86%8C%EA%B0%9C.png',
  },
];

export default function CropsPage() {
  const { selected, setSubMenu, clearSubMenu } = useSubMenu();

  useEffect(() => {
    setSubMenu(CROPS);
    return () => clearSubMenu();
  }, []);

  return (
    <div className={styles.content}>
      {selected && (
        <img
          key={selected.label}
          src={selected.img}
          alt={selected.label}
          className={styles.image}
        />
      )}
    </div>
  );
}
