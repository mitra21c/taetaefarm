import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import styles from './DevPage.module.css';

function decodeJwt(token: string) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

function formatDate(unix: number) {
  return new Date(unix * 1000).toLocaleString('ko-KR');
}

function fmt(iso: string) {
  return iso ? new Date(iso).toLocaleDateString('ko-KR') : '—';
}

type ModalType = 'users' | 'orders' | null;

const USER_COLS = [
  'id','name','phone','email','address','post','role',
  'reference_email','referrer_name','referrer_phone',
  'use','created_at','modified_at',
];
const ORDER_COLS = [
  'id','user_id','name','phone','email',
  'order_item','order_weight','order_price',
  'reference_email','reference_name',
  'receiver_name','receiver_phone','receiver_address','receiver_post',
  'delivery_status','created_at','modified_at',
];
const USER_LABELS: Record<string,string> = {
  id:'ID', name:'이름', phone:'연락처', email:'이메일',
  address:'주소', post:'우편번호', role:'권한',
  reference_email:'추천인 이메일', referrer_name:'추천인 이름', referrer_phone:'추천인 연락처',
  use:'승인', created_at:'생성일', modified_at:'수정일',
};
const ORDER_LABELS: Record<string,string> = {
  id:'ID', user_id:'회원ID', name:'주문자', phone:'연락처', email:'이메일',
  order_item:'상품명', order_weight:'무게(Kg)', order_price:'가격(원)',
  reference_email:'추천인 이메일', reference_name:'추천인 이름',
  receiver_name:'수신자', receiver_phone:'수신자 연락처',
  receiver_address:'배송지', receiver_post:'우편번호',
  delivery_status:'진행상태', created_at:'주문일', modified_at:'수정일',
};

export default function DevPage() {
  const { user, isAuthenticated } = useAuthContext();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [apiStatus, setApiStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [copied,    setCopied]    = useState<string | null>(null);
  const [modal,     setModal]     = useState<ModalType>(null);
  const [modalData, setModalData] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError,   setModalError]   = useState('');

  if (!isAuthenticated || !isAdmin) {
    navigate('/');
    return null;
  }

  const accessToken   = localStorage.getItem('accessToken')  ?? '';
  const refreshToken  = localStorage.getItem('refreshToken') ?? '';
  const accessPayload = decodeJwt(accessToken);
  const refreshPayload = decodeJwt(refreshToken);
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? `http://${window.location.hostname}:8080/api`;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const checkApi = async () => {
    try {
      const res = await fetch(`${apiBase}/users`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setApiStatus(res.ok ? 'ok' : 'error');
    } catch {
      setApiStatus('error');
    }
  };

  const openModal = async (type: ModalType) => {
    setModal(type);
    setModalData([]);
    setModalError('');
    setModalLoading(true);
    try {
      const url = type === 'users' ? `${apiBase}/users` : `${apiBase}/orders`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error();
      setModalData(await res.json());
    } catch {
      setModalError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => { setModal(null); setModalData([]); setModalError(''); };

  const cols   = modal === 'users' ? USER_COLS   : ORDER_COLS;
  const labels = modal === 'users' ? USER_LABELS : ORDER_LABELS;

  const cellVal = (row: any, col: string) => {
    const v = row[col];
    if (col === 'created_at' || col === 'modified_at') return fmt(v);
    if (v === null || v === undefined || v === '') return '—';
    return String(v);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>🛠 개발자 모드</h1>

      {/* DB 조회 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>DB 조회</h2>
        <div className={styles.dbBtnRow}>
          <button className={styles.dbBtn} onClick={() => openModal('users')}>
            회원 조회
          </button>
          <button className={styles.dbBtn} onClick={() => openModal('orders')}>
            주문 조회
          </button>
        </div>
      </section>

      {/* 환경 정보 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>환경 정보</h2>
        <table className={styles.infoTable}>
          <tbody>
            <tr><td className={styles.label}>호스트</td><td>{window.location.hostname}</td></tr>
            <tr><td className={styles.label}>프론트엔드</td><td>{window.location.origin}{window.location.pathname}</td></tr>
            <tr><td className={styles.label}>API Base URL</td><td>{apiBase}</td></tr>
            <tr>
              <td className={styles.label}>API 상태</td>
              <td>
                <button className={styles.testBtn} onClick={checkApi}>연결 테스트</button>
                {apiStatus === 'ok'    && <span className={styles.ok}>  ✅ 정상</span>}
                {apiStatus === 'error' && <span className={styles.err}>  ❌ 오류</span>}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 로그인 사용자 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>로그인 사용자</h2>
        <table className={styles.infoTable}>
          <tbody>
            <tr><td className={styles.label}>ID</td><td>{user?.id}</td></tr>
            <tr><td className={styles.label}>이름</td><td>{user?.name}</td></tr>
            <tr><td className={styles.label}>이메일</td><td>{user?.email}</td></tr>
            <tr><td className={styles.label}>권한</td><td>{user?.role}</td></tr>
          </tbody>
        </table>
      </section>

      {/* Access Token */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Access Token
          <button className={styles.copyBtn} onClick={() => copy(accessToken, 'access')}>
            {copied === 'access' ? '복사됨 ✓' : '복사'}
          </button>
        </h2>
        <pre className={styles.tokenBox}>{accessToken || '없음'}</pre>
        {accessPayload && (
          <table className={styles.infoTable}>
            <tbody>
              <tr><td className={styles.label}>sub</td><td>{accessPayload.sub}</td></tr>
              <tr><td className={styles.label}>email</td><td>{accessPayload.email}</td></tr>
              <tr><td className={styles.label}>role</td><td>{accessPayload.role}</td></tr>
              <tr><td className={styles.label}>발급</td><td>{formatDate(accessPayload.iat)}</td></tr>
              <tr><td className={styles.label}>만료</td><td>{formatDate(accessPayload.exp)}</td></tr>
            </tbody>
          </table>
        )}
      </section>

      {/* Refresh Token */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Refresh Token
          <button className={styles.copyBtn} onClick={() => copy(refreshToken, 'refresh')}>
            {copied === 'refresh' ? '복사됨 ✓' : '복사'}
          </button>
        </h2>
        <pre className={styles.tokenBox}>{refreshToken || '없음'}</pre>
        {refreshPayload && (
          <table className={styles.infoTable}>
            <tbody>
              <tr><td className={styles.label}>발급</td><td>{formatDate(refreshPayload.iat)}</td></tr>
              <tr><td className={styles.label}>만료</td><td>{formatDate(refreshPayload.exp)}</td></tr>
            </tbody>
          </table>
        )}
      </section>

      {/* 팝업 모달 */}
      {modal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {modal === 'users' ? '회원 정보' : '주문 정보'} DB 조회
              </h2>
              <button className={styles.closeBtn} onClick={closeModal}>✕</button>
            </div>

            {modalLoading && <p className={styles.stateMsg}>불러오는 중…</p>}
            {modalError   && <p className={styles.errMsg}>{modalError}</p>}

            {!modalLoading && !modalError && (
              <>
                <p className={styles.countMsg}>총 {modalData.length}건</p>
                <div className={styles.modalTableWrap}>
                  <table className={styles.modalTable}>
                    <thead>
                      <tr>
                        <th>순번</th>
                        {cols.map(c => <th key={c}>{labels[c]}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {modalData.map((row, i) => (
                        <tr key={row.id ?? i}>
                          <td>{i + 1}</td>
                          {cols.map(c => <td key={c}>{cellVal(row, c)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
