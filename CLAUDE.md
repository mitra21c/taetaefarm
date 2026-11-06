# CLAUDE.md

태태농장 웹 서비스. 구조·실행·환경변수는 README.md 참고.

## 작업 규칙

- 대화와 커밋 메시지는 한국어. 커밋은 `feat:` / `fix:` 접두어 (기존 기록과 동일).
- 파일명에 `readme.txt`가 들어간 파일은 수정하지 않는다.
- 개발 환경은 Windows. 저장소 줄바꿈은 LF로 유지한다.
- 비밀값(DB 접속정보, JWT 비밀키, Solapi 키, 비밀번호)을 코드에 직접 쓰지 않는다. `server/.env` + `requireEnv()` 사용, 새 변수는 `server/.env.example`과 README에도 추가.
- `ENCRYPTION_KEY`는 `server/index.ts`와 `src/utils/crypto.ts`가 같은 값이어야 한다.

## 구조 메모

- API는 전부 `server/index.ts` 한 파일. 경로는 `/api/...`. Vercel에서는 `api/handler.ts`가 같은 앱을 내보내고, `process.env.VERCEL`이 있으면 `listen`/WebSocket을 생략한다.
- DB는 MSSQL, 테이블: `users`, `orders`, `crop_prices`, `smart_farm_nodes`(스마트 팜 프로젝트 트리·문서, 첫 API 호출 때 자동 생성). 쿼리는 `db.request().input(...)` 파라미터 바인딩 사용.
- 권한(role): `admin`, `manager`, `user`. manager는 user 회원/주문만 다룬다.
- 프론트 API 호출은 `src/api/axiosInstance.ts` (401이면 `/api/auth/refresh`로 토큰 갱신).
- CSS는 페이지별 CSS Module(`*.module.css`), 색상은 `src/index.css`의 CSS 변수 사용.
- 스마트 팜(관수 자동화) 트리·내용은 `public/projects/과제 리스트.txt` + 과제별 `html.txt` 를 런타임에 읽는다 (`src/data/projectList.ts` 가 파싱·정리, `SMART_FARM_SOURCE = 'file'`). html.txt 는 저장소 파일이라 `HtmlContent` 로 표시하되 `htmlFromText` 의 정리(스크립트·on* 속성 제거)를 거친다.
- DB 방식(`SMART_FARM_SOURCE = 'db'`)의 문서는 TipTap 편집기(`src/components/editor/`). DB 에 저장된 HTML 은 누구나 쓸 수 있으므로 반드시 `DocViewer`(TipTap 재해석)로 표시한다.
- 스마트 팜 편집 권한은 현재 모두 허용. 관리자·매니저 전용으로 바꿀 때는 `server/index.ts`의 `canEditSmartFarm`과 `src/api/smartFarm.ts`의 `canEditSmartFarm`을 함께 바꾼다.

## 검증

- `npm run build` (tsc + vite build), `npm run lint`
- 서버: `npm run dev:server` 후 `http://localhost:8080/api/crop-prices`
