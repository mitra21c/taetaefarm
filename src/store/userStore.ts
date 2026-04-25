export interface StoredUser {
  id: number;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'admin' | 'user';
  referrerName?: string;
  referrerEmail?: string;
  referrerPhone?: string;
}

const KEY = 'taetaefarm_users';

const ADMIN: StoredUser = {
  id: 1,
  name: '김민창',
  email: 'mitra21c@naver.com',
  password: 'q1w2e3r4!',
  phone: '010-5257-0412',
  role: 'admin',
  referrerName: '김민창',
  referrerEmail: 'mitra21c@naver.com',
  referrerPhone: '010-5257-0412',
};

function load(): StoredUser[] {
  try {
    const raw = localStorage.getItem(KEY);
    const users: StoredUser[] = raw ? JSON.parse(raw) : [];
    if (!users.find(u => u.email === ADMIN.email)) {
      users.unshift(ADMIN);
      localStorage.setItem(KEY, JSON.stringify(users));
    }
    return users;
  } catch {
    return [ADMIN];
  }
}

function save(users: StoredUser[]): void {
  localStorage.setItem(KEY, JSON.stringify(users));
}

export function findByNameAndEmail(name: string, email: string): StoredUser | undefined {
  return load().find(
    u => u.name.trim() === name.trim() && u.email.trim() === email.trim(),
  );
}

export function addUser(user: Omit<StoredUser, 'id' | 'role'>): void {
  const users = load();
  users.push({ ...user, id: Date.now(), role: 'user' });
  save(users);
}
