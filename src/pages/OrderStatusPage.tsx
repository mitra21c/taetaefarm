import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useAuthContext } from '../context/AuthContext';
import { getOrders, updateOrderStatus } from '../api/auth';
import styles from './OrderStatusPage.module.css';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2023 }, (_, i) => 2024 + i);
const PRODUCTS = ['블루베리', '태추', '대봉', '감 말랭이', '울금'];

const STATUS_OPTIONS = ['주문대기', '주문완료', '배송중', '입금완료', '판매불가'];

const STATUS_CLASS: Record<string, string> = {
  '주문대기': 'statusReceived',
  '주문완료': 'statusPreparing',
  '배송중':   'statusShipping',
  '입금완료': 'statusDone',
  '판매불가': 'statusCanceled',
};

type SortKey =
  | 'name' | 'order_item' | 'receiver_name'
  | 'delivery_status' | 'created_at' | 'reference_name';
type SortDir = 'asc' | 'desc';

interface Order {
  id: number;
  name: string;
  phone: string;
  email: string;
  order_item: string;
  order_weight: number;
  order_price: number;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  receiver_post: string;
  reference_name: string;
  delivery_status: string;
  created_at: string;
  orderer_role: string;
}

export default function OrderStatusPage() {
  const { user, isAuthenticated } = useAuthContext();
  const isAdmin   = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const canSeeAll = isAdmin || isManager;

  const canEdit = (order: Order) =>
    isAdmin || (isManager && order.orderer_role !== 'admin');

  const [year, setYear]       = useState(CURRENT_YEAR);
  const [product, setProduct] = useState('');
  const [orders, setOrders]           = useState<Order[]>([]);
  const [pendingStatus, setPendingStatus] = useState<Record<number, string>>({});
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [sortKey, setSortKey]         = useState<SortKey | null>(null);
  const [sortDir, setSortDir]         = useState<SortDir>('asc');
  const [search, setSearch]           = useState('');
  const [popup, setPopup]             = useState<'smsError' | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    setLoading(true);
    setError('');
    const params = canSeeAll ? { year } : { email: user.email, year };
    getOrders(params)
      .then(data => {
        setOrders(data);
        setPendingStatus({});
      })
      .catch(() => setError('데이터를 불러오는 중 오류가 발생했습니다.'))
      .finally(() => setLoading(false));
  }, [year, isAuthenticated, user]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const processed = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = orders;
    if (product) rows = rows.filter(o => o.order_item?.includes(product));
    if (q) rows = rows.filter(o =>
      [o.name, o.phone, o.email, o.order_item,
       o.receiver_name, o.receiver_phone, o.receiver_address,
       o.receiver_post, o.reference_name, o.delivery_status]
        .some(v => (v ?? '').toLowerCase().includes(q))
    );

    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = String((a as any)[sortKey] ?? '');
        const bv = String((b as any)[sortKey] ?? '');
        const cmp = av.localeCompare(bv, 'ko');
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [orders, product, search, sortKey, sortDir]);

  const handleStatusSelect = (orderId: number, val: string) => {
    setPendingStatus(prev => ({ ...prev, [orderId]: val }));
  };

  const handleSave = async (order: Order) => {
    const status = pendingStatus[order.id] ?? order.delivery_status;
    try {
      const result = await updateOrderStatus(order.id, status);
      setOrders(prev =>
        prev.map(o => o.id === order.id ? { ...o, delivery_status: status } : o)
      );
      setPendingStatus(prev => { const n = { ...prev }; delete n[order.id]; return n; });
      if (result.smsError) setPopup('smsError');
    } catch {
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  const handleDownload = () => {
    if (processed.length === 0) return;
    const rows = processed.map((o, i) => ({
      '순번':       i + 1,
      '주문자 성명': o.name,
      '주문자 연락처': o.phone,
      '상품명':     o.order_item,
      '무게(Kg)':   o.order_weight,
      '가격(원)':   o.order_price,
      '수신자 성명': o.receiver_name,
      '수신자 연락처': o.receiver_phone,
      '수신자 주소': o.receiver_address,
      '우편번호':   o.receiver_post,
      '주문일':     new Date(o.created_at).toLocaleDateString('ko-KR'),
      '추천인':     o.reference_name || '',
      '진행 상태':  o.delivery_status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '주문현황');
    XLSX.writeFile(wb, `주문현황_${year}년_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const thSort = (key: SortKey, label: string) => (
    <th className={styles.thSortable} onClick={() => handleSort(key)}>
      {label}
      <span className={styles.sortIcon}>
        {sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
      </span>
    </th>
  );

  if (!isAuthenticated) {
    return (
      <main className={styles.main}>
        <div className={styles.inner}>
          <div className={styles.emptyBox}>
            <span className={styles.icon}>📦</span>
            <p>로그인 후 주문 내역을 확인할 수 있습니다.</p>
            <Link to="/login" className={styles.actionBtn}>로그인하기</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      {popup === 'smsError' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}
             onClick={() => setPopup(null)}>
          <div style={{ background:'#fff', borderRadius:'0.75rem', padding:'2rem 1.75rem', maxWidth:'22rem', width:'90%', textAlign:'center', boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}
               onClick={e => e.stopPropagation()}>
            <p style={{ fontSize:'2rem', margin:'0 0 0.5rem' }}>⚠️</p>
            <h3 style={{ margin:'0 0 0.75rem', fontSize:'1.1rem' }}>SMS 발송 오류</h3>
            <p style={{ margin:'0 0 1.25rem', lineHeight:1.6, color:'#555' }}>
              주문 상태 변경은 완료되었습니다.<br />SMS 발송에 실패하였습니다.<br />(관리자에게 문의 하세요.)
            </p>
            <button onClick={() => setPopup(null)}
                    style={{ padding:'0.5rem 1.5rem', background:'#e53e3e', color:'#fff', border:'none', borderRadius:'0.375rem', cursor:'pointer', fontWeight:600 }}>
              확인
            </button>
          </div>
        </div>
      )}

      <div className={styles.inner}>

        {/* 툴바 */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <h1 className={styles.title}>주문 현황</h1>
            <select
              className={styles.yearSelect}
              value={year}
              onChange={e => setYear(Number(e.target.value))}
            >
              {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select
              className={styles.yearSelect}
              value={product}
              onChange={e => setProduct(e.target.value)}
            >
              <option value="">전체 상품</option>
              {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button
            className={styles.excelBtn}
            onClick={handleDownload}
            disabled={processed.length === 0}
          >
            엑셀 다운로드
          </button>
        </div>

        {/* 검색 */}
        <div className={styles.searchWrap}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="주문자, 상품명, 수신자, 주소, 상태, 추천인 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.searchClear} onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        {loading && <p className={styles.stateMsg}>불러오는 중…</p>}
        {error   && <p className={styles.errorMsg}>{error}</p>}

        {!loading && !error && processed.length === 0 && (
          <div className={styles.emptyBox}>
            <span className={styles.icon}>📭</span>
            <p>{search ? '검색 결과가 없습니다.' : `${year}년 주문 내역이 없습니다.`}</p>
            {!search && <Link to="/order" className={styles.actionBtn}>주문하러 가기</Link>}
          </div>
        )}

        {!loading && !error && processed.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>순번</th>
                  {thSort('name',            '주문자')}
                  {thSort('order_item',      '상품 정보')}
                  {thSort('receiver_name',   '수신자 성명/연락처')}
                  <th>수신자 주소/우편번호</th>
                  {thSort('created_at',      '주문일')}
                  {thSort('reference_name',  '추천인')}
                  {thSort('delivery_status', '진행 상태')}
                  {canSeeAll && <th>수정</th>}
                </tr>
              </thead>
              <tbody>
                {processed.map((order, idx) => {
                  const currentStatus = pendingStatus[order.id] ?? order.delivery_status;
                  const isDirty = !!pendingStatus[order.id];
                  const editable = canEdit(order);

                  return (
                    <tr key={order.id}>
                      <td className={styles.tdNo}>{idx + 1}</td>

                      {/* 주문자 */}
                      <td>
                        <span className={styles.cellMain}>{order.name}</span>
                        <span className={styles.cellSub}>{order.phone}</span>
                      </td>

                      {/* 상품 정보 */}
                      <td>
                        <span className={styles.productName}>{order.order_item}</span>
                        <span className={styles.productSpec}>
                          {order.order_weight}Kg · {order.order_price.toLocaleString()}원
                        </span>
                      </td>

                      {/* 수신자 성명/연락처 */}
                      <td>
                        <span className={styles.cellMain}>{order.receiver_name}</span>
                        <span className={styles.cellSub}>{order.receiver_phone}</span>
                      </td>

                      {/* 수신자 주소/우편번호 */}
                      <td>
                        <span className={styles.addrMain}>{order.receiver_address}</span>
                        <span className={styles.addrPost}>{order.receiver_post}</span>
                      </td>

                      {/* 주문일 */}
                      <td className={styles.tdDate}>
                        {new Date(order.created_at).toLocaleDateString('ko-KR')}
                      </td>

                      {/* 추천인 */}
                      <td className={styles.cellMain}>{order.reference_name || '—'}</td>

                      {/* 진행 상태 */}
                      <td className={styles.tdCenter}>
                        {editable ? (
                          <select
                            className={`${styles.statusSelect} ${styles[STATUS_CLASS[currentStatus] ?? '']}`}
                            value={currentStatus}
                            onChange={e => handleStatusSelect(order.id, e.target.value)}
                          >
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span className={`${styles.badge} ${styles[STATUS_CLASS[order.delivery_status] ?? '']}`}>
                            {order.delivery_status}
                          </span>
                        )}
                      </td>

                      {/* 수정 버튼 (admin / manager) */}
                      {canSeeAll && (
                        <td className={styles.tdCenter}>
                          {editable && (
                            <button
                              className={styles.saveBtn}
                              disabled={!isDirty}
                              onClick={() => handleSave(order)}
                            >
                              수정
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
