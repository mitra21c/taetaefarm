import { useState } from 'react';
import { useEditorState, type Editor } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import MediaForm, { type MediaKind } from './MediaForm';
import { isYoutubeUrl, normalizeMediaUrl, safeUrl } from './extensions';
import styles from './Editor.module.css';

const Icon = ({ d, label }: { d: string; label: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
    <title>{label}</title>
  </svg>
);

const ICONS = {
  undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  redo: 'm15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13',
  bullet: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  ordered: 'M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1',
  alignLeft: 'M3 6h18M3 12h12M3 18h16',
  alignCenter: 'M3 6h18M6 12h12M4 18h16',
  alignRight: 'M3 6h18M9 12h12M5 18h16',
  quote: 'M4 21c3 0 7-1 7-8V5H4v7h4c0 4-1 5-4 5zM14 21c3 0 7-1 7-8V5h-7v7h4c0 4-1 5-4 5z',
  rule: 'M3 12h18',
  link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
  image: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21',
  video: 'm22 8-6 4 6 4V8zM2 6h14v12H2z',
};

export default function Toolbar({ editor }: { editor: Editor }) {
  const [form, setForm] = useState<MediaKind | null>(null);

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      link: e.isActive('link'),
      linkHref: (e.getAttributes('link').href as string | undefined) ?? '',
      left: e.isActive({ textAlign: 'left' }),
      center: e.isActive({ textAlign: 'center' }),
      right: e.isActive({ textAlign: 'right' }),
      block: e.isActive('heading', { level: 1 }) ? 'h1'
        : e.isActive('heading', { level: 2 }) ? 'h2'
        : e.isActive('heading', { level: 3 }) ? 'h3' : 'p',
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();
  const btn = (active: boolean) => (active ? `${styles.tool} ${styles.toolActive}` : styles.tool);

  const setBlock = (v: string) => {
    if (v === 'p') chain().setParagraph().run();
    else chain().toggleHeading({ level: Number(v[1]) as 1 | 2 | 3 }).run();
  };

  // 이미지 / 영상 / 링크 입력 처리. 오류 메시지를 돌려주면 폼에 표시된다.
  const submitMedia = (kind: MediaKind) => (raw: string, alt: string): string | null => {
    if (kind === 'link') {
      if (!raw) { chain().extendMarkRange('link').unsetLink().run(); return null; }
      const url = safeUrl(raw);
      if (!url) return 'http:// 또는 https:// 로 시작하는 주소를 입력해 주세요.';
      chain().extendMarkRange('link').setLink({ href: url }).run();
      return null;
    }
    if (!raw) return '주소를 입력해 주세요.';
    // 이미지·영상이 선택된 상태면 덮어쓰지 않도록 커서를 그 뒤로 옮긴다
    const sel = editor.state.selection;
    const at = () => (sel instanceof NodeSelection ? chain().setTextSelection(sel.to) : chain());
    if (kind === 'video' && isYoutubeUrl(raw)) {
      const ok = at().setYoutubeVideo({ src: raw }).run();
      return ok ? null : 'YouTube 주소를 확인해 주세요.';
    }
    const url = normalizeMediaUrl(raw);
    if (!url) return 'http:// 또는 https:// 로 시작하는 주소를 입력해 주세요.';
    const node = kind === 'image'
      ? { type: 'image', attrs: { src: url, alt: alt || null } }
      : { type: 'video', attrs: { src: url } };
    at().insertContent(node).run();
    return null;
  };

  return (
    <div className={styles.toolbarWrap}>
      <div className={styles.toolbar} role="toolbar" aria-label="서식">
        <button type="button" className={styles.tool} onClick={() => chain().undo().run()} disabled={!s.canUndo} title="실행 취소">
          <Icon d={ICONS.undo} label="실행 취소" />
        </button>
        <button type="button" className={styles.tool} onClick={() => chain().redo().run()} disabled={!s.canRedo} title="다시 실행">
          <Icon d={ICONS.redo} label="다시 실행" />
        </button>
        <span className={styles.sep} />

        <select className={styles.blockSelect} value={s.block} onChange={e => setBlock(e.target.value)} aria-label="문단 형식">
          <option value="p">본문</option>
          <option value="h1">제목 1</option>
          <option value="h2">제목 2</option>
          <option value="h3">제목 3</option>
        </select>
        <span className={styles.sep} />

        <button type="button" className={btn(s.bold)} onClick={() => chain().toggleBold().run()} title="굵게 (Ctrl+B)">
          <b>B</b>
        </button>
        <button type="button" className={btn(s.italic)} onClick={() => chain().toggleItalic().run()} title="기울임 (Ctrl+I)">
          <i style={{ fontFamily: 'Georgia, serif' }}>I</i>
        </button>
        <button type="button" className={btn(s.underline)} onClick={() => chain().toggleUnderline().run()} title="밑줄 (Ctrl+U)">
          <u>U</u>
        </button>
        <button type="button" className={btn(s.strike)} onClick={() => chain().toggleStrike().run()} title="취소선">
          <s>S</s>
        </button>
        <span className={styles.sep} />

        <button type="button" className={btn(s.bullet)} onClick={() => chain().toggleBulletList().run()} title="글머리 기호">
          <Icon d={ICONS.bullet} label="글머리 기호" />
        </button>
        <button type="button" className={btn(s.ordered)} onClick={() => chain().toggleOrderedList().run()} title="번호 매기기">
          <Icon d={ICONS.ordered} label="번호 매기기" />
        </button>
        <button type="button" className={btn(s.left)} onClick={() => chain().setTextAlign('left').run()} title="왼쪽 정렬">
          <Icon d={ICONS.alignLeft} label="왼쪽 정렬" />
        </button>
        <button type="button" className={btn(s.center)} onClick={() => chain().setTextAlign('center').run()} title="가운데 정렬">
          <Icon d={ICONS.alignCenter} label="가운데 정렬" />
        </button>
        <button type="button" className={btn(s.right)} onClick={() => chain().setTextAlign('right').run()} title="오른쪽 정렬">
          <Icon d={ICONS.alignRight} label="오른쪽 정렬" />
        </button>
        <button type="button" className={btn(s.quote)} onClick={() => chain().toggleBlockquote().run()} title="인용">
          <Icon d={ICONS.quote} label="인용" />
        </button>
        <button type="button" className={styles.tool} onClick={() => chain().setHorizontalRule().run()} title="구분선">
          <Icon d={ICONS.rule} label="구분선" />
        </button>
        <span className={styles.sep} />

        <button type="button" className={btn(s.link || form === 'link')} onClick={() => setForm(form === 'link' ? null : 'link')} title="링크">
          <Icon d={ICONS.link} label="링크" />
        </button>
        <button type="button" className={`${btn(form === 'image')} ${styles.toolWide}`} onClick={() => setForm(form === 'image' ? null : 'image')} title="이미지 넣기">
          <Icon d={ICONS.image} label="이미지" /> 이미지
        </button>
        <button type="button" className={`${btn(form === 'video')} ${styles.toolWide}`} onClick={() => setForm(form === 'video' ? null : 'video')} title="영상 넣기">
          <Icon d={ICONS.video} label="영상" /> 영상
        </button>
      </div>

      {form && (
        <MediaForm
          key={form}
          kind={form}
          initialUrl={form === 'link' ? s.linkHref : ''}
          onSubmit={submitMedia(form)}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}
