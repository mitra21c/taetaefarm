import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Placeholder from '../components/Placeholder';
import EmbedFrame from '../components/EmbedFrame';
import HtmlContent from '../components/HtmlContent';
import ProjectTree, { DB_ROOT_ID } from '../components/smartfarm/ProjectTree';
import DocEditor from '../components/editor/DocEditor';
import DocViewer from '../components/editor/DocViewer';
import comingSoon from '../assets/coming-soon.svg';
import { useAuthContext } from '../context/AuthContext';
import { SMART_FARM, SMART_FARM_SOURCE, type SmartFarmArea, type TreeNode } from '../data/smartFarm';
import { htmlFromText, parseProjectList, type FileNode } from '../data/projectList';
import {
  canEditSmartFarm, errorMessage, getFarmNode, getFarmNodes, toTreeNode, updateFarmNode,
} from '../api/smartFarm';
import styles from './SmartFarmPage.module.css';

// 스마트 팜 > 관수 자동화 / 양액기 자동화 (좌측 트리 + 내용)
//   /smart-farm/:area          첫 항목 (예: 관수 자동화 소개)
//   /smart-farm/:area/p/:id    선택한 항목
export default function SmartFarmPage() {
  const { area = '' } = useParams();
  const config = SMART_FARM[area];
  if (!config) return <Navigate to="/" replace />;
  return SMART_FARM_SOURCE === 'file'
    ? <FileSmartFarm area={area} config={config} />
    : <DbSmartFarm area={area} config={config} />;
}

/** 상위 폴더 경로 (예: 관수 자동화 › 프로젝트 › 2027 년도) */
function Breadcrumb({ title, nodes, node }: { title: string; nodes: TreeNode[]; node: TreeNode }) {
  const path: string[] = [];
  for (let p = nodes.find(n => n.id === node.parent_id); p; p = nodes.find(n => n.id === p!.parent_id)) {
    path.unshift(p.label);
  }
  if (path.length === 0) return null;
  return <p className={styles.breadcrumb}>{[title, ...path].join(' › ')}</p>;
}

const WorkInProgress = () => (
  <Placeholder image={comingSoon} imageAlt="새싹이 자라는 화분 그림" message="작업 중" />
);

// ─────────────── 파일 방식: public/projects/과제 리스트.txt + html.txt ───────────────

const publicUrl = (path: string) =>
  new URL(encodeURI(`${import.meta.env.BASE_URL}${path}`), window.location.origin).toString();

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { cache: 'no-cache' });
  // 개발 서버는 없는 파일에도 index.html 을 돌려주므로 HTML 문서면 '없음' 으로 본다
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || type.includes('text/html')) throw new Error(`파일을 찾을 수 없습니다: ${decodeURI(url)}`);
  return res.text();
}

function FileSmartFarm({ area, config }: { area: string; config: SmartFarmArea }) {
  const { nodeId } = useParams();
  const listUrl = config.listFile ? publicUrl(config.listFile) : null;

  const listQuery = useQuery({
    queryKey: ['projectList', listUrl],
    queryFn: async () => parseProjectList(await fetchText(listUrl!), listUrl!),
    enabled: !!listUrl,
    staleTime: 0,
  });

  // 리스트 파일이 없는 메뉴는 소개 항목 하나만
  const nodes: FileNode[] = listUrl
    ? listQuery.data ?? []
    : [{ id: 'intro', parent_id: null, node_type: 'page', label: config.introLabel, sort_order: 0 }];

  const pages = nodes.filter(n => n.node_type === 'page');
  const defaultId = pages[0]?.id ?? null;
  const activeId = nodeId ?? defaultId;
  const node = nodes.find(n => n.id === activeId && n.node_type === 'page');

  return (
    <div className={styles.page}>
      <ProjectTree
        area={area}
        title={config.title}
        nodes={nodes}
        loading={!!listUrl && listQuery.isLoading}
        loadError={!!listUrl && listQuery.isError}
        activeId={activeId}
        defaultId={defaultId}
        canEdit={false}
      />
      <section className={styles.content}>
        {listQuery.isError && listUrl ? (
          <p className={styles.error}>과제 리스트 파일을 읽지 못했습니다. (public/{config.listFile})</p>
        ) : nodeId && listQuery.isSuccess && !node ? (
          <Navigate to={`/smart-farm/${area}`} replace />
        ) : node ? (
          <>
            <Breadcrumb title={config.title} nodes={nodes} node={node} />
            <h1 className={styles.title}>{node.label}</h1>
            {node.url ? (
              <EmbedFrame url={node.url} title={node.label} contentWidth={config.frameWidth} />
            ) : node.file ? (
              <FileContent key={node.file} file={node.file} />
            ) : listUrl ? (
              <WorkInProgress />
            ) : (
              <Placeholder image={comingSoon} imageAlt="새싹이 자라는 화분 그림" message="준비 중" />
            )}
          </>
        ) : null}
      </section>
    </div>
  );
}

