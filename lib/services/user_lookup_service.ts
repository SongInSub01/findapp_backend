// 요청에서 받은 로그인 아이디나 이메일로 현재 사용자를 찾을 때 쓰는 공통 헬퍼다.
import { getEnv } from '@/lib/config/env';
import {
  getDefaultUser,
  getUserByEmail,
  getUserByLoginOrEmail,
} from '@/lib/repositories/user_data';

export async function findRequestedUser(input: {
  loginId?: string;
  email?: string;
}) {
  if (input.loginId) {
    return getUserByLoginOrEmail(input.loginId);
  }

  if (input.email) {
    return getUserByEmail(input.email);
  }

  const defaultEmail = getEnv().DEFAULT_USER_EMAIL;
  if (defaultEmail) {
    return (await getUserByEmail(defaultEmail)) ?? getDefaultUser();
  }

  return getDefaultUser();
}

export async function requireRequestedUser(
  input: {
    loginId?: string;
    email?: string;
  },
  emptyMessage: string,
) {
  const user = await findRequestedUser(input);

  if (!user) {
    throw new Error(emptyMessage);
  }

  return user;
}
