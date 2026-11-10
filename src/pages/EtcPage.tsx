import { Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Placeholder from '../components/Placeholder';
import EmbedFrame from '../components/EmbedFrame';
import HtmlContent from '../components/HtmlContent';
import ProjectTree from '../components/smartfarm/ProjectTree';
import etcImage from '../assets/etc-docs.svg';
import comingSoon from '../assets/coming-soon.svg';
import { fetchText, htmlFromText, parseProjectList, publicUrl } from '../data/projectList';
import styles from './EtcPage.module.css';

// 기타 자료 (좌측 트리 + 내용)
//   트리: public/etc/menu.txt (형식은 public/projects/과제 리스트.txt 와 같음)
//     - 방송통신 대학교
//           └ 형성 평가 자료 : https://...
//   /etc            아무 항목도 고르지 않은 화면
//   /etc/p/:nodeId  선택한 항목의 링크(사이트)를 표시 (주소·새 창 열기 막대는 숨김)
const TITLE = '기타 자료';
const MENU_FILE = 'etc/menu.txt';

export default function EtcPage() {
  const { nodeId } = useParams();
  const listUrl = publicUrl(MENU_FILE);

  const listQuery = useQuery({
    queryKey: ['etcMenu', listUrl],
    queryFn: async () => parseProjectList(await fetchText(listUrl), listUrl),
    staleTime: 0,
  });

  const nodes = listQuery.data ?? [];
  const node = nodeId ? nodes.find(n => n.id === nodeId && n.node_type === 'page') : undefined;

  return (
    <div className={styles.page}>
      <ProjectTree
        area="etc"
        title={TITLE}
        nodes={nodes}
        loading={listQuery.isLoading}
        loadError={listQuery.isError}
        activeId={nodeId ?? null}
        defaultId={null}
        canEdit={false}
        basePath="/etc"
      />
      <section className={styles.content}>
        {listQuery.isError ? (
          <p className={styles.error}>메뉴 파일을 읽지 못했습니다. (public/{MENU_FILE})</p>
        ) : nodeId && listQuery.isSuccess && !node ? (
          <Navigate to="/etc" replace />
        ) : node ? (
          <>
            <Breadcrumb nodes={nodes} id={node.id} />
            <h1 className={styles.title}>{node.label}</h1>
            {node.url ? (
              <EmbedFrame url={node.url} title={node.label} hideBar />
            ) : node.file ? (
              <FileContent key={node.file} file={node.file} />
            ) : (
              <WorkInProgress />
            )}
          </>
        ) : !nodeId ? (
          <Placeholder image={etcImage} imageAlt="자료를 정리하는 폴더 그림" message="웹 서버 구축 중입니다" />
        ) : null}
      </section>
    </div>
  );
}

const WorkInProgress = () => (
  <Placeholder image={comingSoon} imageAlt="새싹이 자라는 화분 그림" message="작업 중" />
);

/** 상위 폴더 경로 (예: 기타 자료 › 방송통신 대학교) */
function Breadcrumb({ nodes, id }: { nodes: { id: string; parent_id: string | null; label: string }[]; id: string }) {
  const path: string[] = [];
  let p = nodes.find(n => n.id === nodes.find(x => x.id === id)?.parent_id);
  while (p) {
    path.unshift(p.label);
    const parentId: string | null = p.parent_id;
    p = nodes.find(n => n.id === parentId);
  }
  return <p className={styles.breadcrumb}>{[TITLE, ...path].join(' › ')}</p>;
}

/** 링크 대신 html.txt 경로를 적은 항목 */
function FileContent({ file }: { file: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['etcHtml', file],
    queryFn: async () => htmlFromText(await fetchText(file), file),
    staleTime: 0,
  });
  if (isLoading) return <p className={styles.state}>불러오는 중…</p>;
  if (isError || !data?.trim()) return <WorkInProgress />;
  return (
    <div className={styles.doc}>
      <HtmlContent html={data} />
    </div>
  );
}
