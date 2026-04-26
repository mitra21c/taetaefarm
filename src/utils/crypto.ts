import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'mitra21c';

export function encryptPassword(plainPassword: string): string {
  return CryptoJS.AES.encrypt(plainPassword, ENCRYPTION_KEY).toString();
}
