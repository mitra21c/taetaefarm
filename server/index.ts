import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import jwt from 'jsonwebtoken';
import CryptoJS from 'crypto-js';
import { SolapiMessageService } from 'solapi';

const app = express();
const PORT = 8080;
// 필수 환경변수: 없으면 서버 시작 시 바로 오류를 낸다 (server/.env 또는 Vercel 환경변수)
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`환경변수 ${name} 가 설정되지 않았습니다. server/.env.example 을 참고하세요.`);
  return v;
}

// 클라이언트(src/utils/crypto.ts)와 같은 값을 써야 하며, 브라우저 번들에 포함되므로 비밀값이 아니다.
const ENCRYPTION_KEY = 'mitra21c';
const JWT_SECRET = requireEnv('JWT_SECRET');

const SOLAPI_API_KEY    = process.env.SOLAPI_API_KEY    ?? '';
const SOLAPI_API_SECRET = process.env.SOLAPI_API_SECRET ?? '';
const SOLAPI_SENDER     = process.env.SOLAPI_SENDER     ?? '';

let solapiService: SolapiMessageService | null = null;
function getSolapi() {
  if (!SOLAPI_API_KEY || !SOLAPI_API_SECRET || !SOLAPI_SENDER) return null;
  if (!solapiService) solapiService = new SolapiMessageService(SOLAPI_API_KEY, SOLAPI_API_SECRET);
  return solapiService;
}

app.use(cors({ origin: '*' }));
// 스마트 팜 문서 내용(HTML)을 받기 위해 기본 100KB 보다 크게
app.use(express.json({ limit: '2mb' }));

const dbConfig: sql.config = {
  server: requireEnv('DB_SERVER'),
  port: parseInt(process.env.DB_PORT ?? '1433', 10),
  user: requireEnv('DB_USER'),
  password: requireEnv('DB_PASSWORD'),
  database: requireEnv('DB_NAME'),
  options: { encrypt: false, trustServerCertificate: true },
};

let pool: sql.ConnectionPool;
async function getPool() {
  if (!pool || !pool.connected) pool = await sql.connect(dbConfig);
  return pool;
}

