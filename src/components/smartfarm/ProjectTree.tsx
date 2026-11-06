import { useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFarmNode, deleteFarmNode, errorMessage, updateFarmNode } from '../../api/smartFarm';
import { SMART_FARM_SOURCE, type FarmNodeType, type TreeNode } from '../../data/smartFarm';
import styles from './ProjectTree.module.css';

interface Props {
  area: string;
  title: string;
  /** 최상위 항목부터 모두 (예: 관수 자동화 소개, 프로젝트 › 2027 년도 › …) */
  nodes: TreeNode[];
  loading: boolean;
  loadError: boolean;
  /** 지금 보고 있는 항목 */
  activeId: string | null;
  /** 주소에 id 가 없을 때 보여 주는 항목 (이 항목은 /smart-farm/:area 로 연결) */
  defaultId: string | null;
  canEdit: boolean;
}

/** DB 모드에서 '프로젝트' 묶음의 id (서버에는 parent_id = null) */
export const DB_ROOT_ID = 'root';
const toServerParent = (id: string | null) => (id === null || id === DB_ROOT_ID ? null : Number(id));

// 좌측 트리 편집(추가·이름 변경·삭제)은 추후 구현 예정이라 잠시 끈다.
// TREE_EDIT_FEATURE 를 true 로 바꾸면 편집 버튼이 다시 나타난다 (DB 모드: src/data/smartFarm.ts 의 SMART_FARM_SOURCE = 'db' 일 때만).
const TREE_EDIT_FEATURE: boolean = false;
const TREE_EDIT_ENABLED = TREE_EDIT_FEATURE && SMART_FARM_SOURCE === 'db';
const keyOf = (id: string) => `n${id}`;