function FileContent({ file }: { file: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['projectHtml', file],
    queryFn: async () => htmlFromText(await fetchText(file), file),
    staleTime: 0,
  });
  if (isLoading) return <p className={styles.state}>불러오는 중…</p>;
  // 적어 둔 html.txt 가 아직 없으면 '작업 중'
  if (isError || !data?.trim()) return <WorkInProgress />;
  return (
    <div className={styles.doc}>
      <HtmlContent html={data} />
    </div>
  );
}

// ─────────────── DB 방식: smart_farm_nodes + 화면에서 내용 편집 ───────────────

function DbSmartFarm({ area, config }: { area: string; config: SmartFarmArea }) {
  const { nodeId } = useParams();
  const { user } = useAuthContext();
  const canEdit = canEditSmartFarm(user);
  const hasProjects = !!config.listFile;

  const nodesQuery = useQuery({
    queryKey: ['smartFarmNodes', area],
    queryFn: () => getFarmNodes(area),
    enabled: hasProjects,
  });

  // 소개 + 프로젝트(묶음) 아래에 서버 항목
  const nodes: TreeNode[] = [
    { id: 'intro', parent_id: null, node_type: 'page', label: config.introLabel, sort_order: 0, locked: true },
    ...(hasProjects
      ? [
          { id: DB_ROOT_ID, parent_id: null, node_type: 'folder' as const, label: '프로젝트', sort_order: 1, locked: true },
          ...(nodesQuery.data ?? []).map(n => {
            const t = toTreeNode(n);
            return { ...t, parent_id: t.parent_id ?? DB_ROOT_ID };
          }),
        ]
      : []),
  ];
  const activeId = nodeId ?? 'intro';

  return (
    <div className={styles.page}>
      <ProjectTree
        area={area}
        title={config.title}
        nodes={nodes}
        loading={hasProjects && nodesQuery.isLoading}
        loadError={hasProjects && nodesQuery.isError}
        activeId={activeId}
        defaultId="intro"
        canEdit={canEdit}
      />
      <section className={styles.content}>
        {activeId === 'intro' ? (
          <>
            <h1 className={styles.title}>{config.introLabel}</h1>
            <Placeholder image={comingSoon} imageAlt="새싹이 자라는 화분 그림" message="준비 중" />
          </>
        ) : (
          <DbContent key={activeId} id={Number(activeId)} title={config.title} nodes={nodes} canEdit={canEdit} />
        )}
      </section>
    </div>
  );
}

function DbContent({ id, title, nodes, canEdit }: {
  id: number;
  title: string;
  nodes: TreeNode[];
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['smartFarmNode', id],
    queryFn: () => getFarmNode(id),
    enabled: id > 0,
  });

  const saveMutation = useMutation({
    mutationFn: (content: string) => updateFarmNode(id, { content }),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['smartFarmNode', id] });
    },
    onError: err => setSaveError(errorMessage(err, '저장하지 못했습니다.')),
  });

  // 편집 중에 창을 닫거나 새로고침하면 확인
  useEffect(() => {
    if (!editing) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [editing]);

  if (!(id > 0)) return <p className={styles.state}>항목을 찾을 수 없습니다.</p>;
  if (isLoading) return <p className={styles.state}>불러오는 중…</p>;
  if (isError || !data) return <p className={styles.state}>항목을 찾을 수 없습니다.</p>;

  const treeNode = nodes.find(n => n.id === String(id));
  const updated = data.modified_at ?? data.created_at;

  return (
    <>
      {treeNode && <Breadcrumb title={title} nodes={nodes} node={treeNode} />}
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{data.label}</h1>
        {canEdit && data.node_type === 'page' && !editing && (
          <button type="button" className={styles.editBtn} onClick={() => { setSaveError(''); setEditing(true); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />
            </svg>
            내용 편집
          </button>
        )}
      </div>
      {updated && !editing && (
        <p className={styles.meta}>
          {data.modified_at ? '수정' : '등록'} {new Date(updated).toLocaleDateString('ko-KR')}
        </p>
      )}

      {editing ? (
        <>
          {saveError && <p className={styles.error} role="alert">{saveError}</p>}
          <DocEditor
            initialHtml={data.content ?? ''}
            saving={saveMutation.isPending}
            onSave={html => { setSaveError(''); saveMutation.mutate(html); }}
            onCancel={() => setEditing(false)}
          />
        </>
      ) : data.content ? (
        <div className={styles.doc}>
          <DocViewer html={data.content} />
        </div>
      ) : (
        <Placeholder image={comingSoon} imageAlt="새싹이 자라는 화분 그림" message="준비 중" />
      )}
    </>
  );
}
