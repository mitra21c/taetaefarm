import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import jwt from 'jsonwebtoken';
import CryptoJS from 'crypto-js';
import { SolapiMessageService } from 'solapi';

const app = express();
const PORT = 8080;
const ENCRYPTION_KEY = 'mitra21c';
const JWT_SECRET = 'taetaefarm_jwt_secret_2024';

const SOLAPI_API_KEY    = process.env.SOLAPI_API_KEY    ?? 'NCSXUJAHXFOKGSPJ';
const SOLAPI_API_SECRET = process.env.SOLAPI_API_SECRET ?? '';
const SOLAPI_SENDER     = process.env.SOLAPI_SENDER     ?? '';

let solapiService: SolapiMessageService | null = null;
function getSolapi() {
  if (!SOLAPI_API_SECRET || !SOLAPI_SENDER) return null;
  if (!solapiService) solapiService = new SolapiMessageService(SOLAPI_API_KEY, SOLAPI_API_SECRET);
  return solapiService;
}

app.use(cors({ origin: '*' }));
app.use(express.json());

const dbConfig: sql.config = {
  server: 'orikio.iptime.org',
  port: 1433,
  user: 'sa',
  password: '@swe7410',
  database: 'taetae_db',
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
    let query = `SELECT * FROM orders WHERE 1=1`;
    if (email) {
      req2.input('email', sql.VarChar, email.trim().toLowerCase());
      query += ` AND email = @email`;
    }
    if (yearNum) {
      req2.input('year', sql.Int, yearNum);
      query += ` AND YEAR(created_at) = @year`;
    }
    query += ` ORDER BY created_at DESC`;
    const result = await req2.query(query);
    res.json(result.recordset);
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

// ─────────────────────────── INIT ───────────────────────────

async function initAdmin() {
  try {
    const db = await getPool();
    const result = await db.request().query('SELECT COUNT(*) AS cnt FROM users');
    if (parseInt(result.recordset[0].cnt, 10) > 0) return;
    const encPass = CryptoJS.AES.encrypt('Rlaalsckd77!', ENCRYPTION_KEY).toString();
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
  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`✅  API 서버 실행 중 → http://localhost:${PORT}`);
    await initAdmin();
  });
}
