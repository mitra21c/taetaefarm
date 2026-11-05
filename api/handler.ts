// Vercel 서버리스 진입점.
// server/package.json 이 "type": "commonjs" 라서 server/index.ts 는 CJS 로 번들되고,
// ESM(루트 "type": "module")에서 가져오면 default 가 { default: app } 형태가 될 수 있다.
// 어느 쪽이든 Express 앱 함수를 꺼내서 내보낸다.
import * as mod from '../server/index.js';

type Handler = (req: unknown, res: unknown) => void;
const m = mod as unknown as { default?: Handler | { default?: Handler } };
const app = (typeof m.default === 'function' ? m.default : m.default?.default) as Handler;

export default app;
