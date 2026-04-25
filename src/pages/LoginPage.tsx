import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useLogin } from '../hooks/useLogin';
import { useRegister } from '../hooks/useRegister';
import type { LoginRequest, RegisterRequest } from '../types/auth';
import styles from './LoginPage.module.css';

interface RegisterForm extends RegisterRequest {
  passwordConfirm: string;
}

export default function LoginPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login');

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginRequest>();

  const {
    register: registerForm,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors },
    watch,
    reset: resetRegister,
  } = useForm<RegisterForm>();

  const loginMutation = useLogin();
  const registerMutation = useRegister(() => {
    resetRegister();
    setTab('login');
  });

  const onLogin = (data: LoginRequest) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterForm) => {
    const { passwordConfirm: _, ...payload } = data;
    registerMutation.mutate(payload);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <Link to="/" className={styles.backLink}>← 홈으로</Link>
          <div className={styles.logoWrap}>
            <span className={styles.logoEmoji}>🫐</span>
            <h1 className={styles.title}>태태농장</h1>
          </div>
          <p className={styles.subtitle}>신선한 농산물을 주문하세요</p>
        </div>

        {/* Tab */}
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

        {/* Login Form */}
        {tab === 'login' && (
          <form className={styles.form} onSubmit={handleLoginSubmit(onLogin)} noValidate>
            <div className={styles.fieldGroup}>
              <label htmlFor="login-email" className={styles.label}>이메일</label>
              <input
                id="login-email"
                type="email"
                placeholder="farm@example.com"
                className={`${styles.input} ${loginErrors.email ? styles.inputError : ''}`}
                {...registerLogin('email', {
                  required: '이메일을 입력해 주세요.',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: '올바른 이메일 형식이 아닙니다.',
                  },
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
                {...registerLogin('password', {
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

        {/* Register Form */}
        {tab === 'register' && (
          <form className={styles.form} onSubmit={handleRegisterSubmit(onRegister)} noValidate>
            <div className={styles.fieldGroup}>
              <label htmlFor="reg-name" className={styles.label}>이름</label>
              <input
                id="reg-name"
                type="text"
                placeholder="홍길동"
                className={`${styles.input} ${registerErrors.name ? styles.inputError : ''}`}
                {...registerForm('name', {
                  required: '이름을 입력해 주세요.',
                  minLength: { value: 2, message: '이름은 2자 이상이어야 합니다.' },
                })}
              />
              {registerErrors.name && (
                <span className={styles.errorMsg}>{registerErrors.name.message}</span>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="reg-email" className={styles.label}>이메일</label>
              <input
                id="reg-email"
                type="email"
                placeholder="farm@example.com"
                className={`${styles.input} ${registerErrors.email ? styles.inputError : ''}`}
                {...registerForm('email', {
                  required: '이메일을 입력해 주세요.',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: '올바른 이메일 형식이 아닙니다.',
                  },
                })}
              />
              {registerErrors.email && (
                <span className={styles.errorMsg}>{registerErrors.email.message}</span>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="reg-password" className={styles.label}>비밀번호</label>
              <input
                id="reg-password"
                type="password"
                placeholder="••••••••"
                className={`${styles.input} ${registerErrors.password ? styles.inputError : ''}`}
                {...registerForm('password', {
                  required: '비밀번호를 입력해 주세요.',
                  minLength: { value: 6, message: '비밀번호는 6자 이상이어야 합니다.' },
                })}
              />
              {registerErrors.password && (
                <span className={styles.errorMsg}>{registerErrors.password.message}</span>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="reg-password-confirm" className={styles.label}>비밀번호 확인</label>
              <input
                id="reg-password-confirm"
                type="password"
                placeholder="••••••••"
                className={`${styles.input} ${registerErrors.passwordConfirm ? styles.inputError : ''}`}
                {...registerForm('passwordConfirm', {
                  required: '비밀번호 확인을 입력해 주세요.',
                  validate: (value) =>
                    value === watch('password') || '비밀번호가 일치하지 않습니다.',
                })}
              />
              {registerErrors.passwordConfirm && (
                <span className={styles.errorMsg}>{registerErrors.passwordConfirm.message}</span>
              )}
            </div>

            {registerMutation.isError && (
              <div className={styles.serverError}>
                회원가입에 실패했습니다. 다시 시도해 주세요.
              </div>
            )}

            {registerMutation.isSuccess && (
              <div className={styles.serverSuccess}>
                회원가입이 완료되었습니다! 로그인해 주세요.
              </div>
            )}

            <button type="submit" className={styles.submitBtn} disabled={registerMutation.isPending}>
              {registerMutation.isPending ? <span className={styles.spinner} /> : '회원가입'}
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
