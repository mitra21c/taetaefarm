import { useMemo } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import Toolbar from './Toolbar';
import { createExtensions } from './extensions';
import styles from './Editor.module.css';

interface Props {
  initialHtml: string;
  saving: boolean;
  onSave: (html: string) => void;
  onCancel: () => void;
}

/** 워드 같은 문서 편집기 (텍스트 서식 + 이미지·영상 URL) */
export default function DocEditor({ initialHtml, saving, onSave, onCancel }: Props) {
  const extensions = useMemo(() => createExtensions(true), []);
  const editor = useEditor({
    extensions,
    content: initialHtml || '',
    editorProps: { attributes: { class: styles.doc, 'aria-label': '문서 내용' } },
  });

  if (!editor) return null;

  const save = () => onSave(editor.isEmpty ? '' : editor.getHTML());

  return (
    <div className={styles.editor}>
      <Toolbar editor={editor} />
      <div className={styles.docFrame} onClick={e => { if (e.target === e.currentTarget) editor.commands.focus('end'); }}>
        <EditorContent editor={editor} />
      </div>
      <div className={styles.footer}>
        <span className={styles.footerHelp}>이미지·영상은 GitHub 에 올린 파일 주소로 넣습니다.</span>
        <button type="button" className={styles.btnGhost} onClick={onCancel} disabled={saving}>취소</button>
        <button type="button" className={styles.btnPrimary} onClick={save} disabled={saving}>
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  );
}
