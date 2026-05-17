// 리워드 API가 사용할 사용자 확인과 포인트/퀘스트 비즈니스 흐름을 처리한다.
import {
  claimRewardQuest,
  getRewardStatus,
  purchaseRewardShopItem,
} from '@/lib/repositories/reward_data';
import { requireRequestedUser } from '@/lib/services/user_lookup_service';

export async function loadRewardStatus(input: {
  loginId?: string;
  email?: string;
}) {
  const user = await requireRequestedUser(input, '리워드 사용자를 찾을 수 없습니다.');
  return getRewardStatus(user.id);
}

export async function claimRewardQuestForUser(input: {
  loginId?: string;
  email?: string;
  questCode: string;
}) {
  const user = await requireRequestedUser(input, '리워드 사용자를 찾을 수 없습니다.');
  return claimRewardQuest(user.id, input.questCode);
}

export async function purchaseRewardShopItemForUser(input: {
  loginId?: string;
  email?: string;
  itemId: string;
}) {
  const user = await requireRequestedUser(input, '리워드 사용자를 찾을 수 없습니다.');
  return purchaseRewardShopItem(user.id, input.itemId);
}
