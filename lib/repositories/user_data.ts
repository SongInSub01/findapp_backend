// users 테이블을 읽고 쓰는 공통 데이터 접근 함수 모음이다.
import { query } from '@/lib/db/query';

export async function getUserByEmail(email: string) {
  const result = await query<{
    id: string;
    name: string;
    user_name: string;
    email: string;
    login_id: string;
    password_hash: string;
    initials: string;
    photo_asset_path: string;
    public_name: string;
    is_active: boolean;
    role: string | null;
    phone_number: string | null;
    profile_bio: string | null;
  }>(
    `
      select id, name, user_name, email, login_id, password_hash, initials,
             photo_asset_path, public_name, is_active, role, phone_number, profile_bio
      from users
      where email = $1
      limit 1
    `,
    [email],
  );
  return result.rows[0] ?? null;
}

export async function getUserByLoginId(loginId: string) {
  const result = await query<{
    id: string;
    name: string;
    user_name: string;
    email: string;
    login_id: string;
    password_hash: string;
    initials: string;
    photo_asset_path: string;
    public_name: string;
    is_active: boolean;
    role: string | null;
    phone_number: string | null;
    profile_bio: string | null;
  }>(
    `
      select id, name, user_name, email, login_id, password_hash, initials,
             photo_asset_path, public_name, is_active, role, phone_number, profile_bio
      from users
      where login_id = $1
      limit 1
    `,
    [loginId],
  );
  return result.rows[0] ?? null;
}

export async function getUserByLoginOrEmail(loginOrEmail: string) {
  const result = await query<{
    id: string;
    name: string;
    user_name: string;
    email: string;
    login_id: string;
    password_hash: string;
    initials: string;
    photo_asset_path: string;
    public_name: string;
    is_active: boolean;
    role: string | null;
    phone_number: string | null;
    profile_bio: string | null;
  }>(
    `
      select id, name, user_name, email, login_id, password_hash, initials,
             photo_asset_path, public_name, is_active, role, phone_number, profile_bio
      from users
      where login_id = $1 or email = $1
      limit 1
    `,
    [loginOrEmail],
  );
  return result.rows[0] ?? null;
}

export async function getDefaultUser() {
  const result = await query<{
    id: string;
    name: string;
    user_name: string;
    email: string;
    login_id: string;
    password_hash: string;
    initials: string;
    photo_asset_path: string;
    public_name: string;
    is_active: boolean;
    role: string | null;
    phone_number: string | null;
    profile_bio: string | null;
  }>(
    `
      select id, name, user_name, email, login_id, password_hash, initials,
             photo_asset_path, public_name, is_active, role, phone_number, profile_bio
      from users
      where is_active = true
      order by created_at asc
      limit 1
    `,
  );
  return result.rows[0] ?? null;
}

export async function createUserAccount(input: {
  userName: string;
  email: string;
  loginId: string;
  passwordHash: string;
  initials: string;
  photoAssetPath: string;
  publicName: string;
}) {
  const result = await query<{
    id: string;
    name: string;
    user_name: string;
    email: string;
    login_id: string;
    public_name: string;
  }>(
    `
      insert into users (
        name, user_name, email, login_id, password_hash, initials,
        photo_asset_path, public_name, is_active, updated_at
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,true,now())
      returning id, name, user_name, email, login_id, public_name
    `,
    [
      input.userName,
      input.userName,
      input.email,
      input.loginId,
      input.passwordHash,
      input.initials,
      input.photoAssetPath,
      input.publicName,
    ],
  );

  return result.rows[0];
}

export async function ensureDefaultAlertSettings(userId: string) {
  await query(
    `
      insert into alert_settings (
        user_id, distance_meters, disconnect_minutes, vibration_enabled,
        sound_enabled, auto_approve_photos, keep_photo_private_by_default
      )
      values ($1, 10, 5, true, true, false, true)
      on conflict (user_id) do nothing
    `,
    [userId],
  );
}

export async function touchLastLoginAt(userId: string) {
  await query(
    `
      update users
      set last_login_at = now(),
          updated_at = now()
      where id = $1
    `,
    [userId],
  );
}

export async function updateUserProfile(input: {
  userId: string;
  userName: string;
  email: string;
  publicName: string;
  photoAssetPath: string;
  phoneNumber?: string | null;
  profileBio?: string | null;
}) {
  const initials = input.userName.trim() === ''
    ? '사'
    : input.userName.trim().substring(0, 1);
  const result = await query<{
    id: string;
    name: string;
    user_name: string;
    email: string;
    login_id: string;
    public_name: string;
    phone_number: string | null;
    profile_bio: string | null;
  }>(
    `
      update users
      set name = $2,
          user_name = $2,
          email = $3,
          login_id = $3,
          initials = $4,
          public_name = $5,
          photo_asset_path = $6,
          phone_number = $7,
          profile_bio = $8,
          updated_at = now()
      where id = $1
      returning id, name, user_name, email, login_id, public_name, phone_number, profile_bio
    `,
    [
      input.userId,
      input.userName,
      input.email,
      initials,
      input.publicName,
      input.photoAssetPath,
      input.phoneNumber ?? null,
      input.profileBio ?? null,
    ],
  );
  return result.rows[0] ?? null;
}
