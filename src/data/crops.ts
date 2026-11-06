import type { SubItem } from '../context/SubMenuContext';

const BASE = 'https://mitra21c.github.io/data/images/taetaefarm';

// 수확 작물 소개 이미지 (CropsPage 서브메뉴)
export const CROPS: SubItem[] = [
  { label: '블루베리', img: `${BASE}/%EB%B8%94%EB%A3%A8%EB%B2%A0%EB%A6%AC_%EC%86%8C%EA%B0%9C.png` },
  { label: '태추 단감', img: `${BASE}/%ED%83%9C%EC%B6%94_%EC%86%8C%EA%B0%9C.png` },
  { label: '대봉', img: `${BASE}/%EB%8C%80%EB%B4%89_%EC%86%8C%EA%B0%9C.png` },
  { label: '감 말랭이', img: `${BASE}/%EA%B0%90%EB%A7%90%EB%9E%AD%EC%9D%B4_%EC%86%8C%EA%B0%9C.png` },
  { label: '울금', img: `${BASE}/%EC%9A%B8%EA%B8%88_%EC%86%8C%EA%B0%9C.png` },
];