function decryptPassword(encrypted: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// ─────────────────────────── AUTH ───────────────────────────

// 로그인
app.post('/api/auth/login', async (req, res) => {
  const { name, phone, password } = req.body as { name: string; phone: string; password: string };
  if (!name || !phone || !password) {
    res.status(400).json({ message: '성명, 연락처, 비밀번호를 모두 입력해 주세요.' });
    return;
  }
  try {
    const normalizedPhone = phone.replace(/-/g, '');
    const db = await getPool();
    const result = await db.request()
      .input('name',  sql.NVarChar, name.trim())
      .input('phone', sql.VarChar,  normalizedPhone)
      .query(`SELECT TOP 1 id, name, email, pass, role, [use]
              FROM users
              WHERE name = @name AND REPLACE(phone, '-', '') = @phone`);
    if (result.recordset.length === 0) {
      res.status(401).json({ message: '성명, 연락처 또는 비밀번호가 올바르지 않습니다.' });
      return;
    }
    const user = result.recordset[0];
    let inputPlain: string;
    let storedPlain: string;
    try {
      inputPlain  = decryptPassword(password);
      storedPlain = decryptPassword(user.pass);
    } catch {
      res.status(401).json({ message: '성명, 연락처 또는 비밀번호가 올바르지 않습니다.' });
      return;
    }
    if (!inputPlain || inputPlain !== storedPlain) {
      res.status(401).json({ message: '성명, 연락처 또는 비밀번호가 올바르지 않습니다.' });
      return;
    }
    if (user.role !== 'admin' && user.use !== 'Y') {
      res.status(403).json({ message: '관리자 승인 대기 중입니다. 관리자에게 문의 하세요.' });
      return;
    }
    const payload = { sub: String(user.id), email: user.email, name: user.name, role: user.role };
    const accessToken  = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    const refreshToken = jwt.sign({ sub: String(user.id) }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 토큰 갱신 (refreshToken → 새 accessToken)
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = (req.body ?? {}) as { refreshToken?: string };
  if (!refreshToken) { res.status(400).json({ message: 'refreshToken 이 필요합니다.' }); return; }
  let userId: string;
  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET) as { sub?: string };
    if (!payload.sub) throw new Error('sub 없음');
    userId = payload.sub;
  } catch {
    res.status(401).json({ message: '유효하지 않은 토큰입니다. 다시 로그인해 주세요.' }); return;
  }
  try {
    const db = await getPool();
    const result = await db.request()
      .input('id', sql.Int, parseInt(userId, 10))
      .query('SELECT TOP 1 id, name, email, role, [use] FROM users WHERE id = @id');
    const user = result.recordset[0];
    // 탈퇴했거나 승인이 취소된 회원은 갱신하지 않는다 (로그인 규칙과 동일)
    if (!user || (user.role !== 'admin' && user.use !== 'Y')) {
      res.status(401).json({ message: '다시 로그인해 주세요.' }); return;
    }
    const payload = { sub: String(user.id), email: user.email, name: user.name, role: user.role };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    res.json({ accessToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 로그아웃
app.post('/api/auth/logout', (_req, res) => {
  res.json({ message: '로그아웃 되었습니다.' });
});

// 전화번호 중복 확인
app.post('/api/auth/check-duplicate', async (req, res) => {
  const { phone } = req.body as { phone: string };
  if (!phone) {
    res.status(400).json({ message: '전화번호를 입력해 주세요.' });
    return;
  }
  try {
    const normalizedPhone = phone.replace(/-/g, '');
    const db = await getPool();
    const result = await db.request()
      .input('phone', sql.VarChar, normalizedPhone)
      .query(`SELECT TOP 1 id FROM users WHERE REPLACE(phone, '-', '') = @phone`);
    res.json({ isDuplicate: result.recordset.length > 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 추천인 인증
app.post('/api/auth/verify-referrer', async (req, res) => {
  const { name, phone } = req.body as { name: string; phone: string };
  if (!name || !phone) {
    res.status(400).json({ message: '추천인 성명과 연락처를 입력해 주세요.' });
    return;
  }
  try {
    const normalizedPhone = phone.replace(/-/g, '');
    const db = await getPool();
    const result = await db.request()
      .input('name', sql.NVarChar, name.trim())
      .input('phone', sql.VarChar, normalizedPhone)
      .query(`SELECT TOP 1 email FROM users WHERE name = @name AND REPLACE(phone, '-', '') = @phone`);
    if (result.recordset.length === 0) {
      res.json({ found: false });
    } else {
      res.json({ found: true, referrerEmail: result.recordset[0].email });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 회원가입
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, phone, address, post, referrerEmail, referrerName } =
    req.body as {
      name: string; email: string; password: string;
      phone: string; address: string; post: string;
      referrerEmail?: string; referrerName?: string;
    };
  if (!name || !email || !password || !phone || !address || !post) {
    res.status(400).json({ message: '필수 항목을 모두 입력해 주세요.' });
    return;
  }
  try {
    const db = await getPool();
    await db.request()
      .input('name',            sql.NVarChar, name.trim())
      .input('email',           sql.VarChar,  email.trim().toLowerCase())
      .input('pass',            sql.VarChar,  password)
      .input('phone',           sql.VarChar,  phone.trim())
      .input('address',         sql.NVarChar, address.trim())
      .input('post',            sql.VarChar,  post.trim())
      .input('reference_email', sql.VarChar,  referrerEmail ?? null)
      .query(`INSERT INTO users (name, email, pass, phone, address, post, role, reference_email)
              VALUES (@name, @email, @pass, @phone, @address, @post, 'user', @reference_email)`);

    const solapi = getSolapi();
    let smsError = false;
    if (solapi) {
      const smsText = `신규 회원 가입\n성명 : ${name.trim()}\n연락처 : ${phone.trim()}\n추천인 성명 : ${referrerName?.trim() || '없음'}`;
      try {
        await solapi.send({ to: '01052570412', from: SOLAPI_SENDER, text: smsText });
      } catch (err) {
        console.error('회원가입 알림 SMS 오류:', err);
        smsError = true;
      }
    }

    res.status(201).json({ message: '회원가입이 완료되었습니다.', smsError });
  } catch (err: any) {
    if (err.number === 2627 || err.number === 2601) {
      res.status(409).json({ message: '이미 등록된 이메일입니다.' });
    } else {
      console.error(err);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
});

// ─────────────────────────── USERS ───────────────────────────

// 전체 회원 목록 조회
app.get('/api/users', async (_req, res) => {
  try {
    const db = await getPool();
    const result = await db.request().query(`
      SELECT u.id, u.name, u.phone, u.email, u.address, u.post,
             u.role, u.reference_email, u.[use], u.created_at, u.modified_at,
             r.name AS referrer_name, r.phone AS referrer_phone
      FROM users u
      LEFT JOIN users r ON r.email = u.reference_email
                       AND u.reference_email IS NOT NULL
                       AND u.reference_email <> ''
      ORDER BY u.id ASC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 회원 정보 수정
app.patch('/api/users/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { role, use } = req.body as { role?: string; use?: string };
  const sets: string[] = [];
  const db = await getPool();
  const req2 = db.request().input('id', sql.Int, id);
  if (role) { req2.input('role', sql.VarChar, role); sets.push('role = @role'); }
  if (use === 'Y' || use === 'N') { req2.input('use', sql.VarChar, use); sets.push('[use] = @use'); }
  if (sets.length === 0) { res.status(400).json({ message: '변경할 항목이 없습니다.' }); return; }
  try {
    const result = await req2.query(
      `UPDATE users SET ${sets.join(', ')}, modified_at = GETDATE() WHERE id = @id`
    );
    if (result.rowsAffected[0] === 0) {
      res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
      return;
    }
    if (use === 'Y') {
      const phoneResult = await db.request()
        .input('id', sql.Int, id)
        .query(`SELECT phone FROM users WHERE id = @id`);
      const phone: string | null = phoneResult.recordset[0]?.phone ?? null;
      const solapi = getSolapi();
      if (solapi && phone) {
        solapi.send({
          to: phone.replace(/-/g, ''),
          from: SOLAPI_SENDER,
          text: '가입 승인이 완료 되었습니다.\n태태팜 사이트(https://taetaefarm.vercel.app/farm)에 접속하여 로그인 하신 후 사용하시기 바랍니다.',
        }).catch(err => console.error('승인 SMS 발송 오류:', err));
      }
    }
    res.json({ message: '수정되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 회원 삭제
app.delete('/api/users/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const db = await getPool();
    const result = await db.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM users WHERE id = @id');
    result.rowsAffected[0] === 0
      ? res.status(404).json({ message: '사용자를 찾을 수 없습니다.' })
      : res.json({ message: '삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 회원 승인 / 승인 취소
app.patch('/api/users/:id/approve', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { use } = req.body as { use: 'Y' | 'N' };
  if (use !== 'Y' && use !== 'N') { res.status(400).json({ message: '유효하지 않은 승인 값입니다.' }); return; }
  try {
    const db = await getPool();
    const result = await db.request()
      .input('use', sql.VarChar, use)
      .input('id',  sql.Int,     id)
      .query(`UPDATE users SET [use] = @use, modified_at = GETDATE() WHERE id = @id`);
    result.rowsAffected[0] === 0
      ? res.status(404).json({ message: '사용자를 찾을 수 없습니다.' })
      : res.json({ message: use === 'Y' ? '승인되었습니다.' : '승인이 취소되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 회원 일괄 업로드 (Excel)
app.post('/api/users/bulk', async (req, res) => {
  const { users } = req.body as {
    users: Array<{
      name: string; phone: string; email: string;
      address: string; post: string; role?: string;
      pass?: string; reference_email?: string; use?: string;
    }>;
  };
  if (!Array.isArray(users) || users.length === 0) {
    res.status(400).json({ message: '업로드할 데이터가 없습니다.' });
    return;
  }
  try {
    const db = await getPool();
    let count = 0;
    for (const u of users) {
      if (!u.name || !u.email || !u.phone) continue;
      const encPass = u.pass ? CryptoJS.AES.encrypt(u.pass, ENCRYPTION_KEY).toString() : '';
      await db.request()
        .input('name',            sql.NVarChar, u.name.trim())
        .input('phone',           sql.VarChar,  u.phone.trim())
        .input('email',           sql.VarChar,  u.email.trim().toLowerCase())
        .input('address',         sql.NVarChar, (u.address ?? '').trim())
        .input('post',            sql.VarChar,  (u.post ?? '').trim())
        .input('role',            sql.VarChar,  u.role ?? 'user')
        .input('pass',            sql.VarChar,  encPass)
        .input('reference_email', sql.VarChar,  u.reference_email?.trim() || null)
        .input('use',             sql.VarChar,  u.use ?? 'N')
        .query(`
          MERGE users AS target
          USING (SELECT @email AS email) AS source ON target.email = source.email
          WHEN MATCHED THEN
            UPDATE SET name = @name, phone = @phone, address = @address,
                       post = @post, role = @role, reference_email = @reference_email,
                       [use] = @use, modified_at = GETDATE()
          WHEN NOT MATCHED THEN
            INSERT (name, phone, email, address, post, role, pass, reference_email, [use])
            VALUES (@name, @phone, @email, @address, @post, @role, @pass, @reference_email, @use);
        `);
      count++;
    }
    res.json({ message: `${count}건 처리 완료` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 회원 정보 조회 (이메일 기준)
app.get('/api/users/email/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const db = await getPool();
    const result = await db.request()
      .input('email', sql.VarChar, decodeURIComponent(email).trim().toLowerCase())
      .query(`SELECT id, name, email, phone, address, post, role, reference_email, created_at
              FROM users WHERE email = @email`);
    result.recordset.length === 0
      ? res.status(404).json({ message: '사용자를 찾을 수 없습니다.' })
      : res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─────────────────────────── ORDERS ───────────────────────────

// 주문 등록
app.post('/api/orders', async (req, res) => {
  const {
    user_id, name, phone, email,
    order_item, order_weight, order_price,
    receiver_name, receiver_phone, receiver_address, receiver_post,
  } = req.body as {
    user_id: number; name: string; phone: string; email: string;
    order_item: string; order_weight: number; order_price: number;
    receiver_name: string; receiver_phone: string; receiver_address: string; receiver_post: string;
  };
  if (!user_id || !name || !phone || !email || !order_item || !order_weight || !order_price ||
      !receiver_name || !receiver_phone || !receiver_address || !receiver_post) {
    res.status(400).json({ message: '필수 항목을 모두 입력해 주세요.' });
    return;
  }
  try {
    const db = await getPool();
    const refResult = await db.request()
      .input('user_id', sql.Int, user_id)
      .query(`SELECT TOP 1 u2.email AS ref_email, u2.name AS ref_name
              FROM users u1
              LEFT JOIN users u2 ON u2.email = u1.reference_email
              WHERE u1.id = @user_id`);
    const refRow = refResult.recordset[0];
    const reference_email = refRow?.ref_email ?? null;
    const reference_name  = refRow?.ref_name  ?? '';

    await db.request()
      .input('user_id',          sql.Int,      user_id)
      .input('name',             sql.NVarChar, name)
      .input('phone',            sql.VarChar,  phone)
      .input('email',            sql.VarChar,  email)
      .input('order_item',       sql.NVarChar, order_item)
      .input('order_weight',     sql.Int,      order_weight)
      .input('order_price',      sql.Int,      order_price)
      .input('reference_email',  sql.VarChar,  reference_email)
      .input('reference_name',   sql.NVarChar, reference_name)
      .input('receiver_name',    sql.NVarChar, receiver_name)
      .input('receiver_phone',   sql.VarChar,  receiver_phone)
      .input('receiver_address', sql.NVarChar, receiver_address)
      .input('receiver_post',    sql.VarChar,  receiver_post)
      .query(`INSERT INTO orders
                (user_id, name, phone, email,
                 order_item, order_weight, order_price,
                 reference_email, reference_name,
                 receiver_name, receiver_phone, receiver_address, receiver_post)
              VALUES
                (@user_id, @name, @phone, @email,
                 @order_item, @order_weight, @order_price,
                 @reference_email, @reference_name,
                 @receiver_name, @receiver_phone, @receiver_address, @receiver_post)`);

    const solapi = getSolapi();
    let smsError = false;
    if (solapi) {
      const smsText = `신규 주문\n성명 : ${name}\n연락처 : ${phone}\n추천인 성명 : ${reference_name || '없음'}\n주문 항목(종류/무게/금액) : ${order_item} / ${order_weight}Kg / ${order_price.toLocaleString()}원`;
      try {
        await solapi.send({ to: '01052570412', from: SOLAPI_SENDER, text: smsText });
      } catch (err) {
        console.error('주문 알림 SMS 발송 오류:', err);
        smsError = true;
      }
    }

    res.status(201).json({ message: '주문이 완료되었습니다.', smsError });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 주문 상태 변경
app.patch('/api/orders/:id/status', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { delivery_status } = req.body as { delivery_status: string };
  const ALLOWED = ['주문대기', '주문완료', '배송중', '입금완료', '판매불가'];
  if (!delivery_status || !ALLOWED.includes(delivery_status)) {
    res.status(400).json({ message: '유효하지 않은 상태값입니다.' });
    return;
  }
  try {
    const db = await getPool();
    const result = await db.request()
      .input('delivery_status', sql.NVarChar, delivery_status)
      .input('id',              sql.Int,      id)
      .query(`UPDATE orders SET delivery_status = @delivery_status, modified_at = GETDATE() WHERE id = @id`);
    if (result.rowsAffected[0] === 0) {
      res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
      return;
    }

    const orderResult = await db.request()
      .input('id', sql.Int, id)
      .query(`SELECT name, phone, email, order_item, order_weight, order_price, reference_name FROM orders WHERE id = @id`);
    const o = orderResult.recordset[0];

    const solapi = getSolapi();
    let smsError = false;
    if (solapi && o) {
      const smsText = `주문 상태 변경\n구매자 성명 : ${o.name}\n상품 정보(종류/무게/금액) : ${o.order_item} / ${o.order_weight}Kg / ${o.order_price.toLocaleString()}원\n주문 상태 : ${delivery_status}`;
      try {
        await solapi.send({ to: o.phone.replace(/-/g, ''), from: SOLAPI_SENDER, text: smsText });
      } catch (err) {
        console.error('상태 변경 SMS 발송 오류:', err);
        smsError = true;
      }
    }

    res.json({ message: '상태가 변경되었습니다.', smsError });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 주문 목록 조회
app.get('/api/orders', async (req, res) => {
  const { email, year } = req.query as { email?: string; year?: string };
  const yearNum = year ? parseInt(year, 10) : null;
  try {
    const db = await getPool();
    const req2 = db.request();
    let query = `
      SELECT o.*, ISNULL(u.role, 'user') AS orderer_role
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      WHERE 1=1`;
    if (email) {
      req2.input('email', sql.VarChar, email.trim().toLowerCase());
      query += ` AND o.email = @email`;
    }
    if (yearNum) {
      req2.input('year', sql.Int, yearNum);
      query += ` AND YEAR(o.created_at) = @year`;
    }
    query += ` ORDER BY o.created_at DESC`;
    const result = await req2.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─────────────────────────── CROP PRICES ───────────────────────────

const CROP_NAMES = ['블루베리', '태추', '대봉', '울금', '감 말랭이'];

async function ensureCropPricesTable() {
  const db = await getPool();
  await db.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='crop_prices' AND xtype='U')
    CREATE TABLE crop_prices (
      crop_name NVARCHAR(50) PRIMARY KEY,
      weight    FLOAT        NOT NULL DEFAULT 1,
      price     INT          NOT NULL DEFAULT 10000,
      available CHAR(1)      NOT NULL DEFAULT 'N',
      modified_at DATETIME DEFAULT GETDATE()
    )
  `);
  for (const name of CROP_NAMES) {
    await db.request()
      .input('name', sql.NVarChar, name)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM crop_prices WHERE crop_name = @name)
        INSERT INTO crop_prices (crop_name, weight, price, available)
        VALUES (@name, 1, 10000, 'N')
      `);
  }
}

app.get('/api/crop-prices', async (_req, res) => {
  try {
    await ensureCropPricesTable();
    const db = await getPool();
    const result = await db.request().query(
      `SELECT crop_name, weight, price, available FROM crop_prices`
    );
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

app.put('/api/crop-prices', async (req, res) => {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7) : null;
  if (!token) { res.status(401).json({ message: '인증이 필요합니다.' }); return; }
  let role: string;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { role?: string };
    role = payload.role ?? '';
  } catch {
    res.status(401).json({ message: '유효하지 않은 토큰입니다.' }); return;
  }
  if (role !== 'admin' && role !== 'manager') {
    res.status(403).json({ message: '권한이 없습니다.' }); return;
  }
  const { prices } = req.body as {
    prices: Array<{ crop_name: string; weight: number; price: number; available: 'Y' | 'N' }>;
  };
  if (!Array.isArray(prices) || prices.length === 0) {
    res.status(400).json({ message: '잘못된 요청입니다.' }); return;
  }
  try {
    await ensureCropPricesTable();
    const db = await getPool();
    for (const p of prices) {
      await db.request()
        .input('crop_name', sql.NVarChar, p.crop_name)
        .input('weight',    sql.Float,    p.weight)
        .input('price',     sql.Int,      p.price)
        .input('available', sql.Char(1),  p.available)
        .query(`
          UPDATE crop_prices
          SET weight = @weight, price = @price, available = @available, modified_at = GETDATE()
          WHERE crop_name = @crop_name
        `);
    }
    res.json({ message: '저장되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─────────────────────────── SMART FARM ───────────────────────────
// 스마트 팜 화면(관수 자동화 등)의 좌측 프로젝트 트리와 각 페이지 내용
//   node_type: 'folder'(묶음, 예: 2027년도) / 'page'(내용이 있는 프로젝트, 예: 전남 장성 앞밭)
//   content  : 문서 편집기(TipTap)가 만든 HTML. 이미지·영상은 GitHub 등에 올린 파일의 URL 만 담는다.

const SMART_FARM_AREAS = ['irrigation', 'nutrient'];
const SMART_FARM_LABEL_MAX = 100;
const SMART_FARM_CONTENT_MAX = 1_000_000; // 약 1MB (HTML 글자 수)

// 편집 권한: 지금은 누구나 편집 가능.
// 관리자·매니저만 허용하려면 아래 return true 를 지우고 주석 처리된 코드를 쓰면 된다
// (화면 쪽은 src/pages/SmartFarmPage.tsx 의 canEdit 도 함께 바꾼다).
function canEditSmartFarm(_req: express.Request): boolean {
  return true;
  // const token = _req.headers.authorization?.startsWith('Bearer ') ? _req.headers.authorization.slice(7) : null;
  // if (!token) return false;
  // try {
  //   const { role } = jwt.verify(token, JWT_SECRET) as { role?: string };
  //   return role === 'admin' || role === 'manager';
  // } catch { return false; }
}

function requireSmartFarmEditor(req: express.Request, res: express.Response): boolean {
  if (canEditSmartFarm(req)) return true;
  res.status(403).json({ message: '편집 권한이 없습니다.' });
  return false;
}

let smartFarmTableReady = false;
async function ensureSmartFarmTable() {
  if (smartFarmTableReady) return;
  const db = await getPool();
  await db.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='smart_farm_nodes' AND xtype='U')
    CREATE TABLE smart_farm_nodes (
      id          INT IDENTITY(1,1) PRIMARY KEY,
      area        VARCHAR(30)   NOT NULL,
      parent_id   INT           NULL,
      node_type   VARCHAR(10)   NOT NULL DEFAULT 'page',
      label       NVARCHAR(100) NOT NULL,
      sort_order  INT           NOT NULL DEFAULT 0,
      content     NVARCHAR(MAX) NULL,
      created_at  DATETIME      DEFAULT GETDATE(),
      modified_at DATETIME      NULL
    )
  `);
  // 처음 만들 때만 기본 트리: 2027년도 └ 전남 장성 앞밭
  const cnt = await db.request()
    .input('area', sql.VarChar, 'irrigation')
    .query(`SELECT COUNT(*) AS cnt FROM smart_farm_nodes WHERE area = @area`);
  if (cnt.recordset[0].cnt === 0) {
    const year = await db.request()
      .input('area',  sql.VarChar,  'irrigation')
      .input('label', sql.NVarChar, '2027년도')
      .query(`INSERT INTO smart_farm_nodes (area, parent_id, node_type, label, sort_order)
              OUTPUT INSERTED.id VALUES (@area, NULL, 'folder', @label, 0)`);
    await db.request()
      .input('area',   sql.VarChar,  'irrigation')
      .input('parent', sql.Int,      year.recordset[0].id)
      .input('label',  sql.NVarChar, '전남 장성 앞밭')
      .query(`INSERT INTO smart_farm_nodes (area, parent_id, node_type, label, sort_order)
              VALUES (@area, @parent, 'page', @label, 0)`);
  }
  smartFarmTableReady = true;
}

function cleanLabel(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const label = v.trim();
  return label && label.length <= SMART_FARM_LABEL_MAX ? label : null;
}

// 트리 목록 (내용 제외)
app.get('/api/smart-farm/:area/nodes', async (req, res) => {
  const { area } = req.params;
  if (!SMART_FARM_AREAS.includes(area)) { res.status(404).json({ message: '없는 메뉴입니다.' }); return; }
  try {
    await ensureSmartFarmTable();
    const db = await getPool();
    const result = await db.request()
      .input('area', sql.VarChar, area)
      .query(`SELECT id, parent_id, node_type, label, sort_order
              FROM smart_farm_nodes WHERE area = @area ORDER BY sort_order, id`);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 항목 하나 (내용 포함)
app.get('/api/smart-farm/nodes/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) { res.status(400).json({ message: '잘못된 요청입니다.' }); return; }
  try {
    await ensureSmartFarmTable();
    const db = await getPool();
    const result = await db.request()
      .input('id', sql.Int, id)
      .query(`SELECT id, area, parent_id, node_type, label, content, created_at, modified_at
              FROM smart_farm_nodes WHERE id = @id`);
    result.recordset.length === 0
      ? res.status(404).json({ message: '항목을 찾을 수 없습니다.' })
      : res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 항목 추가 (parent_id 가 없으면 '프로젝트' 바로 아래)
app.post('/api/smart-farm/:area/nodes', async (req, res) => {
  if (!requireSmartFarmEditor(req, res)) return;
  const { area } = req.params;
  if (!SMART_FARM_AREAS.includes(area)) { res.status(404).json({ message: '없는 메뉴입니다.' }); return; }
  const { parent_id, node_type, label } = (req.body ?? {}) as { parent_id?: number | null; node_type?: string; label?: unknown };
  const name = cleanLabel(label);
  if (!name) { res.status(400).json({ message: `이름을 1~${SMART_FARM_LABEL_MAX}자로 입력해 주세요.` }); return; }
  if (node_type !== 'folder' && node_type !== 'page') { res.status(400).json({ message: '종류가 올바르지 않습니다.' }); return; }
  const parentId = parent_id ? Number(parent_id) : null;
  try {
    await ensureSmartFarmTable();
    const db = await getPool();
    if (parentId) {
      const parent = await db.request()
        .input('id', sql.Int, parentId).input('area', sql.VarChar, area)
        .query(`SELECT node_type FROM smart_farm_nodes WHERE id = @id AND area = @area`);
      if (parent.recordset.length === 0) { res.status(404).json({ message: '상위 항목을 찾을 수 없습니다.' }); return; }
      if (parent.recordset[0].node_type !== 'folder') { res.status(400).json({ message: '폴더 아래에만 추가할 수 있습니다.' }); return; }
    }
    const result = await db.request()
      .input('area',   sql.VarChar,  area)
      .input('parent', sql.Int,      parentId)
      .input('type',   sql.VarChar,  node_type)
      .input('label',  sql.NVarChar, name)
      .query(`INSERT INTO smart_farm_nodes (area, parent_id, node_type, label, sort_order)
              OUTPUT INSERTED.id, INSERTED.parent_id, INSERTED.node_type, INSERTED.label, INSERTED.sort_order
              SELECT @area, @parent, @type, @label, ISNULL(MAX(sort_order), -1) + 1
              FROM smart_farm_nodes
              WHERE area = @area AND ((@parent IS NULL AND parent_id IS NULL) OR parent_id = @parent)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 이름 변경 / 내용 저장
app.patch('/api/smart-farm/nodes/:id', async (req, res) => {
  if (!requireSmartFarmEditor(req, res)) return;
  const id = parseInt(req.params.id, 10);
  if (!id) { res.status(400).json({ message: '잘못된 요청입니다.' }); return; }
  const { label, content } = (req.body ?? {}) as { label?: unknown; content?: unknown };
  let name: string | null = null;
  if (label !== undefined) {
    name = cleanLabel(label);
    if (!name) { res.status(400).json({ message: `이름을 1~${SMART_FARM_LABEL_MAX}자로 입력해 주세요.` }); return; }
  }
  if (content !== undefined && (typeof content !== 'string' || content.length > SMART_FARM_CONTENT_MAX)) {
    res.status(400).json({ message: '내용이 너무 깁니다.' }); return;
  }
  if (name === null && content === undefined) { res.status(400).json({ message: '변경할 항목이 없습니다.' }); return; }
  try {
    await ensureSmartFarmTable();
    const request = (await getPool()).request().input('id', sql.Int, id);
    const sets: string[] = [];
    if (name !== null) { request.input('label', sql.NVarChar, name); sets.push('label = @label'); }
    if (content !== undefined) { request.input('content', sql.NVarChar(sql.MAX), content as string); sets.push('content = @content'); }
    const result = await request.query(
      `UPDATE smart_farm_nodes SET ${sets.join(', ')}, modified_at = GETDATE() WHERE id = @id`
    );
    result.rowsAffected[0] === 0
      ? res.status(404).json({ message: '항목을 찾을 수 없습니다.' })
      : res.json({ message: '저장되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 삭제 (하위 항목까지 모두)
app.delete('/api/smart-farm/nodes/:id', async (req, res) => {
  if (!requireSmartFarmEditor(req, res)) return;
  const id = parseInt(req.params.id, 10);
  if (!id) { res.status(400).json({ message: '잘못된 요청입니다.' }); return; }
  try {
    await ensureSmartFarmTable();
    const db = await getPool();
    const result = await db.request()
      .input('id', sql.Int, id)
      .query(`WITH tree AS (
                SELECT id FROM smart_farm_nodes WHERE id = @id
                UNION ALL
                SELECT n.id FROM smart_farm_nodes n JOIN tree t ON n.parent_id = t.id
              )
              DELETE FROM smart_farm_nodes WHERE id IN (SELECT id FROM tree)`);
    result.rowsAffected[0] === 0
      ? res.status(404).json({ message: '항목을 찾을 수 없습니다.' })
      : res.json({ message: '삭제되었습니다.', deleted: result.rowsAffected[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─────────────────────────── SMS ───────────────────────────

// 단일 문자 발송
app.post('/api/sms/send', async (req, res) => {
  const { to, text } = req.body as { to: string; text: string };
  if (!to || !text) {
    res.status(400).json({ message: '수신번호와 메시지 내용을 입력해 주세요.' });
    return;
  }
  const solapi = getSolapi();
  if (!solapi) {
    res.status(503).json({ message: 'SMS 서비스가 설정되지 않았습니다. SOLAPI_API_SECRET, SOLAPI_SENDER 환경변수를 확인해 주세요.' });
    return;
  }
  try {
    const result = await solapi.send({
      to: to.replace(/-/g, ''),
      from: SOLAPI_SENDER,
      text,
    });
    res.json({ message: '발송되었습니다.', result });
  } catch (err: any) {
    console.error('SMS 발송 오류:', err);
    res.status(500).json({ message: 'SMS 발송에 실패했습니다.', error: err.message });
  }
});

// 대량 문자 발송
app.post('/api/sms/send-bulk', async (req, res) => {
  const { messages } = req.body as { messages: Array<{ to: string; text: string }> };
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ message: '발송할 메시지 목록을 입력해 주세요.' });
    return;
  }
  const solapi = getSolapi();
  if (!solapi) {
    res.status(503).json({ message: 'SMS 서비스가 설정되지 않았습니다. SOLAPI_API_SECRET, SOLAPI_SENDER 환경변수를 확인해 주세요.' });
    return;
  }
  try {
    const result = await solapi.send(
      messages.map(m => ({
        to: m.to.replace(/-/g, ''),
        from: SOLAPI_SENDER,
        text: m.text,
      })),
    );
    res.json({ message: `${messages.length}건 발송 요청되었습니다.`, result });
  } catch (err: any) {
    console.error('SMS 대량 발송 오류:', err);
    res.status(500).json({ message: 'SMS 발송에 실패했습니다.', error: err.message });
  }
});

// 회원 전체에게 문자 발송 (DB 기반)
app.post('/api/sms/send-all-users', async (req, res) => {
  const { text } = req.body as { text: string };
  if (!text) {
    res.status(400).json({ message: '메시지 내용을 입력해 주세요.' });
    return;
  }
  const solapi = getSolapi();
  if (!solapi) {
    res.status(503).json({ message: 'SMS 서비스가 설정되지 않았습니다. SOLAPI_API_SECRET, SOLAPI_SENDER 환경변수를 확인해 주세요.' });
    return;
  }
  try {
    const db = await getPool();
    const dbResult = await db.request()
      .query(`SELECT name, phone FROM users WHERE [use] = 'Y' AND phone IS NOT NULL AND phone <> ''`);
    const recipients: Array<{ name: string; phone: string }> = dbResult.recordset;
    if (recipients.length === 0) {
      res.status(404).json({ message: '발송 대상 회원이 없습니다.' });
      return;
    }
    const result = await solapi.send(
      recipients.map(r => ({ to: r.phone.replace(/-/g, ''), from: SOLAPI_SENDER, text })),
    );
    res.json({ message: `${recipients.length}명에게 발송 요청되었습니다.`, result, recipients });
  } catch (err: any) {
    console.error('SMS 전체 발송 오류:', err);
    res.status(500).json({ message: 'SMS 발송에 실패했습니다.', error: err.message });
  }
});

// ─────────────────────────── SOCKET TEST ───────────────────────────

import net from 'net';
import fs  from 'fs';
import { WebSocketServer } from 'ws';

function windowsHostIp(): string {
  try {
    const m = fs.readFileSync('/etc/resolv.conf', 'utf8').match(/nameserver\s+([\d.]+)/);
    return m ? m[1] : '127.0.0.1';
  } catch {
    return '127.0.0.1';
  }
}

function resolveIp(ip: string): string {
  return (ip === 'localhost' || ip === '127.0.0.1') ? windowsHostIp() : ip;
}

function socketErrMsg(e: NodeJS.ErrnoException): string {
  switch (e.code) {
    case 'ECONNREFUSED': return `연결 거부됨 — ${e.address}:${e.port} 포트가 닫혀 있습니다`;
    case 'ETIMEDOUT':    return '타임아웃 — 응답이 없습니다';
    case 'ENOTFOUND':    return `호스트를 찾을 수 없습니다 (${e.hostname ?? e.message})`;
    case 'ENETUNREACH':  return '네트워크 도달 불가';
    case 'ECONNRESET':   return '연결이 원격에서 끊겼습니다';
    default:             return e.message;
  }
}

// ─────────────────────────── INIT ───────────────────────────

async function initAdmin() {
  try {
    const db = await getPool();
    const result = await db.request().query('SELECT COUNT(*) AS cnt FROM users');
    if (parseInt(result.recordset[0].cnt, 10) > 0) return;
    const adminPassword = process.env.ADMIN_INIT_PASSWORD;
    if (!adminPassword) {
      console.warn('⚠️  users 테이블이 비어 있지만 ADMIN_INIT_PASSWORD 가 없어 기본 관리자 계정을 만들지 않았습니다.');
      return;
    }
    const encPass = CryptoJS.AES.encrypt(adminPassword, ENCRYPTION_KEY).toString();
    await db.request()
      .input('name',    sql.NVarChar, '김민창')
      .input('phone',   sql.VarChar,  '010-5257-0412')
      .input('email',   sql.VarChar,  'mitra21c@naver.com')
      .input('address', sql.NVarChar, '광주광역시 광산구 수완로 73번길 40 대주피오레 602-306')
      .input('post',    sql.VarChar,  '12345')
      .input('pass',    sql.VarChar,  encPass)
      .query(`INSERT INTO users (name, phone, email, address, post, role, pass, [use])
              VALUES (@name, @phone, @email, @address, @post, 'admin', @pass, 'Y')`);
    console.log('✅  기본 관리자 계정이 등록되었습니다.');
  } catch (err) {
    console.error('관리자 초기화 오류:', err);
  }
}

export default app;

if (!process.env.VERCEL) {
  const httpServer = app.listen(PORT, '0.0.0.0', async () => {
    console.log(`✅  API 서버 실행 중 → http://localhost:${PORT}`);
    await initAdmin();
  });

  const wss = new WebSocketServer({ server: httpServer, path: '/ws/socket-proxy' });

  wss.on('connection', (ws, req) => {
    const params = new URL(req.url!, `http://localhost`).searchParams;
    const ip     = resolveIp(params.get('ip')   ?? '');
    const port   = parseInt(params.get('port')  ?? '0', 10);

    if (!ip || !port) { ws.close(1008, '필수 파라미터 누락'); return; }

    const tcp = new net.Socket();

    const send = (msg: object) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
    };

    tcp.connect(port, ip, () => send({ type: 'connected' }));
    tcp.on('data',  chunk => send({ type: 'data',   payload: chunk.toString() }));
    tcp.on('error', e     => { send({ type: 'error', message: socketErrMsg(e) }); ws.close(); });
    tcp.on('close', ()    => { send({ type: 'closed' }); ws.close(); });

    ws.on('message', msg  => { if (tcp.writable) tcp.write(msg.toString()); });
    ws.on('close',   ()   => tcp.destroy());
    ws.on('error',   ()   => tcp.destroy());
  });
}
