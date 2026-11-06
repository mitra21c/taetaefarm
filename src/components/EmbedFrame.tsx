import { useEffect, useRef, useState } from 'react';
import styles from './EmbedFrame.module.css';

interface Props {
  url: string;
  title: string;
  /** 보여 줄 사이트가 그려지는 너비(px). 화면이 이보다 좁으면 비율대로 축소한다. */
  contentWidth?: number;
}

// iframe 안 스크롤바는 상대 사이트가 그리므로 CSS 로 못 숨긴다.
// 그래서 iframe 을 스크롤바 두께만큼 크게 만들고 바깥 틀에서 잘라 낸다 (마우스 휠·터치 스크롤은 그대로 됨).
const SCROLLBAR = 20;

/** 다른 사이트(블로그 등)를 스크롤바 없이, 영역 너비에 맞춰 보여 준다 */
export default function EmbedFrame({ url, title, contentWidth = 840 }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 화면이 넓으면 그대로(1배), 좁으면 contentWidth 가 영역에 꼭 맞게 축소
  const virtualWidth = Math.max(contentWidth, box.w);
  const scale = box.w ? box.w / virtualWidth : 1;

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <span className={styles.url}>{url}</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className={styles.open}>
          새 창에서 열기 ↗
        </a>
      </div>
      <div ref={boxRef} className={styles.box}>
        {box.w > 0 && (
          <iframe
            key={url}
            src={url}
            title={title}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
            className={styles.frame}
            style={{
              width: virtualWidth + SCROLLBAR,
              height: box.h / scale + SCROLLBAR,
              transform: `scale(${scale})`,
            }}
          />
        )}
      </div>
    </div>
  );
}
