import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useLogin } from '../hooks/useLogin';
import { checkDuplicateApi, verifyReferrerApi, register } from '../api/auth';
import type { LoginRequest } from '../types/auth';
import styles from './LoginPage.module.css';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  phone: string;
  address: string;
  post: string;
  referrerName: string;
  referrerEmail: string;
  referrerPhone: string;
}

type PopupKind =
  | 'duplicateUser'
  | 'registerOk'
  | 'referrerNotFound'
  | 'registerSuccess'
  | 'registerError'
  | null;

const EMAIL_PATTERN = {
  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  message: '올바른 이메일 형식이 아닙니다.',
};

const PHONE_PATTERN = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;

export default function LoginPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [personalInfoVerified, setPersonalInfoVerified] = useState(false);
  const [referrerVerified, setReferrerVerified] = useState(false);
  const [referrerEmail, setReferrerEmail] = useState<string | null>(null);
  const [popup, setPopup] = useState<PopupKind>(null);

  const {
    register: regLogin,
    handleSubmit: submitLogin,
    formState: { errors: loginErrors },
  } = useForm<LoginRequest>();

  const {
    register: regForm,
    handleSubmit: submitRegister,
    formState: { errors: regErrors, isValid },
    watch,
    reset,
  } = useForm<RegisterForm>({ mode: 'onChange' });

  const loginMutation = useLogin();

  const emailVal = watch('email');
  const phoneVal = watch('phone');
  const referrerNameVal = watch('referrerName');
  const referrerEmailVal = watch('referrerEmail');

  useEffect(() => {
    setPersonalInfoVerified(false);
  }, [emailVal, phoneVal]);

  useEffect(() => {
    setReferrerVerified(false);
    setReferrerEmail(null);
  }, [referrerNameVal, referrerEmailVal]);

  const canCheckPersonalInfo =
    !!(emailVal?.trim() && phoneVal?.trim()) && !regErrors.email && !regErrors.phone;

  const canVerifyReferrer =
    !!(referrerNameVal?.trim() && referrerEmailVal?.trim()) &&
    !regErrors.referrerName &&
    !regErrors.referrerEmail;

  const canSubmit = isValid && personalInfoVerified && referrerEmail !== null;

  const handleCheckPersonalInfo = async () => {
    const email = emailVal?.trim() ?? '';
    const phone = phoneVal?.trim() ?? '';
    try {
      const { isDuplicate } = await checkDuplicateApi(email, phone);
      if (isDuplicate) {
        setPopup('duplicateUser');
        setPersonalInfoVerified(false);
      } else {
        setPopup('registerOk');
        setPersonalInfoVerified(true);
      }
    } catch {
      setPopup('duplicateUser');
      setPersonalInfoVerified(false);
    }
  };

  const handleVerifyReferrer = async () => {
    const name = referrerNameVal?.trim() ?? '';
    const email = referrerEmailVal?.trim() ?? '';
    try {
      const result = await verifyReferrerApi(name, email);
      if (result.found && result.referrerEmail) {
        setReferrerVerified(true);
        setReferrerEmail(result.referrerEmail);
      } else {
        setReferrerVerified(false);
        setReferrerEmail(null);
        setPopup('referrerNotFound');
      }
    } catch {
      setReferrerVerified(false);
      setReferrerEmail(null);
      setPopup('referrerNotFound');
    }
  };

  const handlePopupClose = () => {
    if (popup === 'registerSuccess') {
      reset();
      setPersonalInfoVerified(false);
      setReferrerVerified(false);
      setReferrerEmail(null);
      setTab('login');
    }
    setPopup(null);
  };

  const onLogin = (data: LoginRequest) => loginMutation.mutate(data);

  const onRegister = async (data: RegisterForm) => {
    const { passwordConfirm: _, ...rest } = data;
    try {
      await register({
        ...rest,
        referrerEmail: referrerEmail!,
      });
      setPopup('registerSuccess');
    } catch {
      setPopup('registerError');
    }
  };

  return (
    <div className={styles.container}>
      {/* 팝업 */}
      {popup && (
        <div className={styles.popupOverlay} onClick={handlePopupClose}>
          <div className={styles.popup} onClick={e => e.stopPropagation()}>
            {popup === 'registerOk' && (
              <>
                <div className={styles.popupIconOk}>✓</div>
                <h3 className={styles.popupTitleOk}>개인정보 확인</h3>
                <p className={styles.popupMsg}>등록 가능합니다.</p>
              </>
            )}
            {popup === 'duplicateUser' && (
              <>
                <div className={styles.popupIconError}>!</div>
                <h3 className={styles.popupTitleError}>중복 확인</h3>
                <p className={styles.popupMsg}>
                  이미 등록 되어 있는 사용자 입니다.<br />관리자에게 문의 하세요.
                </p>
              </>
            )}
            {popup === 'referrerNotFound' && (
              <>
                <div className={styles.popupIconError}>!</div>
                <h3 className={styles.popupTitleError}>추천인 확인</h3>
                <p className={styles.popupMsg}>추천인이 존재하지 않습니다.</p>
              </>
            )}
            {popup === 'registerSuccess' && (
              <>
                <div className={styles.popupIconOk}>✓</div>
                <h3 className={styles.popupTitleOk}>회원가입 완료</h3>
                <p className={styles.popupMsg}>정상적으로 입력이 되었습니다.</p>
              </>
            )}
            {popup === 'registerError' && (
              <>
                <div className={styles.popupIconError}>!</div>
                <h3 className={styles.popupTitleError}>오류</h3>
                <p className={styles.popupMsg}>
                  에러가 발생하였습니다.<br />관리자에게 문의 하세요.
                </p>
              </>
            )}
            <button className={styles.popupBtn} onClick={handlePopupClose}>확인</button>
          </div>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.header}>
          <Link to="/" className={styles.backLink}>← 홈으로</Link>
          <div className={styles.logoWrap}>
            <span className={styles.logoEmoji}>🫐</span>
            <h1 className={styles.title}>태태농장</h1>
          </div>
          <p className={styles.subtitle}>신선한 농산물을 주문하세요</p>
        </div>

        {/* 탭 */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'login' ? styles.tabActive : ''}`}
            onClick={() => setTab('login')}
          >
            로그인
          </button>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'register' ? styles.tabActive : ''}`}
            onClick={() => setTab('register')}
          >
            회원가입
          </button>
        </div>

        {/* 로그인 폼 */}
        {tab === 'login' && (
          <form className={styles.form} onSubmit={submitLogin(onLogin)} noValidate>
            <div className={styles.fieldGroup}>
              <label htmlFor="login-email" className={styles.label}>이메일</label>
              <input
                id="login-email"
                type="email"
                placeholder="farm@example.com"
                className={`${styles.input} ${loginErrors.email ? styles.inputError : ''}`}
                {...regLogin('email', {
                  required: '이메일을 입력해 주세요.',
                  pattern: EMAIL_PATTERN,
                })}
              />
              {loginErrors.email && (
                <span className={styles.errorMsg}>{loginErrors.email.message}</span>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="login-password" className={styles.label}>비밀번호</label>
              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                className={`${styles.input} ${loginErrors.password ? styles.inputError : ''}`}
                {...regLogin('password', {
                  required: '비밀번호를 입력해 주세요.',
                  minLength: { value: 6, message: '비밀번호는 6자 이상이어야 합니다.' },
                })}
              />
              {loginErrors.password && (
                <span className={styles.errorMsg}>{loginErrors.password.message}</span>
              )}
            </div>

            {loginMutation.isError && (
              <div className={styles.serverError}>
                {(loginMutation.error as any)?.response?.status === 403
                  ? '관리자 승인 대기 중입니다. 관리자에게 문의 하세요.'
                  : '이메일 또는 비밀번호가 올바르지 않습니다.'}
              </div>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? <span className={styles.spinner} /> : '로그인'}
            </button>
          </form>
        )}

        {/* 회원가입 폼 */}
        {tab === 'register' && (
          <form className={styles.form} onSubmit={submitRegister(onRegister)} noValidate>

            {/* ── 개인 정보 ── */}
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>👤</span>
              <span className={styles.sectionTitle}>개인 정보</span>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="reg-name" className={styles.label}>
                이름 <span className={styles.requiredMark}>*</span>
              </label>
              <input
                id="reg-name"
                type="text"
                placeholder="홍길동"
                className={`${styles.input} ${regErrors.name ? styles.inputError : ''}`}
                {...regForm('name', {
                  required: '이름을 입력해 주세요.',
                  minLength: { value: 2, message: '이름은 2자 이상이어야 합니다.' },
                })}
              />
              {regErrors.name && (
                <span className={styles.errorMsg}>{regErrors.name.message}</span>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="reg-email" className={styles.label}>
                이메일 <span className={styles.requiredMark}>*</span>
              </label>
              <input
                id="reg-email"
                type="email"
                placeholder="farm@example.com"
                className={`${styles.input} ${regErrors.email ? styles.inputError : ''}`}
                {...regForm('email', {
                  required: '이메일을 입력해 주세요.',
                  pattern: EMAIL_PATTERN,
                })}
              />
              {regErrors.email && (
                <span className={styles.errorMsg}>{regErrors.email.message}</span>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="reg-password" className={styles.label}>
                비밀번호 <span className={styles.requiredMark}>*</span>
              </label>
              <input
                id="reg-password"
                type="password"
                placeholder="••••••••"
                className={`${styles.input} ${regErrors.password ? styles.inputError : ''}`}
                {...regForm('password', {
                  required: '비밀번호를 입력해 주세요.',
                  minLength: { value: 6, message: '비밀번호는 6자 이상이어야 합니다.' },
                })}
              />
              {regErrors.password && (
                <span className={styles.errorMsg}>{regErrors.password.message}</span>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="reg-password-confirm" className={styles.label}>
                비밀번호 확인 <span className={styles.requiredMark}>*</span>
              </label>
              <input
                id="reg-password-confirm"
                type="password"
                placeholder="••••••••"
                className={`${styles.input} ${regErrors.passwordConfirm ? styles.inputError : ''}`}
                {...regForm('passwordConfirm', {
                  required: '비밀번호 확인을 입력해 주세요.',
                  validate: v => v === watch('password') || '비밀번호가 일치하지 않습니다.',
                })}
              />
              {regErrors.passwordConfirm && (
                <span className={styles.errorMsg}>{regErrors.passwordConfirm.message}</span>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="reg-phone" className={styles.label}>
                전화번호 <span className={styles.requiredMark}>*</span>
              </label>
              <input
                id="reg-phone"
                type="tel"
                placeholder="010-0000-0000"
                className={`${styles.input} ${regErrors.phone ? styles.inputError : ''}`}
                {...regForm('phone', {
                  required: '전화번호를 입력해 주세요.',
                  validate: v =>
                    PHONE_PATTERN.test(v.trim()) || '올바른 전화번호 형식이 아닙니다. (예: 010-0000-0000)',
                })}
              />
              {regErrors.phone && (
                <span className={styles.errorMsg}>{regErrors.phone.message}</span>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="reg-address" className={styles.label}>
                주소 <span className={styles.requiredMark}>*</span>
              </label>
              <input
                id="reg-address"
                type="text"
                placeholder="도로명 주소"
                className={`${styles.input} ${regErrors.address ? styles.inputError : ''}`}
                {...regForm('address', { required: '주소를 입력해 주세요.' })}
              />
              {regErrors.address && (
                <span className={styles.errorMsg}>{regErrors.address.message}</span>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="reg-post" className={styles.label}>
                우편번호 <span className={styles.requiredMark}>*</span>
              </label>
              <input
                id="reg-post"
                type="text"
                placeholder="00000"
                className={`${styles.input} ${regErrors.post ? styles.inputError : ''}`}
                {...regForm('post', {
                  required: '우편번호를 입력해 주세요.',
                  pattern: { value: /^\d{5}$/, message: '5자리 숫자로 입력해 주세요.' },
                })}
              />
              {regErrors.post && (
                <span className={styles.errorMsg}>{regErrors.post.message}</span>
              )}
            </div>

            {/* 개인정보 확인 버튼 */}
            <div className={styles.verifyRow}>
              <button
                type="button"
                className={`${styles.verifyBtn} ${personalInfoVerified ? styles.verifyBtnDone : ''}`}
                disabled={!canCheckPersonalInfo || personalInfoVerified}
                onClick={handleCheckPersonalInfo}
              >
                개인정보 확인
              </button>
              {personalInfoVerified && (
                <span className={styles.verifiedBadge}>✓ 등록 가능</span>
              )}
            </div>

            {/* ── 추천인 정보 ── */}
            <div className={styles.sectionHeader} style={{ marginTop: '0.5rem' }}>
              <span className={styles.sectionIcon}>🤝</span>
              <span className={styles.sectionTitle}>추천인 정보</span>
              <span className={styles.sectionNote}>성명·이메일 필수</span>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="reg-ref-name" className={styles.label}>
                추천인 성명 <span className={styles.requiredMark}>*</span>
              </label>
              <input
                id="reg-ref-name"
                type="text"
                placeholder="홍길동"
                className={`${styles.input} ${regErrors.referrerName ? styles.inputError : ''}`}
                {...regForm('referrerName', {
                  required: '추천인 성명을 입력해 주세요.',
                })}
              />
              {regErrors.referrerName && (
                <span className={styles.errorMsg}>{regErrors.referrerName.message}</span>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="reg-ref-email" className={styles.label}>
                추천인 이메일 <span className={styles.requiredMark}>*</span>
              </label>
              <input
                id="reg-ref-email"
                type="email"
                placeholder="referrer@example.com"
                className={`${styles.input} ${regErrors.referrerEmail ? styles.inputError : ''}`}
                {...regForm('referrerEmail', {
                  required: '추천인 이메일을 입력해 주세요.',
                  pattern: EMAIL_PATTERN,
                })}
              />
              {regErrors.referrerEmail && (
                <span className={styles.errorMsg}>{regErrors.referrerEmail.message}</span>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="reg-ref-phone" className={styles.label}>추천인 연락처</label>
              <input
                id="reg-ref-phone"
                type="tel"
                placeholder="010-0000-0000 (선택)"
                className={`${styles.input} ${regErrors.referrerPhone ? styles.inputError : ''}`}
                {...regForm('referrerPhone', {
                  validate: v =>
                    !v || PHONE_PATTERN.test(v.trim()) || '올바른 전화번호 형식이 아닙니다.',
                })}
              />
              {regErrors.referrerPhone && (
                <span className={styles.errorMsg}>{regErrors.referrerPhone.message}</span>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="reg-ref-id" className={styles.label}>추천인 E-Mail</label>
              <input
                id="reg-ref-id"
                type="text"
                readOnly
                className={`${styles.input} ${styles.inputReadonly}`}
                value={referrerEmail ?? ''}
                placeholder="추천인 인증 후 자동 입력"
              />
            </div>

            {/* 추천인 인증 버튼 */}
            <div className={styles.verifyRow}>
              <button
                type="button"
                className={`${styles.verifyBtn} ${referrerVerified ? styles.verifyBtnDone : ''}`}
                disabled={!canVerifyReferrer || referrerVerified}
                onClick={handleVerifyReferrer}
              >
                추천인 인증
              </button>
              {referrerVerified && (
                <span className={styles.verifiedBadge}>✓ 인증 완료</span>
              )}
            </div>

            {/* 회원가입 버튼 */}
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={!canSubmit}
            >
              회원가입
            </button>
          </form>
        )}

        <p className={styles.footer}>
          문의:{' '}
          <a href="mailto:farm@taetaefarm.kr" className={styles.footerLink}>
            farm@taetaefarm.kr
          </a>
        </p>
      </div>
    </div>
  );
}
