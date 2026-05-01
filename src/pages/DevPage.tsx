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

  const [smsTo,      setSmsTo]      = useState('');
  const [smsText,    setSmsText]    = useState('');
  const [smsStatus,  setSmsStatus]  = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [smsMessage, setSmsMessage] = useState('');

  const [noticeText,    setNoticeText]    = useState('');
  const [noticeStatus,  setNoticeStatus]  = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [noticeHistory, setNoticeHistory] = useState<Array<{ name: string; phone: string }>>([]);

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

  const sendNotice = async () => {
    if (!noticeText.trim()) return;
    setNoticeStatus('sending');
    setNoticeMessage('');
    setNoticeHistory([]);
    try {
      const res = await fetch(`${apiBase}/sms/send-all-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ text: noticeText }),
      });
      const data = await res.json();
      if (res.ok) {
        setNoticeStatus('ok');
        setNoticeMessage(data.message ?? '발송 완료');
        setNoticeHistory(data.recipients ?? []);
      } else {
        setNoticeStatus('error');
        setNoticeMessage(data.message ?? '발송에 실패했습니다.');
      }
    } catch {
      setNoticeStatus('error');
      setNoticeMessage('서버 연결에 실패했습니다.');
    }
  };

  const sendSms = async () => {
    if (!smsTo.trim() || !smsText.trim()) return;
    setSmsStatus('sending');
    setSmsMessage('');
    try {
      const res = await fetch(`${apiBase}/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ to: smsTo.replace(/-/g, ''), text: smsText }),
      });
      const data = await res.json();
      if (res.ok) {
        setSmsStatus('ok');
        setSmsMessage('발송되었습니다.');
      } else {
        setSmsStatus('error');
        setSmsMessage(data.message ?? '발송에 실패했습니다.');
      }
    } catch {
      setSmsStatus('error');
      setSmsMessage('서버 연결에 실패했습니다.');
    }
  };

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

      {/* 문자 메시지 전송 테스트 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>문자 메시지 전송 테스트</h2>
        <div className={styles.smsForm}>
          <div className={styles.smsRow}>
            <label className={styles.smsLabel}>수신인 연락처</label>
            <input
              className={styles.smsInput}
              type="tel"
              placeholder="010-0000-0000"
              value={smsTo}
              onChange={e => setSmsTo(e.target.value)}
            />
          </div>
          <div className={styles.smsRow}>
            <label className={styles.smsLabel}>메시지 내용</label>
            <textarea
              className={styles.smsTextarea}
              placeholder="발송할 메시지를 입력하세요."
              value={smsText}
              onChange={e => setSmsText(e.target.value)}
              rows={4}
            />
          </div>
          <div className={styles.smsBtnRow}>
            <span className={styles.smsCount}>{smsText.length}자</span>
            <button
              className={styles.smsSendBtn}
              onClick={sendSms}
              disabled={smsStatus === 'sending' || !smsTo.trim() || !smsText.trim()}
            >
              {smsStatus === 'sending' ? '발송 중…' : '문자 발송'}
            </button>
          </div>
          {smsStatus === 'ok'    && <p className={styles.smsOk}> ✅ {smsMessage}</p>}
          {smsStatus === 'error' && <p className={styles.smsErr}>❌ {smsMessage}</p>}
        </div>
      </section>

      {/* 공지 메시지 전송 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>공지 메시지 전송</h2>
        <div className={styles.smsForm}>
          <div className={styles.smsRow}>
            <label className={styles.smsLabel}>메시지 내용</label>
            <textarea
              className={styles.smsTextarea}
              placeholder="전체 회원에게 발송할 메시지를 입력하세요."
              value={noticeText}
              onChange={e => setNoticeText(e.target.value)}
              rows={4}
            />
          </div>
          <div className={styles.smsBtnRow}>
            <span className={styles.smsCount}>{noticeText.length}자</span>
            <button
              className={styles.smsSendBtn}
              onClick={sendNotice}
              disabled={noticeStatus === 'sending' || !noticeText.trim()}
            >
              {noticeStatus === 'sending' ? '발송 중…' : '전체 발송'}
            </button>
          </div>
          {noticeStatus === 'ok'    && <p className={styles.smsOk}> ✅ {noticeMessage}</p>}
          {noticeStatus === 'error' && <p className={styles.smsErr}>❌ {noticeMessage}</p>}
        </div>

        {noticeHistory.length > 0 && (
          <div className={styles.noticeHistory}>
            <p className={styles.noticeHistoryTitle}>전송 이력 ({noticeHistory.length}명)</p>
            <table className={styles.noticeTable}>
              <thead>
                <tr>
                  <th>순번</th>
                  <th>성명</th>
                  <th>연락처</th>
                </tr>
              </thead>
              <tbody>
                {noticeHistory.map((r, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{r.name}</td>
                    <td>{r.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
