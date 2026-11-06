import editorStyles from './editor/Editor.module.css';

/**
 * 과제 html.txt 처럼 저장소에 있는 HTML 을 그대로 보여 준다 (data/projectList.ts 의 htmlFromText 로 정리된 것).
 * 이미지를 누르면 새 탭에서 원본 크기로 연다 (회로도·배치도 확대용).
 */
export default function HtmlContent({ html }: { html: string }) {
  const openImage = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target instanceof HTMLImageElement && target.src && !target.closest('a')) {
      window.open(target.src, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={`${editorStyles.doc} ${editorStyles.docReadonly}`}
      onClick={openImage}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
