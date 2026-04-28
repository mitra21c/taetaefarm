import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { getUserInfo } from '../api/auth';
import styles from './MyPage.module.css';

const ROLE_LABEL: Record<string, string> = {
  admin: '관리자',
  user: '일반 회원',
};

export default function MyPage() {
  const { user } = useAuthContext();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['userInfo', user?.email],
    queryFn: () => getUserInfo(user!.email),
    enabled: !!user?.email,
  });

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* 헤더 */}
        <div className={styles.header}>
          <Link to="/" className={styles.backLink}>← 홈으로</Link>
          <div className={styles.logoWrap}>
            <span className={styles.logoEmoji}>🫐</span>
            <h1 className={styles.title}>태태농장</h1>
          </div>
          <p className={styles.subtitle}>회원 정보</p>
        </div>

        {/* 아바타 */}
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>
            {user?.name?.charAt(0) ?? '?'}
          </div>
          <div className={styles.avatarName}>{user?.name}</div>
          <div className={styles.avatarRole}>
            {ROLE_LABEL[user?.role ?? ''] ?? user?.role}
          </div>
        </div>

        {/* 정보 카드 */}
        {isLoading && (
          <div className={styles.loadingWrap}>
            <span className={styles.spinner} />
            <p>정보를 불러오는 중...</p>
          </div>
        )}

        {isError && (
          <div className={styles.errorBox}>
            회원 정보를 불러올 수 없습니다.
          </div>
        )}

        {data && (
          <div className={styles.infoList}>
            <InfoRow label="이름" value={data.name} />
            <InfoRow label="이메일" value={data.email} />
            <InfoRow label="전화번호" value={data.phone} />
            <InfoRow label="역할" value={ROLE_LABEL[data.role] ?? data.role} />
            <InfoRow label="추천인 E-Mail" value={data.reference_email || '없음'} />
            <InfoRow
              label="가입일"
              value={new Date(data.created_at).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            />
          </div>
        )}

        <Link to="/" className={styles.homeBtn}>메인으로 돌아가기</Link>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}
