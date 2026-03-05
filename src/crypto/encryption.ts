import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { managedNonce, randomBytes } from '@noble/ciphers/utils.js';
import * as argon2 from 'argon2';

const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const NONCE_LENGTH = 24;

const cipher = managedNonce(xchacha20poly1305);

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(hashedPassword: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hashedPassword, password);
  } catch {
    return false;
  }
}

export async function deriveKey(password: string, salt: Buffer): Promise<Uint8Array> {
  const result = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
    salt: salt,
    hashLength: KEY_LENGTH,
    raw: true,
  });
  return result as unknown as Uint8Array;
}

export function generateSalt(): Uint8Array {
  return randomBytes(SALT_LENGTH);
}

export function generateKey(): Uint8Array {
  return randomBytes(KEY_LENGTH);
}

export function encrypt(data: string, key: Uint8Array): string {
  const plaintext = new TextEncoder().encode(data);
  const cipherInstance = cipher(key);
  const ciphertext = cipherInstance.encrypt(plaintext);
  return Buffer.from(ciphertext).toString('base64');
}

export function decrypt(encryptedData: string, key: Uint8Array): string {
  const ciphertext = Buffer.from(encryptedData, 'base64');
  const cipherInstance = cipher(key);
  const plaintext = cipherInstance.decrypt(ciphertext);
  return new TextDecoder().decode(plaintext);
}

export function encryptNote(content: string, password: string): { encryptedContent: string; salt: string } {
  const salt = generateSalt();
  const key = deriveKeySync(password, salt);
  const encryptedContent = encrypt(content, key);
  return {
    encryptedContent,
    salt: Buffer.from(salt).toString('base64'),
  };
}

export function decryptNote(encryptedContent: string, password: string, salt: string): string {
  const saltBuffer = Uint8Array.from(Buffer.from(salt, 'base64'));
  const key = deriveKeySync(password, saltBuffer);
  return decrypt(encryptedContent, key);
}

function deriveKeySync(password: string, salt: Uint8Array): Uint8Array {
  const crypto = require('crypto');
  return crypto.pbkdf2Sync(password, Buffer.from(salt), 100000, KEY_LENGTH, 'sha256');
}
