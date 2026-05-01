import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { getUserInfo, createOrder } from '../api/auth';
import styles from './OrderPage.module.css';

interface Product {
  name: string;
  weight: number;
  price: number;
  img: string;
  available: boolean;
}

const PRODUCTS: Product[] = [
  {
    name: '블루베리',
    weight: 1,
    price: 30000,
    img: 'https://mitra21c.github.io/data/images/taetaefarm/%EB%B8%94%EB%A3%A8%EB%B2%A0%EB%A6%AC_%EC%86%8C%EA%B0%9C.png',
    available: true,
  },
  {
    name: '태추 단감',
    weight: 10,
    price: 50000,
    img: 'https://mitra21c.github.io/data/images/taetaefarm/%ED%83%9C%EC%B6%94_%EC%86%8C%EA%B0%9C.png',
    available: false,
  },
  {
    name: '대봉',
    weight: 10,
    price: 50000,
    img: 'https://mitra21c.github.io/data/images/taetaefarm/%EB%8C%80%EB%B4%89_%EC%86%8C%EA%B0%9C.png',
    available: false,
  },
  {
    name: '감 말랭이',
    weight: 10,
    price: 50000,
    img: 'https://mitra21c.github.io/data/images/taetaefarm/%EA%B0%90%EB%A7%90%EB%9E%AD%EC%9D%B4_%EC%86%8C%EA%B0%9C.png',
    available: false,
  },
  {
    name: '울금',
    weight: 10,
    price: 50000,
    img: 'https://mitra21c.github.io/data/images/taetaefarm/%EC%9A%B8%EA%B8%88_%EC%86%8C%EA%B0%9C.png',
    available: false,
  },
];

interface OrdererInfo {
  phone: string;
  address: string;
  post: string;
}

interface ReceiverForm {
  name: string;
  phone: string;
  address: string;
  zip: string;
}

