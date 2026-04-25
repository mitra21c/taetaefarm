import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useLogin } from '../hooks/useLogin';
import type { LoginRequest } from '../types/auth';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>();

  const loginMutation = useLogin();

  const onSubmit = (data: LoginRequest) => {
    loginMutation.mutate(data);
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
          <p className={styles.subtitle}>로그인하고 신선한 농산물을 주문하세요</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Email */}
          <div className={styles.fieldGroup}>
            <label htmlFor="email" className={styles.label}>이메일</label>
            <input
              id="email"
              type="email"
              placeholder="farm@example.com"
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              {...register('email', {
                required: '이메일을 입력해 주세요.',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: '올바른 이메일 형식이 아닙니다.',
                },
              })}
            />
            {errors.email && (
              <span className={styles.errorMsg}>{errors.email.message}</span>
            )}
          </div>

          {/* Password */}
          <div className={styles.fieldGroup}>
            <label htmlFor="password" className={styles.label}>비밀번호</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              {...register('password', {
                required: '비밀번호를 입력해 주세요.',
                minLength: {
                  value: 6,
                  message: '비밀번호는 6자 이상이어야 합니다.',
                },
              })}
            />
            {errors.password && (
              <span className={styles.errorMsg}>{errors.password.message}</span>
            )}
          </div>

          {/* Server error */}
          {loginMutation.isError && (
            <div className={styles.serverError}>
              이메일 또는 비밀번호가 올바르지 않습니다.
            </div>
          )}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <span className={styles.spinner} />
            ) : (
              '로그인'
            )}
          </button>
        </form>

        <p className={styles.footer}>
          계정이 없으신가요?{' '}
          <a href="mailto:farm@taetaefarm.kr" className={styles.footerLink}>
            농장에 문의하기
          </a>
        </p>
      </div>
    </div>
  );
}
