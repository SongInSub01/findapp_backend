// 프로필 수정 요청을 users 테이블 반영용 데이터로 바꿔 저장한다.
import { updateUserProfile } from '@/lib/repositories/user_data';
import { requireRequestedUser } from '@/lib/services/user_lookup_service';

export async function saveProfile(input: {
  loginId?: string;
  email?: string;
  userName: string;
  publicName: string;
  photoAssetPath?: string;
  phoneNumber?: string;
  profileBio?: string;
}) {
  const user = await requireRequestedUser(input, 'No user found for profile update.');
  const updated = await updateUserProfile({
    userId: user.id,
    userName: input.userName,
    email: input.email ?? user.email,
    publicName: input.publicName,
    photoAssetPath: input.photoAssetPath ?? user.photo_asset_path,
    phoneNumber: input.phoneNumber ?? user.phone_number,
    profileBio: input.profileBio ?? user.profile_bio,
  });

  if (!updated) {
    throw new Error('Failed to update profile.');
  }

  return {
    id: updated.id,
    userName: updated.user_name,
    email: updated.email,
    loginId: updated.login_id,
    publicName: updated.public_name,
    phoneNumber: updated.phone_number,
    profileBio: updated.profile_bio,
  };
}
