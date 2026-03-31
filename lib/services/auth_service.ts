// 회원가입과 로그인 요청을 받아 사용자 계정을 만들고 검증한다.
import { getEnv } from '@/lib/config/env';
import { createPasswordHash, verifyPasswordHash } from '@/lib/security/password_tools';
import {
  createUserAccount,
  ensureDefaultAlertSettings,
  getUserByEmail,
  getUserByLoginId,
  getUserByLoginOrEmail,
  touchLastLoginAt,
} from '@/lib/repositories/user_data';

function buildInitials(userName: string) {
  const trimmed = userName.trim();
  return trimmed.length === 0 ? '?' : trimmed.substring(0, 1);
}

function buildPublicName(userName: string) {
  const trimmed = userName.trim();

  if (trimmed.length === 0) {
    return '사용자';
  }

  if (trimmed.length === 1) {
    return `${trimmed}*`;
  }

  return `${trimmed.substring(0, 1)}${'*'.repeat(trimmed.length - 1)}`;
}

export async function registerUser(input: {
  userName: string;
  email: string;
  loginId?: string;
  password: string;
}) {
  const trimmedLoginId = input.loginId?.trim();
  const loginId = (trimmedLoginId != null && trimmedLoginId.length > 0)
    ? trimmedLoginId
    : input.email.trim();

  const existingEmail = await getUserByEmail(input.email.trim());
  if (existingEmail) {
    throw new Error('이미 사용 중인 이메일입니다.');
  }

  const existingLoginId = await getUserByLoginId(loginId);
  if (existingLoginId) {
    throw new Error('이미 사용 중인 로그인 아이디입니다.');
  }

  const passwordHash = await createPasswordHash(input.password);
  const createdUser = await createUserAccount({
    userName: input.userName.trim(),
    email: input.email.trim(),
    loginId,
    passwordHash,
    initials: buildInitials(input.userName),
    publicName: buildPublicName(input.userName),
    photoAssetPath: getEnv().DEFAULT_PROFILE_IMAGE_PATH,
  });

  await ensureDefaultAlertSettings(createdUser.id);

  return {
    id: createdUser.id,
    name: createdUser.name,
    userName: createdUser.user_name,
    email: createdUser.email,
    loginId: createdUser.login_id,
    publicName: createdUser.public_name,
  };
}

export async function loginUser(input: {
  loginId: string;
  password: string;
}) {
  const user = await getUserByLoginOrEmail(input.loginId.trim());

  if (!user || !user.is_active) {
    throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
  }

  const isValid = await verifyPasswordHash(input.password, user.password_hash);

  if (!isValid) {
    throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
  }

  await touchLastLoginAt(user.id);

  return {
    id: user.id,
    name: user.name,
    userName: user.user_name,
    email: user.email,
    loginId: user.login_id,
    publicName: user.public_name,
  };
}
