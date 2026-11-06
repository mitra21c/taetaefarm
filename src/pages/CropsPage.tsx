import { useEffect } from 'react';
import { useSubMenu } from '../context/SubMenuContext';
import { CROPS } from '../data/crops';
import styles from './CropsPage.module.css';

export default function CropsPage() {
  const { selected, setSubMenu, clearSubMenu } = useSubMenu();

  useEffect(() => {
    setSubMenu(CROPS);
    return () => clearSubMenu();
  }, [setSubMenu, clearSubMenu]);

  return (
    <div className={styles.content}>
      {selected && (
        <figure key={selected.label} className={styles.shot}>
          <img src={selected.img} alt={selected.label} className={styles.image} />
          <figcaption className={styles.caption}>{selected.label}</figcaption>
        </figure>
      )}
    </div>
  );
}
