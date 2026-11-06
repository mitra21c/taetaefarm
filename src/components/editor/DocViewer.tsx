import { useMemo } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { createExtensions } from './extensions';
import styles from './Editor.module.css';

/**
 * 저장된 HTML 을 읽기 전용으로 보여 준다.
 * 편집기와 같은 규칙(스키마)으로 다시 해석하므로 허용된 태그만 화면에 나온다 (스크립트 등은 버려짐).
 * 이미지를 누르면 새 탭에서 원본 크기로 연다 (회로도·배치도 확대용).
 */
export default function DocViewer({ html }: { html: string }) {
  const extensions = useMemo(() => createExtensions(false), []);
  const editor = useEditor({
    extensions,
    content: html,
    editable: false,
    editorProps: { attributes: { class: `${styles.doc} ${styles.docReadonly}` } },
  }, [html]);

  const openImage = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target instanceof HTMLImageElement && target.src) {
      window.open(target.src, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div onClick={openImage}>
      <EditorContent editor={editor} />
    </div>
  );
}
