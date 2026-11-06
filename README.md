# 태태농장 (taetaefarm)

태태농장 웹 서비스입니다. 농장·작물 소개, 스마트 팜(관수 자동화 프로젝트 문서), 회원가입/로그인, 상품 주문, 주문 현황, 회원 관리, 작물 가격 관리, 문자(SMS) 알림을 제공합니다.

## 기술 스택

| 구분 | 내용 |
|---|---|
| 프론트엔드 | React 19, TypeScript, Vite 8, React Router 7, TanStack Query, react-hook-form, TipTap(문서 편집기) |
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
  components/      Navbar, Footer, Placeholder
    editor/        문서 편집기 (TipTap: 툴바, 이미지·영상 URL 넣기, 읽기 화면)
    smartfarm/     스마트 팜 좌측 프로젝트 트리 (추가·이름 변경·삭제)
  data/            메뉴·작물 등 고정 데이터
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

## 스마트 팜 과제 (관수 자동화)

좌측 트리와 각 과제 내용은 **파일**에서 읽습니다. 파일만 고치고 새로고침하면 반영됩니다 (배포 사이트는 다시 배포 필요).

- 트리: `public/projects/과제 리스트.txt`
  ```
  - 관수 자동화 소개
  - 프로젝트
        └ 2027 년도
            └ 전남 장성 앞밭 : ./2027/전남 장성 앞밭/html.txt
            └ 테스트
  ```
  - 들여쓰기로 단계를 나눕니다 (앞의 `-`, `└` 표시는 모양일 뿐). 하위 항목이 있으면 폴더(+/-), 없으면 과제입니다.
  - `이름 : 경로` 로 상세 내용 파일을 연결합니다 (경로는 리스트 파일 기준). 경로 대신 `https://...` 주소를 적으면 그 사이트(블로그 등)를 화면 안에 보여 줍니다.
  - 상세 파일이 없거나 아직 만들지 않았으면 화면에 **작업 중** 으로 표시됩니다.
- 상세 내용: 각 과제의 `html.txt`
  - `<p>`, `<h2>`, `<div>` 같은 문단 태그를 쓰면 HTML 그대로 표시합니다.
  - 태그 없이 적으면 한 줄이 한 문단이 되고, `<img ...>` 처럼 태그로 시작하는 줄은 그대로, 주소만 있는 줄은 링크가 됩니다.
  - 이미지 주소는 GitHub Pages 주소(`https://mitra21c.github.io/data/...`)나 html.txt 와 같은 폴더의 파일 이름(상대 경로)을 쓸 수 있습니다.
  - 스크립트와 `onclick` 같은 이벤트 속성은 표시할 때 지워집니다.

화면에서 직접 편집하는 DB 방식(`smart_farm_nodes` 테이블, TipTap 편집기)도 코드에 남아 있습니다. `src/data/smartFarm.ts` 의 `SMART_FARM_SOURCE` 를 `'db'` 로 바꾸면 사용합니다 (DB 연결 필요).

| API (DB 방식) | 설명 |
|---|---|
| `GET /api/smart-farm/:area/nodes` | 트리 목록 (`area`: `irrigation`, `nutrient`) |
| `GET /api/smart-farm/nodes/:id` | 항목 하나 (문서 내용 포함) |
| `POST /api/smart-farm/:area/nodes` | 추가 `{ parent_id, node_type: 'folder'\|'page', label }` |
| `PATCH /api/smart-farm/nodes/:id` | 이름 변경 `{ label }` / 내용 저장 `{ content }` |
| `DELETE /api/smart-farm/nodes/:id` | 삭제 (하위 항목 포함) |
