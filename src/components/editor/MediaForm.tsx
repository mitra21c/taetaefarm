import { useState } from 'react';
import styles from './Editor.module.css';

export type MediaKind = 'image' | 'video' | 'link';

const TEXT: Record<MediaKind, { title: string; placeholder: string; help: string }> = {
  image: {
    title: '이미지 넣기',
    placeholder: 'https://mitra21c.github.io/data/images/...png',
    help: 'GitHub 에 올려 둔 이미지 주소를 붙여 넣으세요. (jpg, png, gif, webp)',
  },
  video: {
    title: '영상 넣기',
    placeholder: 'https://mitra21c.github.io/data/videos/...mp4  또는 YouTube 주소',
    help: 'GitHub 에 올려 둔 mp4 주소나 YouTube 주소를 붙여 넣으세요.',
  },
  link: {
    title: '링크 걸기',
    placeholder: 'https://',
    help: '선택한 글자에 링크를 겁니다. 비워 두고 적용하면 링크를 지웁니다.',
  },
};

interface Props {
  kind: MediaKind;
  initialUrl?: string;
  onSubmit: (url: string, alt: string) => string | null; // 오류 메시지를 돌려주면 표시
  onClose: () => void;
}

export default function MediaForm({ kind, initialUrl = '', onSubmit, onClose }: Props) {
  const [url, setUrl] = useState(initialUrl);
  const [alt, setAlt] = useState('');
  const [error, setError] = useState('');
  const t = TEXT[kind];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = onSubmit(url.trim(), alt.trim());
    if (err) setError(err);
    else onClose();
  };

  return (
    <form className={styles.mediaForm} onSubmit={submit}>
      <p className={styles.mediaTitle}>{t.title}</p>
      <input
        autoFocus
        className={styles.mediaInput}
        type="url"
        inputMode="url"
        placeholder={t.placeholder}
        value={url}
        onChange={e => { setUrl(e.target.value); setError(''); }}
      />
      {kind === 'image' && (
        <input
          className={styles.mediaInput}
          type="text"
          placeholder="이미지 설명 (선택)"
          value={alt}
          onChange={e => setAlt(e.target.value)}
        />
      )}
      <p className={error ? styles.mediaError : styles.mediaHelp}>{error || t.help}</p>
      <div className={styles.mediaActions}>
        <button type="button" className={styles.btnGhost} onClick={onClose}>취소</button>
        <button type="submit" className={styles.btnPrimary}>{kind === 'link' ? '적용' : '넣기'}</button>
      </div>
    </form>
  );
}