export default function OrderPage() {
  const { user, isAuthenticated } = useAuthContext();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [ordererInfo, setOrdererInfo] = useState<OrdererInfo>({ phone: '', address: '', post: '' });
  const [receiver, setReceiver] = useState<ReceiverForm>({ name: '', phone: '', address: '', zip: '' });
  const [sameAsOrderer, setSameAsOrderer] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [popup, setPopup] = useState<'smsError' | null>(null);

  const openOrder = async (product: Product) => {
    if (!user) return;
    setSelectedProduct(product);
    setSameAsOrderer(false);
    setReceiver({ name: '', phone: '', address: '', zip: '' });
    setSubmitError('');
    try {
      const info = await getUserInfo(user.email);
      setOrdererInfo({ phone: info.phone, address: info.address, post: info.post });
    } catch {
      setOrdererInfo({ phone: '', address: '', post: '' });
    }
  };

  const closeOrder = () => {
    setSelectedProduct(null);
    setSameAsOrderer(false);
  };

  const handleSameAsOrderer = (checked: boolean) => {
    setSameAsOrderer(checked);
    if (checked && user) {
      setReceiver({
        name: user.name,
        phone: ordererInfo.phone,
        address: ordererInfo.address,
        zip: ordererInfo.post,
      });
    } else {
      setReceiver({ name: '', phone: '', address: '', zip: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !user) return;
    setSubmitError('');
    try {
      const result = await createOrder({
        user_id: user.id,
        name: user.name,
        phone: ordererInfo.phone,
        email: user.email,
        order_item: selectedProduct.name,
        order_weight: selectedProduct.weight,
        order_price: selectedProduct.price,
        receiver_name: receiver.name,
        receiver_phone: receiver.phone,
        receiver_address: receiver.address,
        receiver_post: receiver.zip,
      });
      closeOrder();
      if (result.smsError) {
        setPopup('smsError');
      } else {
        alert(`${selectedProduct.name} 주문이 완료되었습니다.`);
      }
    } catch {
      setSubmitError('주문 처리 중 오류가 발생했습니다. 관리자에게 문의하세요.');
    }
  };

  return (
    <main className={styles.main}>
      {popup === 'smsError' && (
        <div className={styles.modalOverlay} onClick={() => setPopup(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '22rem', textAlign: 'center' }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>!</p>
            <h3 style={{ marginBottom: '0.75rem' }}>오류</h3>
            <p style={{ marginBottom: '1.25rem', lineHeight: 1.6 }}>
              에러가 발생하였습니다.<br />관리자에게 문의 하세요.
            </p>
            <button className={styles.cancelBtn} onClick={() => setPopup(null)}>확인</button>
          </div>
        </div>
      )}

      <div className={styles.inner}>

        {!isAuthenticated && (
          <div className={styles.loginNotice}>
            <span>주문하시려면 로그인이 필요합니다.</span>
            <Link to="/login" className={styles.loginLink}>로그인하기</Link>
          </div>
        )}

        <div className={styles.grid}>
          {PRODUCTS.map(product => (
            <div
              key={product.name}
              className={`${styles.card} ${!product.available ? styles.cardDisabled : ''}`}
            >
              <div className={styles.imgWrap}>
                <img src={product.img} alt={product.name} className={styles.img} />
                {!product.available && <div className={styles.overlay}>준비중</div>}
              </div>
              <div className={styles.body}>
                <h2 className={styles.productName}>{product.name}</h2>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>무게</span>
                  <span className={styles.specValue}>{product.weight}Kg</span>
                </div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>가격</span>
                  <span className={styles.specValue}>{product.price.toLocaleString()}원</span>
                </div>
                <button
                  className={styles.orderBtn}
                  disabled={!product.available || !isAuthenticated}
                  onClick={() => openOrder(product)}
                >
                  {product.available ? '주문하기' : '준비중'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 주문 모달 */}
      {selectedProduct && (
        <div className={styles.modalOverlay} onClick={closeOrder}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              {selectedProduct.name} 주문
              <span className={styles.modalPrice}>
                {selectedProduct.weight}Kg · {selectedProduct.price.toLocaleString()}원
              </span>
            </h2>

            <form onSubmit={handleSubmit} className={styles.form}>
              {/* 주문 상품 정보 */}
              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>주문 상품</legend>
                <div className={styles.row}>
                  <label className={styles.label}>상품명</label>
                  <input className={`${styles.input} ${styles.inputReadonly}`}
                    value={selectedProduct.name} readOnly />
                </div>
                <div className={styles.row}>
                  <label className={styles.label}>무게</label>
                  <input className={`${styles.input} ${styles.inputReadonly}`}
                    value={`${selectedProduct.weight}Kg`} readOnly />
                </div>
                <div className={styles.row}>
                  <label className={styles.label}>가격</label>
                  <input className={`${styles.input} ${styles.inputReadonly}`}
                    value={`${selectedProduct.price.toLocaleString()}원`} readOnly />
                </div>
              </fieldset>

              {/* 주문자 정보 */}
              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>주문자 정보</legend>
                <div className={styles.row}>
                  <label className={styles.label}>성명</label>
                  <input className={`${styles.input} ${styles.inputReadonly}`}
                    value={user?.name ?? ''} readOnly />
                </div>
                <div className={styles.row}>
                  <label className={styles.label}>연락처</label>
                  <input className={`${styles.input} ${styles.inputReadonly}`}
                    value={ordererInfo.phone} readOnly placeholder="불러오는 중…" />
                </div>
              </fieldset>

              {/* 주문자와 동일 체크박스 */}
              <label className={styles.sameCheck}>
                <input
                  type="checkbox"
                  checked={sameAsOrderer}
                  onChange={e => handleSameAsOrderer(e.target.checked)}
                  className={styles.checkbox}
                />
                주문자와 동일
              </label>

              {/* 수신자 정보 */}
              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>수신자 정보</legend>
                <div className={styles.row}>
                  <label className={styles.label}>성명 <span className={styles.req}>*</span></label>
                  <input
                    className={`${styles.input} ${sameAsOrderer ? styles.inputReadonly : ''}`}
                    value={receiver.name}
                    onChange={e => setReceiver(r => ({ ...r, name: e.target.value }))}
                    readOnly={sameAsOrderer}
                    placeholder="수신자 성명"
                    required
                  />
                </div>
                <div className={styles.row}>
                  <label className={styles.label}>연락처 <span className={styles.req}>*</span></label>
                  <input
                    className={`${styles.input} ${sameAsOrderer ? styles.inputReadonly : ''}`}
                    value={receiver.phone}
                    onChange={e => setReceiver(r => ({ ...r, phone: e.target.value }))}
                    readOnly={sameAsOrderer}
                    placeholder="010-0000-0000"
                    required
                  />
                </div>
                <div className={styles.row}>
                  <label className={styles.label}>주소 <span className={styles.req}>*</span></label>
                  <input
                    className={`${styles.input} ${sameAsOrderer ? styles.inputReadonly : ''}`}
                    value={receiver.address}
                    onChange={e => setReceiver(r => ({ ...r, address: e.target.value }))}
                    readOnly={sameAsOrderer}
                    placeholder="수신자 주소"
                    required
                  />
                </div>
                <div className={styles.row}>
                  <label className={styles.label}>우편번호 <span className={styles.req}>*</span></label>
                  <input
                    className={`${styles.input} ${sameAsOrderer ? styles.inputReadonly : ''}`}
                    value={receiver.zip}
                    onChange={e => setReceiver(r => ({ ...r, zip: e.target.value }))}
                    readOnly={sameAsOrderer}
                    placeholder="00000"
                    required
                  />
                </div>
              </fieldset>

              {submitError && (
                <p className={styles.submitError}>{submitError}</p>
              )}

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={closeOrder}>
                  취소
                </button>
                <button type="submit" className={styles.submitBtn}>
                  주문하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
