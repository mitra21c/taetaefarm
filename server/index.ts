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

// 로그인
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    res.status(400).json({ message: '이메일과 비밀번호를 입력해 주세요.' });
    return;
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, pass, role FROM users WHERE email = $1 LIMIT 1',
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
      inputPlain = decryptPassword(password);
      storedPlain = decryptPassword(user.pass);
    } catch {
      res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      return;
    }

    if (!inputPlain || inputPlain !== storedPlain) {
      res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      return;
    }

    const payload = {
      sub: String(user.id),
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    const refreshToken = jwt.sign({ sub: String(user.id) }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 로그아웃 (stateless JWT - 클라이언트 토큰 삭제)
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
      `SELECT id FROM users
       WHERE email = $1
          OR REPLACE(phone, '-', '') = $2
       LIMIT 1`,
      [email.trim().toLowerCase(), normalizedPhone],
    );

    res.json({ isDuplicate: rows.length > 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 추천인 인증 (이름 + 이메일 조회 → id 반환)
app.post('/api/auth/verify-referrer', async (req, res) => {
  const { name, email } = req.body as { name: string; email: string };

  if (!name || !email) {
    res.status(400).json({ message: '추천인 성명과 이메일을 입력해 주세요.' });
    return;
  }

  try {
    const { rows } = await pool.query(
      `SELECT id FROM users
       WHERE name = $1 AND email = $2
       LIMIT 1`,
      [name.trim(), email.trim().toLowerCase()],
    );

    if (rows.length === 0) {
      res.json({ found: false });
    } else {
      res.json({ found: true, referrerId: rows[0].id });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 회원가입
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, phone, address, post, referrerId } =
    req.body as {
      name: string;
      email: string;
      password: string;
      phone: string;
      address: string;
      post: string;
      referrerId?: number;
    };

  if (!name || !email || !password || !phone || !address || !post) {
    res.status(400).json({ message: '필수 항목을 모두 입력해 주세요.' });
    return;
  }

  try {
    await pool.query(
      `INSERT INTO users (name, email, pass, phone, address, post, role, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'user', $7)`,
      [name.trim(), email.trim().toLowerCase(), password, phone.trim(), address.trim(), post.trim(), referrerId ?? 0],
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

// 전체 회원 목록 조회
app.get('/api/users', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, phone, role, reference_id, created_at
       FROM users
       ORDER BY id ASC`,
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 주문 등록
app.post('/api/orders', async (req, res) => {
  const {
    user_id, name, phone, email,
    order_item, order_weight, order_price,
    receiver_name, receiver_phone, receiver_address, receiver_post,
  } = req.body as {
    user_id: number;
    name: string;
    phone: string;
    email: string;
    order_item: string;
    order_weight: number;
    order_price: number;
    receiver_name: string;
    receiver_phone: string;
    receiver_address: string;
    receiver_post: string;
  };

  if (!user_id || !name || !phone || !email || !order_item || !order_weight || !order_price ||
      !receiver_name || !receiver_phone || !receiver_address || !receiver_post) {
    res.status(400).json({ message: '필수 항목을 모두 입력해 주세요.' });
    return;
  }

  try {
    // 추천인 정보 조회
    const refResult = await pool.query(
      `SELECT u2.id AS ref_id, u2.name AS ref_name
       FROM users u1
       LEFT JOIN users u2 ON u2.id = u1.reference_id
       WHERE u1.id = $1 LIMIT 1`,
      [user_id],
    );
    const refRow = refResult.rows[0];
    const reference_id   = refRow?.ref_id   ?? 0;
    const reference_name = refRow?.ref_name ?? '';

    await pool.query(
      `INSERT INTO orders
         (user_id, name, phone, email,
          order_item, order_weight, order_price,
          reference_id, reference_name,
          receiver_name, receiver_phone, receiver_address, receiver_post)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        user_id, name, phone, email,
        order_item, order_weight, order_price,
        reference_id, reference_name,
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

  const ALLOWED = ['주문완료', '입금 완료', '출고/배송 중', '주문취소'];
  if (!delivery_status || !ALLOWED.includes(delivery_status)) {
    res.status(400).json({ message: '유효하지 않은 상태값입니다.' });
    return;
  }

  try {
    const { rowCount } = await pool.query(
      `UPDATE orders SET delivery_status = $1, modified_at = NOW() WHERE id = $2`,
      [delivery_status, id],
    );
    if (rowCount === 0) {
      res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    } else {
      res.json({ message: '상태가 변경되었습니다.' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 주문 목록 조회 (전체 – 관리자용 / 본인용, 연도 필터)
app.get('/api/orders', async (req, res) => {
  const { email, year } = req.query as { email?: string; year?: string };
  const yearNum = year ? parseInt(year, 10) : null;

  try {
    let query = `SELECT * FROM orders WHERE 1=1`;
    const params: any[] = [];

    if (email) {
      params.push(email.trim().toLowerCase());
      query += ` AND email = $${params.length}`;
    }
    if (yearNum) {
      params.push(yearNum);
      query += ` AND EXTRACT(YEAR FROM created_at) = $${params.length}`;
    }
    query += ` ORDER BY created_at DESC`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
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
      `SELECT id, name, email, phone, address, post, role, reference_id, created_at
       FROM users WHERE email = $1`,
      [decodeURIComponent(email).trim().toLowerCase()],
    );
    if (rows.length === 0) {
      res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅  API 서버 실행 중 → http://localhost:${PORT}`);
});
