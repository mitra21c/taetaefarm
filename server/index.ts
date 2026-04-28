import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import CryptoJS from 'crypto-js';

const app = express();
const PORT = 8080;
const ENCRYPTION_KEY = 'mitra21c';
const JWT_SECRET = 'taetaefarm_jwt_secret_2024';

app.use(cors({ origin: '*' }));
app.use(express.json());

const pool = new Pool({
  user: 'mitra21c',
  host: '/var/run/postgresql',
  database: 'taetae_db',
  port: 5432,
});

function decryptPassword(encrypted: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// ─────────────────────────── AUTH ───────────────────────────

// 로그인
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    res.status(400).json({ message: '이메일과 비밀번호를 입력해 주세요.' });
    return;
  }
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, pass, role, use FROM users WHERE email = $1 LIMIT 1',
      [email.trim().toLowerCase()],
    );
    if (rows.length === 0) {
      res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      return;
    }
    const user = rows[0];
    let inputPlain: string;
    let storedPlain: string;
    try {
      inputPlain  = decryptPassword(password);
      storedPlain = decryptPassword(user.pass);
    } catch {
      res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      return;
    }
    if (!inputPlain || inputPlain !== storedPlain) {
      res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
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

// 이메일·전화번호 중복 확인
app.post('/api/auth/check-duplicate', async (req, res) => {
  const { email, phone } = req.body as { email: string; phone: string };
  if (!email || !phone) {
    res.status(400).json({ message: '이메일과 전화번호를 모두 입력해 주세요.' });
    return;
  }
  try {
    const normalizedPhone = phone.replace(/-/g, '');
    const { rows } = await pool.query(
      `SELECT id FROM users WHERE email = $1 OR REPLACE(phone, '-', '') = $2 LIMIT 1`,
      [email.trim().toLowerCase(), normalizedPhone],
    );
    res.json({ isDuplicate: rows.length > 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 추천인 인증 (이름 + 이메일 → referrerEmail 반환)
app.post('/api/auth/verify-referrer', async (req, res) => {
  const { name, email } = req.body as { name: string; email: string };
  if (!name || !email) {
    res.status(400).json({ message: '추천인 성명과 이메일을 입력해 주세요.' });
    return;
  }
  try {
    const { rows } = await pool.query(
      `SELECT email FROM users WHERE name = $1 AND email = $2 LIMIT 1`,
      [name.trim(), email.trim().toLowerCase()],
    );
    if (rows.length === 0) {
      res.json({ found: false });
    } else {
      res.json({ found: true, referrerEmail: rows[0].email });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 회원가입
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, phone, address, post, referrerEmail } =
    req.body as {
      name: string; email: string; password: string;
      phone: string; address: string; post: string;
      referrerEmail?: string;
    };
  if (!name || !email || !password || !phone || !address || !post) {
    res.status(400).json({ message: '필수 항목을 모두 입력해 주세요.' });
    return;
  }
  try {
    await pool.query(
      `INSERT INTO users (name, email, pass, phone, address, post, role, reference_email)
       VALUES ($1, $2, $3, $4, $5, $6, 'user', $7)`,
      [name.trim(), email.trim().toLowerCase(), password, phone.trim(), address.trim(), post.trim(), referrerEmail ?? null],
    );
    res.status(201).json({ message: '회원가입이 완료되었습니다.' });
  } catch (err: any) {
    if (err.code === '23505') {
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
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.phone, u.email, u.address, u.post,
              u.role, u.reference_email, u.use, u.created_at, u.modified_at,
              r.name AS referrer_name, r.phone AS referrer_phone
       FROM users u
       LEFT JOIN users r ON r.email = u.reference_email AND u.reference_email IS NOT NULL AND u.reference_email <> ''
       ORDER BY u.id ASC`,
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 회원 정보 수정
app.patch('/api/users/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { role, use } = req.body as { role?: string; use?: string };
  const updates: string[] = [];
  const params: (string | number)[] = [];
  if (role) { params.push(role); updates.push(`role = $${params.length}`); }
  if (use === 'Y' || use === 'N') { params.push(use); updates.push(`use = $${params.length}`); }
  if (updates.length === 0) { res.status(400).json({ message: '변경할 항목이 없습니다.' }); return; }
  params.push(id);
  try {
    const { rowCount } = await pool.query(
      `UPDATE users SET ${updates.join(', ')}, modified_at = NOW() WHERE id = $${params.length}`,
      params,
    );
    rowCount === 0
      ? res.status(404).json({ message: '사용자를 찾을 수 없습니다.' })
      : res.json({ message: '수정되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 회원 삭제
app.delete('/api/users/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    rowCount === 0
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
    const { rowCount } = await pool.query(`UPDATE users SET use = $1 WHERE id = $2`, [use, id]);
    rowCount === 0
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
    let count = 0;
    for (const u of users) {
      if (!u.name || !u.email || !u.phone) continue;
      const encPass = u.pass ? CryptoJS.AES.encrypt(u.pass, ENCRYPTION_KEY).toString() : '';
      await pool.query(
        `INSERT INTO users (name, phone, email, address, post, role, pass, reference_email, use)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name, phone = EXCLUDED.phone,
           address = EXCLUDED.address, post = EXCLUDED.post,
           role = EXCLUDED.role, reference_email = EXCLUDED.reference_email,
           use = EXCLUDED.use, modified_at = NOW()`,
        [
          u.name.trim(), u.phone.trim(), u.email.trim().toLowerCase(),
          (u.address ?? '').trim(), (u.post ?? '').trim(),
          u.role ?? 'user', encPass,
          u.reference_email?.trim() || null, u.use ?? 'N',
        ],
      );
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
    const { rows } = await pool.query(
      `SELECT id, name, email, phone, address, post, role, reference_email, created_at
       FROM users WHERE email = $1`,
      [decodeURIComponent(email).trim().toLowerCase()],
    );
    rows.length === 0
      ? res.status(404).json({ message: '사용자를 찾을 수 없습니다.' })
      : res.json(rows[0]);
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
    const refResult = await pool.query(
      `SELECT u2.email AS ref_email, u2.name AS ref_name
       FROM users u1
       LEFT JOIN users u2 ON u2.email = u1.reference_email
       WHERE u1.id = $1 LIMIT 1`,
      [user_id],
    );
    const refRow = refResult.rows[0];
    const reference_email = refRow?.ref_email ?? null;
    const reference_name  = refRow?.ref_name  ?? '';

    await pool.query(
      `INSERT INTO orders
         (user_id, name, phone, email,
          order_item, order_weight, order_price,
          reference_email, reference_name,
          receiver_name, receiver_phone, receiver_address, receiver_post)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        user_id, name, phone, email,
        order_item, order_weight, order_price,
        reference_email, reference_name,
        receiver_name, receiver_phone, receiver_address, receiver_post,
      ],
    );
    res.status(201).json({ message: '주문이 완료되었습니다.' });
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
    const { rowCount } = await pool.query(
      `UPDATE orders SET delivery_status = $1, modified_at = NOW() WHERE id = $2`,
      [delivery_status, id],
    );
    rowCount === 0
      ? res.status(404).json({ message: '주문을 찾을 수 없습니다.' })
      : res.json({ message: '상태가 변경되었습니다.' });
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
    let query = `SELECT * FROM orders WHERE 1=1`;
    const params: any[] = [];
    if (email) { params.push(email.trim().toLowerCase()); query += ` AND email = $${params.length}`; }
    if (yearNum) { params.push(yearNum); query += ` AND EXTRACT(YEAR FROM created_at) = $${params.length}`; }
    query += ` ORDER BY created_at DESC`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─────────────────────────── INIT ───────────────────────────

async function initAdmin() {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) AS cnt FROM users');
    if (parseInt(rows[0].cnt, 10) > 0) return;
    const encPass = CryptoJS.AES.encrypt('Rlaalsckd77!', ENCRYPTION_KEY).toString();
    await pool.query(
      `INSERT INTO users (name, phone, email, address, post, role, pass, use)
       VALUES ($1, $2, $3, $4, $5, 'admin', $6, 'Y')`,
      ['김민창', '010-5257-0412', 'mitra21c@gmail.com',
       '광주광역시 광산구 수완로 73번길 40 대주피오레 602-306', '12345', encPass],
    );
    console.log('✅  기본 관리자 계정이 등록되었습니다.');
  } catch (err) {
    console.error('관리자 초기화 오류:', err);
  }
}

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅  API 서버 실행 중 → http://localhost:${PORT}`);
  await initAdmin();
});
