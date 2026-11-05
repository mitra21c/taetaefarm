# 태태농장 (taetaefarm)

태태농장 웹 서비스입니다. 농장·작물 소개, 회원가입/로그인, 상품 주문, 주문 현황, 회원 관리, 작물 가격 관리, 문자(SMS) 알림을 제공합니다.

## 기술 스택

| 구분 | 내용 |
|---|---|
| 프론트엔드 | React 19, TypeScript, Vite 8, React Router 7, TanStack Query, react-hook-form |
| 백엔드 | Express 5 (`server/index.ts`), tsx로 실행 |
| DB | Microsoft SQL Server (`mssql`) |
| 인증 | JWT (accessToken 7일 / refreshToken 30일), 비밀번호는 CryptoJS AES 암호화 |
| 문자 | Solapi |
| 배포 | Vercel (`vercel.json`, API는 `api/handler.ts` 서버리스 함수) |

## 폴더 구조

```
api/handler.ts     Vercel 서버리스 진입점 (server/index.ts 의 Express 앱을 그대로 사용)
server/index.ts    Express API 서버 (로컬 개발 시 포트 8080, WebSocket TCP 프록시 포함)
src/               React 프론트엔드
  api/             axios 인스턴스, API 함수
  context/         AuthContext, SubMenuContext
  pages/           화면별 페이지 (+ CSS Module)
  components/      Navbar, Footer
```

## 개발 환경 준비 (Windows)

1. 프로젝트 폴더에서 설치 스크립트 실행 (Node.js, git 설정, npm 패키지, .env, 방화벽):
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\setup-windows.ps1
   ```
2. `server/.env` 값 채우기 (`server/.env.example` 참고). 필수값이 없으면 서버가 시작되지 않습니다.
3. PowerShell에서 `npm` 실행이 막히면 한 번만:
   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
   ```

Node.js 20.19 이상(22 LTS 권장)이 필요합니다.

## 실행

| 명령 | 설명 |
|---|---|
| `npm run dev` | API 서버(8080) + 화면(5173) 동시 실행 |
| `npm run dev:client` | 화면만 실행 |
| `npm run dev:server` | API 서버만 실행 |
| `npm run build` | 타입 체크 후 `dist/`로 빌드 |
| `npm run lint` | ESLint 검사 |

화면은 기본적으로 `http://<현재 호스트>:8080/api` 로 API를 호출합니다. 다른 주소를 쓰려면 루트 `.env`에 `VITE_API_BASE_URL`을 지정하세요.

## 환경변수

`server/.env` (로컬) / Vercel 프로젝트 환경변수 (배포)

| 이름 | 필수 | 설명 |
|---|---|---|
| `DB_SERVER`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | O (`DB_PORT` 제외) | MSSQL 접속 정보 |
| `JWT_SECRET` | O | JWT 서명 키 |
| `ADMIN_INIT_PASSWORD` | | users 테이블이 비어 있을 때 만드는 초기 관리자 비밀번호 |
| `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER` | | 비어 있으면 문자 발송 기능이 꺼짐 |

## 배포

`main` 브랜치를 Vercel에 연결해 배포합니다. 위 환경변수를 Vercel 프로젝트 설정(Settings → Environment Variables)에 등록해야 API가 동작합니다.
