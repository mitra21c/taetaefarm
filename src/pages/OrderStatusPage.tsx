import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { getOrders, updateOrderStatus } from '../api/auth';
import styles from './OrderStatusPage.module.css';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2023 }, (_, i) => 2024 + i);

const STATUS_OPTIONS = ['주문완료', '입금 완료', '출고/배송 중', '주문취소'];

const STATUS_CLASS: Record<string, string> = {
  '주문완료':     'statusReceived',
  '입금 완료':    'statusPreparing',
  '출고/배송 중': 'statusShipping',
  '주문취소':     'statusCanceled',
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
}

export default function OrderStatusPage() {
  const { user, isAuthenticated } = useAuthContext();
  const isAdmin = user?.role === 'admin';

  const [year, setYear] = useState(CURRENT_YEAR);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pendingStatus, setPendingStatus] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    setLoading(true);
    setError('');
    const params = isAdmin ? { year } : { email: user.email, year };
    getOrders(params)
      .then(setOrders)
      .catch(() => setError('데이터를 불러오는 중 오류가 발생했습니다.'))
      .finally(() => setLoading(false));
  }, [year, isAuthenticated, user]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedOrders = useMemo(() => {
    if (!sortKey) return orders;
    return [...orders].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = String(av).localeCompare(String(bv), 'ko');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [orders, sortKey, sortDir]);

  const handleStatusSelect = (orderId: number, newStatus: string) => {
    setPendingStatus(prev => ({ ...prev, [orderId]: newStatus }));
  };

  const handleSave = async (orderId: number) => {
    const status = pendingStatus[orderId];
    if (!status) return;
    try {
      await updateOrderStatus(orderId, status);
      setOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, delivery_status: status } : o))
      );
      setPendingStatus(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    } catch {
      alert('상태 변경 중 오류가 발생했습니다.');
    }
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
      <div className={styles.inner}>

        <div className={styles.toolbar}>
          <h1 className={styles.title}>주문 현황</h1>
          <select
            className={styles.yearSelect}
            value={year}
            onChange={e => setYear(Number(e.target.value))}
          >
            {YEARS.map(y => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
        </div>

        {loading && <p className={styles.stateMsg}>불러오는 중…</p>}
        {error   && <p className={styles.errorMsg}>{error}</p>}

        {!loading && !error && orders.length === 0 && (
          <div className={styles.emptyBox}>
            <span className={styles.icon}>📭</span>
            <p>{year}년 주문 내역이 없습니다.</p>
            <Link to="/order" className={styles.actionBtn}>주문하러 가기</Link>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>순번</th>
                  {thSort('name', '주문자')}
                  {thSort('order_item', '상품 정보')}
                  {thSort('receiver_name', '수신자')}
                  {thSort('delivery_status', '주문 상태')}
                  {thSort('created_at', '주문일')}
                  {thSort('reference_name', '추천인')}
                  {isAdmin && <th>수정</th>}
                </tr>
              </thead>
              <tbody>
                {sortedOrders.map((order, idx) => (
                  <tr key={order.id}>
                    <td className={styles.tdNo}>{idx + 1}</td>

                    {/* 주문자: 성명 + 연락처 */}
                    <td>
                      <span className={styles.cellMain}>{order.name}</span>
                      <span className={styles.cellSub}>{order.phone}</span>
                    </td>

                    {/* 상품 정보: 상품명 + 무게/가격 */}
                    <td>
                      <span className={styles.productName}>{order.order_item}</span>
                      <span className={styles.productSpec}>
                        {order.order_weight}Kg · {order.order_price.toLocaleString()}원
                      </span>
                    </td>

                    {/* 수신자: 성명 + 연락처 + 주소 + 우편번호 */}
                    <td>
                      <span className={styles.cellMain}>{order.receiver_name}</span>
                      <span className={styles.cellSub}>{order.receiver_phone}</span>
                      <span className={styles.addrMain}>{order.receiver_address}</span>
                      <span className={styles.addrPost}>{order.receiver_post}</span>
                    </td>

                    {/* 주문 상태 */}
                    <td className={styles.tdCenter}>
                      {isAdmin ? (
                        <select
                          className={`${styles.statusSelect} ${styles[STATUS_CLASS[pendingStatus[order.id] ?? order.delivery_status] ?? '']}`}
                          value={pendingStatus[order.id] ?? order.delivery_status}
                          onChange={e => handleStatusSelect(order.id, e.target.value)}
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`${styles.badge} ${styles[STATUS_CLASS[order.delivery_status] ?? '']}`}>
                          {order.delivery_status}
                        </span>
                      )}
                    </td>

                    <td className={styles.tdDate}>
                      {new Date(order.created_at).toLocaleDateString('ko-KR')}
                    </td>

                    <td className={styles.cellMain}>{order.reference_name || '—'}</td>

                    {isAdmin && (
                      <td className={styles.tdCenter}>
                        <button
                          className={styles.saveBtn}
                          disabled={!pendingStatus[order.id]}
                          onClick={() => handleSave(order.id)}
                        >
                          수정
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
