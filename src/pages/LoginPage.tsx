import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useLogin } from '../hooks/useLogin';
import { findByNameAndEmail, addUser } from '../store/userStore';
import type { LoginRequest, RegisterRequest } from '../types/auth';
import styles from './LoginPage.module.css';

interface RegisterForm extends RegisterRequest {
  passwordConfirm: string;
}

const EMAIL_PATTERN = {
  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  message: '올바른 이메일 형식이 아닙니다.',
};

const PHONE_PATTERN = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;

export default function LoginPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [referrerVerified, setReferrerVerified] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

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

  const referrerNameVal = watch('referrerName');
  const referrerEmailVal = watch('referrerEmail');

  useEffect(() => {
    setReferrerVerified(false);
  }, [referrerNameVal, referrerEmailVal]);

  const isReferrerFilled = !!(referrerNameVal?.trim() && referrerEmailVal?.trim());

  const handleVerifyReferrer = () => {
    const found = findByNameAndEmail(
      referrerNameVal?.trim() ?? '',
      referrerEmailVal?.trim() ?? '',
    );
    if (found) {
      setReferrerVerified(true);
    } else {
      setReferrerVerified(false);
      setShowPopup(true);
    }
  };

  const onLogin = (data: LoginRequest) => loginMutation.mutate(data);

  const onRegister = (data: RegisterForm) => {
    const { passwordConfirm: _, ...payload } = data;
    addUser(payload);
    reset();
    setReferrerVerified(false);
    setTab('login');
  };

  return (
    <div className={styles.container}>
      {/* 추천인 인증 실패 팝업 */}
      {showPopup && (
        <div className={styles.popupOverlay} onClick={() => setShowPopup(false)}>
          <div className={styles.popup} onClick={e => e.stopPropagation()}>
            <h3 className={styles.popupTitle}>데이터 확인</h3>
            <p className={styles.popupMsg}>
              입력하신 추천인 정보와 일치하는<br />계정을 찾을 수 없습니다.<br />
              추천인 성명과 이메일을 다시 확인해 주세요.
            </p>
            <button className={styles.popupBtn} onClick={() => setShowPopup(false)}>
              확인
            </button>
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
                이메일 또는 비밀번호가 올바르지 않습니다.
              </div>
            )}

            <button type="submit" className={styles.submitBtn} disabled={loginMutation.isPending}>
              {loginMutation.isPending ? <span className={styles.spinner} /> : '로그인'}
            </button>
          </form>
        )}

        {/* 회원가입 폼 */}
        {tab === 'register' && (
          <form className={styles.form} onSubmit={submitRegister(onRegister)} noValidate>
            {/* 기본 정보 */}
            <div className={styles.fieldGroup}>
              <label htmlFor="reg-name" className={styles.label}>이름</label>
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
              {regErrors.name && <span className={styles.errorMsg}>{regErrors.name.message}</span>}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="reg-email" className={styles.label}>이메일</label>
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
              {regErrors.email && <span className={styles.errorMsg}>{regErrors.email.message}</span>}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="reg-password" className={styles.label}>비밀번호</label>
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
              {regErrors.password && <span className={styles.errorMsg}>{regErrors.password.message}</span>}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="reg-password-confirm" className={styles.label}>비밀번호 확인</label>
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
              <label htmlFor="reg-phone" className={styles.label}>전화번호</label>
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
              {regErrors.phone && <span className={styles.errorMsg}>{regErrors.phone.message}</span>}
            </div>

            {/* 추천인 정보 */}
            <div className={styles.divider}>
              <span className={styles.dividerLabel}>
                추천인 정보 <span className={styles.requiredMark}>* 필수</span>
              </span>
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

            {/* 추천인 인증 버튼 */}
            <div className={styles.verifyRow}>
              <button
                type="button"
                className={`${styles.verifyBtn} ${referrerVerified ? styles.verifyBtnDone : ''}`}
                disabled={!isReferrerFilled || referrerVerified}
                onClick={handleVerifyReferrer}
              >
                추천인 인증
              </button>
              {referrerVerified && (
                <span className={styles.verifiedBadge}>✓ 인증 완료</span>
              )}
            </div>

            {/* 회원가입 버튼 — 기본 유효 + 추천인 인증 완료 시 활성화 */}
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={!isValid || !referrerVerified}
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
