import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getAllUsers } from '../api/auth';
import styles from './MembersPage.module.css';

const ROLE_LABEL: Record<string, string> = {
  admin: '관리자',
  user: '일반 회원',
};

export default function MembersPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['allUsers'],
    queryFn: getAllUsers,
  });

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        {/* 헤더 */}
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <Link to="/" className={styles.backLink}>← 홈으로</Link>
            <h1 className={styles.pageTitle}>
              <span className={styles.titleIcon}>👥</span>
              회원 정보 현황
            </h1>
          </div>
          <div className={styles.headerRight}>
            {data && (
              <span className={styles.totalBadge}>총 {data.length}명</span>
            )}
            <Link to="/login" className={styles.loginBtn}>로그인</Link>
          </div>
        </div>

        {/* 로딩 */}
        {isLoading && (
          <div className={styles.stateBox}>
            <span className={styles.spinner} />
            <p>회원 정보를 불러오는 중...</p>
          </div>
        )}

        {/* 오류 */}
        {isError && (
          <div className={styles.errorBox}>
            회원 정보를 불러올 수 없습니다. 서버 연결을 확인해 주세요.
          </div>
        )}

        {/* 테이블 */}
        {data && data.length === 0 && (
          <div className={styles.stateBox}>
            <p>등록된 회원이 없습니다.</p>
          </div>
        )}

        {data && data.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>이름</th>
                  <th>이메일</th>
                  <th>전화번호</th>
                  <th>역할</th>
                  <th>추천인 ID</th>
                  <th>가입일</th>
                </tr>
              </thead>
              <tbody>
                {data.map(user => (
                  <tr key={user.id}>
                    <td className={styles.tdId}>{user.id}</td>
                    <td className={styles.tdName}>{user.name}</td>
                    <td className={styles.tdEmail}>{user.email}</td>
                    <td>{user.phone}</td>
                    <td>
                      <span className={`${styles.roleBadge} ${user.role === 'admin' ? styles.roleAdmin : styles.roleUser}`}>
                        {ROLE_LABEL[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className={styles.tdCenter}>
                      {user.reference_id !== 0 ? user.reference_id : '-'}
                    </td>
                    <td className={styles.tdDate}>
                      {new Date(user.created_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
