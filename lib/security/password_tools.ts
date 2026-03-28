// 비밀번호는 평문으로 저장하지 않고 해시로 바꿔 저장하고 비교한다.
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const hashLength = 64;

export async function createPasswordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, hashLength)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

export async function verifyPasswordHash(password: string, storedHash: string) {
  const [salt, expectedHash] = storedHash.split(':');

  if (!salt || !expectedHash) {
    return false;
  }

  const actualHash = (await scrypt(password, salt, hashLength)) as Buffer;
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  if (actualHash.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualHash, expectedBuffer);
}