// 작은 아이콘
const I = {
  plus: 'M12 5v14M5 12h14',
  pencil: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  folder: 'M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  page: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
};
const Svg = ({ d, size = 15 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

// ── 이름 입력 폼 (추가·이름 변경 공용) ──
function NameForm({ initial, withType, busy, onSubmit, onCancel }: {
  initial: string;
  withType: boolean;
  busy: boolean;
  onSubmit: (label: string, type: FarmNodeType) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(initial);
  const [type, setType] = useState<FarmNodeType>('page');
  return (
    <form
      className={styles.form}
      onSubmit={e => { e.preventDefault(); if (label.trim()) onSubmit(label.trim(), type); }}
      onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
    >
      {withType && (
        <div className={styles.segment} role="radiogroup" aria-label="종류">
          {(['folder', 'page'] as const).map(t => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              className={type === t ? `${styles.segBtn} ${styles.segOn}` : styles.segBtn}
              onClick={() => setType(t)}
            >
              <Svg d={t === 'folder' ? I.folder : I.page} size={13} />
              {t === 'folder' ? '폴더' : '프로젝트'}
            </button>
          ))}
        </div>
      )}
      <input
        autoFocus
        className={styles.input}
        value={label}
        maxLength={100}
        placeholder={withType ? (type === 'folder' ? '예: 2028년도' : '예: 전남 장성 뒷밭') : '이름'}
        aria-label="이름"
        onChange={e => setLabel(e.target.value)}
      />
      <div className={styles.formActions}>
        <button type="button" className={styles.btnGhost} onClick={onCancel}>취소</button>
        <button type="submit" className={styles.btnPrimary} disabled={busy || !label.trim()}>
          {withType ? '추가' : '저장'}
        </button>
      </div>
    </form>
  );
}

type Editing =
  | { mode: 'add'; parentId: string | null }
  | { mode: 'rename'; id: string }
  | { mode: 'delete'; id: string }
  | null;

export default function ProjectTree({
  area, title, nodes, loading, loadError, activeId, defaultId, canEdit,
}: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // 펼친 묶음 (처음에는 모두 닫힘)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [editMode, setEditMode] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState('');

  const children = useMemo(() => {
    const map = new Map<string | null, TreeNode[]>();
    for (const n of nodes) {
      const list = map.get(n.parent_id) ?? [];
      list.push(n);
      map.set(n.parent_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id, undefined, { numeric: true }));
    return map;
  }, [nodes]);

  const countDescendants = (id: string): number =>
    (children.get(id) ?? []).reduce((sum, c) => sum + 1 + countDescendants(c.id), 0);

  const isUnder = (id: string, ancestor: string): boolean => {
    let cur = nodes.find(n => n.id === id);
    while (cur) {
      if (cur.parent_id === ancestor) return true;
      cur = nodes.find(n => n.id === cur!.parent_id);
    }
    return false;
  };

  const open = (key: string) => setExpanded(prev => new Set(prev).add(key));
  const toggle = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['smartFarmNodes', area] });

  const addMutation = useMutation({
    mutationFn: (v: { parent_id: string | null; node_type: FarmNodeType; label: string }) =>
      createFarmNode(area, { ...v, parent_id: toServerParent(v.parent_id) }),
    onSuccess: node => {
      setEditing(null);
      refresh();
      if (node.node_type === 'page') navigate(`/smart-farm/${area}/p/${node.id}`);
    },
    onError: err => setError(errorMessage(err)),
  });

  const renameMutation = useMutation({
    mutationFn: (v: { id: string; label: string }) => updateFarmNode(Number(v.id), { label: v.label }),
    onSuccess: (_d, v) => {
      setEditing(null);
      refresh();
      queryClient.invalidateQueries({ queryKey: ['smartFarmNode', Number(v.id)] });
    },
    onError: err => setError(errorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFarmNode(Number(id)),
    onSuccess: (_d, id) => {
      setEditing(null);
      // 보고 있던 항목(또는 그 상위)을 지웠으면 소개 화면으로
      if (activeId !== null && (activeId === id || isUnder(activeId, id))) navigate(`/smart-farm/${area}`);
      refresh();
    },
    onError: err => setError(errorMessage(err)),
  });

  const busy = addMutation.isPending || renameMutation.isPending || deleteMutation.isPending;

  const startAdd = (parentId: string) => {
    setError('');
    setEditing({ mode: 'add', parentId });
    open(keyOf(parentId));
  };

  const pageLink = (id: string) =>
    id === defaultId ? `/smart-farm/${area}` : `/smart-farm/${area}/p/${encodeURIComponent(id)}`;

  const addForm = (parentId: string | null) =>
    editing?.mode === 'add' && editing.parentId === parentId && (
      <li className={styles.branch}>
        <NameForm
          initial=""
          withType
          busy={busy}
          onCancel={() => setEditing(null)}
          onSubmit={(label, node_type) => addMutation.mutate({ parent_id: parentId, node_type, label })}
        />
      </li>
    );

  const renderNodes = (parentId: string | null) => {
    const list = children.get(parentId) ?? [];
    const depth0 = parentId === null;
    return (
      <ul className={depth0 ? styles.tree : styles.subtree} role={depth0 ? 'tree' : 'group'}>
        {list.map(node => {
          const key = keyOf(node.id);
          const isFolder = node.node_type === 'folder';
          const kids = children.get(node.id) ?? [];
          const isOpen = isFolder && expanded.has(key);

          if (editing?.mode === 'rename' && editing.id === node.id) {
            return (
              <li key={key} className={depth0 ? undefined : styles.branch}>
                <NameForm initial={node.label} withType={false} busy={busy}
                          onCancel={() => setEditing(null)}
                          onSubmit={label => renameMutation.mutate({ id: node.id, label })} />
              </li>
            );
          }

          if (editing?.mode === 'delete' && editing.id === node.id) {
            const n = countDescendants(node.id);
            return (
              <li key={key} className={depth0 ? undefined : styles.branch}>
                <div className={styles.confirm}>
                  <p>
                    <b>{node.label}</b> 을(를) 삭제할까요?
                    {n > 0 && <><br />하위 항목 {n}개도 함께 삭제됩니다.</>}
                  </p>
                  <div className={styles.formActions}>
                    <button type="button" className={styles.btnGhost} onClick={() => setEditing(null)}>취소</button>
                    <button type="button" className={styles.btnDanger} disabled={busy}
                            onClick={() => deleteMutation.mutate(node.id)}>삭제</button>
                  </div>
                </div>
              </li>
            );
          }

          return (
            <li key={key} className={depth0 ? undefined : styles.branch} role="treeitem" aria-expanded={isFolder ? isOpen : undefined}>
              <div className={styles.row}>
                {isFolder ? (
                  <button type="button" className={styles.toggle} onClick={() => toggle(key)}
                          aria-label={`${node.label} ${isOpen ? '접기' : '펼치기'}`}>
                    {isOpen ? '−' : '+'}
                  </button>
                ) : (
                  <span className={styles.toggleSpacer} aria-hidden="true" />
                )}

                {isFolder ? (
                  <button type="button" className={styles.group} onClick={() => toggle(key)}>
                    {node.label}
                  </button>
                ) : (
                  <NavLink
                    to={pageLink(node.id)}
                    end
                    className={() => (node.id === activeId ? `${styles.item} ${styles.itemActive}` : styles.item)}
                  >
                    {node.label}
                  </NavLink>
                )}

                {editMode && (isFolder || !node.locked) && (
                  <span className={styles.actions}>
                    {isFolder && (
                      <button type="button" className={styles.iconBtn} title="하위 항목 추가"
                              aria-label={`${node.label} 아래에 추가`} onClick={() => startAdd(node.id)}>
                        <Svg d={I.plus} />
                      </button>
                    )}
                    {!node.locked && <button type="button" className={styles.iconBtn} title="이름 변경"
                            aria-label={`${node.label} 이름 변경`}
                            onClick={() => { setError(''); setEditing({ mode: 'rename', id: node.id }); }}>
                      <Svg d={I.pencil} />
                    </button>}
                    {!node.locked && <button type="button" className={`${styles.iconBtn} ${styles.iconDanger}`} title="삭제"
                            aria-label={`${node.label} 삭제`}
                            onClick={() => { setError(''); setEditing({ mode: 'delete', id: node.id }); }}>
                      <Svg d={I.trash} />
                    </button>}
                  </span>
                )}
              </div>
              {isOpen && renderNodes(node.id)}
              {isOpen && kids.length === 0 && !(editing?.mode === 'add' && editing.parentId === node.id) && (
                <p className={`${styles.note} ${styles.noteIndent}`}>비어 있음</p>
              )}
            </li>
          );
        })}
        {addForm(parentId)}
      </ul>
    );
  };

  return (
    <aside className={styles.aside} aria-label={`${title} 메뉴`}>
      <div className={styles.head}>
        <p className={styles.asideTitle}>{title}</p>
        {TREE_EDIT_ENABLED && canEdit && (
          <button
            type="button"
            className={editMode ? `${styles.editToggle} ${styles.editToggleOn}` : styles.editToggle}
            onClick={() => { setEditMode(v => !v); setEditing(null); setError(''); }}
          >
            {editMode ? '편집 완료' : '편집'}
          </button>
        )}
      </div>

      {renderNodes(null)}
      {loading && <p className={styles.note}>불러오는 중…</p>}
      {loadError && <p className={styles.noteError}>목록을 불러오지 못했습니다.</p>}

      {editMode && (
        <p className={styles.hint}>
          <Svg d={I.plus} size={12} /> 추가 · <Svg d={I.pencil} size={12} /> 이름 변경 · <Svg d={I.trash} size={12} /> 삭제
        </p>
      )}
      {error && <p className={styles.noteError} role="alert">{error}</p>}
    </aside>
  );
}
