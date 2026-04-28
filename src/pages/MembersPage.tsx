import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { useAuthContext } from '../context/AuthContext';
import { getAllUsers, updateUser, deleteUser, bulkUploadUsers } from '../api/auth';
import type { UserInfo } from '../api/auth';
import styles from './MembersPage.module.css';

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });

type SortKey = 'name' | 'phone' | 'email' | 'address' | 'role' | 'reference_email' | 'referrer_name' | 'use' | 'created_at';
type SortDir = 'asc' | 'desc';

export default function MembersPage() {
  const { user, isAuthenticated } = useAuthContext();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingRole, setPendingRole] = useState<Record<number, string>>({});
  const [pendingUse, setPendingUse]   = useState<Record<number, string>>({});
  const [search, setSearch]           = useState('');
  const [sortKey, setSortKey]         = useState<SortKey | null>(null);
  const [sortDir, setSortDir]         = useState<SortDir>('asc');

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
    else if (!isAdmin) navigate('/');
  }, [isAuthenticated, isAdmin, navigate]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['allUsers'],
    queryFn: getAllUsers,
    enabled: isAdmin,
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const processed = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    let rows = q
      ? data.filter(m =>
          [m.name, m.phone, m.email, m.address, m.post, m.role,
           m.reference_email ?? '', m.referrer_name ?? '', m.referrer_phone ?? '']
            .some(v => v.toLowerCase().includes(q))
        )
      : data;
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = String((a as any)[sortKey] ?? '');
        const bv = String((b as any)[sortKey] ?? '');
        const cmp = av.localeCompare(bv, 'ko');
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [data, search, sortKey, sortDir]);

  const updateMutation = useMutation({
    mutationFn: ({ id, role, use }: { id: number; role?: string; use?: string }) =>
      updateUser(id, { role, use }),
    onSuccess: (_: void, { id }: { id: number }) => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      setPendingRole(prev => { const n = { ...prev }; delete n[id]; return n; });
      setPendingUse(prev =>  { const n = { ...prev }; delete n[id]; return n; });
    },
    onError: () => alert('수정 중 오류가 발생했습니다.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allUsers'] }),
    onError: () => alert('삭제 중 오류가 발생했습니다.'),
  });

  const bulkMutation = useMutation({
    mutationFn: (users: Array<Record<string, string>>) => bulkUploadUsers(users),
    onSuccess: (res) => {
      alert(res.message);
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
    onError: () => alert('업로드 중 오류가 발생했습니다.'),
  });

  const handleSave = (member: UserInfo) => {
    updateMutation.mutate({
      id: member.id,
      role: pendingRole[member.id] ?? member.role,
      use:  pendingUse[member.id]  ?? member.use,
    });
  };

  const handleDelete = (id: number, name: string) => {
    if (id === user?.id) { alert('본인 계정은 삭제할 수 없습니다.'); return; }
    if (!confirm(`'${name}' 회원을 삭제하시겠습니까?`)) return;
    deleteMutation.mutate(id);
  };

  // ── Excel 다운로드
  const handleDownload = () => {
    if (!data || data.length === 0) return;
    const rows = data.map((m, i) => ({
      '순번': i + 1,
      '이름': m.name,
      '전화번호': m.phone,
      '이메일': m.email,
      '주소': m.address,
      '우편번호': m.post,
      '권한': m.role,
      '추천인이메일': m.reference_email ?? '',
      '추천인성명': m.referrer_name ?? '',
      '추천인연락처': m.referrer_phone ?? '',
      '승인': m.use,
      '생성일': fmt(m.created_at),
      '수정일': m.modified_at ? fmt(m.modified_at) : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '회원정보');
    XLSX.writeFile(wb, `회원정보_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ── Excel 업로드
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
      const users = rows.map(r => ({
        name:            String(r['이름']         ?? ''),
        phone:           String(r['전화번호']      ?? ''),
        email:           String(r['이메일']        ?? ''),
        address:         String(r['주소']          ?? ''),
        post:            String(r['우편번호']      ?? ''),
        role:            String(r['권한']          ?? 'user'),
        pass:            String(r['비밀번호']      ?? ''),
        reference_email: String(r['추천인이메일']  ?? ''),
        use:             String(r['승인']          ?? 'N'),
      }));
      bulkMutation.mutate(users);
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const thSort = (key: SortKey, label: string) => (
    <th className={styles.thSortable} onClick={() => handleSort(key)}>
      {label}
      <span className={styles.sortIcon}>
        {sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
      </span>
    </th>
  );

  if (!isAdmin) return null;

  return (
    <div className={styles.container}>
      <div className={styles.inner}>

        {/* 헤더 */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>
            <span className={styles.titleIcon}>👥</span>
            회원 정보 현황
          </h1>
          <div className={styles.headerRight}>
            {data && <span className={styles.totalBadge}>총 {data.length}명</span>}
            <button className={styles.refreshBtn} onClick={() => refetch()} disabled={isLoading}>
              회원 정보
            </button>
            <button className={styles.excelBtn} onClick={handleDownload} disabled={!data || data.length === 0}>
              엑셀 다운로드
            </button>
            <button className={styles.excelUploadBtn} onClick={() => fileInputRef.current?.click()} disabled={bulkMutation.isPending}>
              엑셀 업로드
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleUpload} />
          </div>
        </div>

        {/* 검색 */}
        <div className={styles.searchWrap}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="이름, 전화번호, 이메일, 주소, 권한, 추천인 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className={styles.searchClear} onClick={() => setSearch('')}>✕</button>}
        </div>

        {isLoading && (
          <div className={styles.stateBox}>
            <span className={styles.spinner} />
            <p>회원 정보를 불러오는 중...</p>
          </div>
        )}
        {isError && (
          <div className={styles.errorBox}>
            회원 정보를 불러올 수 없습니다. 서버 연결을 확인해 주세요.
          </div>
        )}
        {!isLoading && !isError && processed.length === 0 && (
          <div className={styles.stateBox}>
            <p>{search ? '검색 결과가 없습니다.' : '등록된 회원이 없습니다.'}</p>
          </div>
        )}

        {processed.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>순번</th>
                  {thSort('name',             '이름')}
                  {thSort('phone',            '전화번호')}
                  {thSort('email',            'E-Mail')}
                  {thSort('address',          '주소/우편번호')}
                  {thSort('role',             '권한')}
                  {thSort('reference_email',  '추천인 E-Mail')}
                  {thSort('referrer_name',    '추천인 성명/연락처')}
                  {thSort('use',              '승인')}
                  {thSort('created_at',       '생성일/수정일')}
                  <th>수정</th>
                  <th>삭제</th>
                </tr>
              </thead>
              <tbody>
                {processed.map((member, idx) => {
                  const currentRole = pendingRole[member.id] ?? member.role;
                  const currentUse  = pendingUse[member.id]  ?? member.use;
                  const isDirty     = !!(pendingRole[member.id] || pendingUse[member.id]);
                  const hasReferrer = !!(member.reference_email);

                  return (
                    <tr key={member.id}>
                      <td className={styles.tdNo}>{idx + 1}</td>
                      <td className={styles.tdBold}>{member.name}</td>
                      <td className={styles.tdSub}>{member.phone}</td>
                      <td className={styles.tdEmail}>{member.email}</td>

                      {/* 주소/우편번호 2줄 */}
                      <td>
                        <span className={styles.line1}>{member.address}</span>
                        <span className={styles.line2}>{member.post}</span>
                      </td>

                      {/* 권한 select */}
                      <td className={styles.tdCenter}>
                        <select
                          className={`${styles.roleSelect} ${
                            currentRole === 'admin'   ? styles.roleSelectAdmin :
                            currentRole === 'manager' ? styles.roleSelectManager :
                            styles.roleSelectUser
                          }`}
                          value={currentRole}
                          onChange={e => setPendingRole(prev => ({ ...prev, [member.id]: e.target.value }))}
                        >
                          <option value="user">일반 회원</option>
                          <option value="manager">매니저</option>
                          <option value="admin">관리자</option>
                        </select>
                      </td>

                      {/* 추천인 E-Mail */}
                      <td className={styles.tdEmail}>{member.reference_email || '—'}</td>

                      {/* 추천인 성명/연락처 2줄 */}
                      <td>
                        {member.referrer_name ? (
                          <>
                            <span className={styles.line1}>{member.referrer_name}</span>
                            <span className={styles.line2}>{member.referrer_phone ?? ''}</span>
                          </>
                        ) : (
                          <span className={styles.tdSub}>—</span>
                        )}
                      </td>

                      {/* 승인 */}
                      <td className={styles.tdCenter}>
                        <select
                          className={`${styles.useSelect} ${currentUse === 'Y' ? styles.useSelectY : styles.useSelectN}`}
                          value={currentUse ?? 'N'}
                          onChange={e => setPendingUse(prev => ({ ...prev, [member.id]: e.target.value }))}
                        >
                          <option value="Y">Y</option>
                          <option value="N">N</option>
                        </select>
                      </td>

                      {/* 생성일/수정일 2줄 */}
                      <td>
                        <span className={styles.line1}>{fmt(member.created_at)}</span>
                        <span className={styles.line2}>{member.modified_at ? fmt(member.modified_at) : '—'}</span>
                      </td>

                      {/* 수정 버튼 */}
                      <td className={styles.tdCenter}>
                        <button
                          className={styles.saveBtn}
                          disabled={!isDirty || updateMutation.isPending}
                          onClick={() => handleSave(member)}
                        >
                          수정
                        </button>
                      </td>

                      {/* 삭제 버튼 (추천인 E-Mail 있는 경우만) */}
                      <td className={styles.tdCenter}>
                        {hasReferrer && (
                          <button
                            className={styles.deleteBtn}
                            disabled={deleteMutation.isPending}
                            onClick={() => handleDelete(member.id, member.name)}
                          >
                            삭제
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
