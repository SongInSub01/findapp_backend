// 채팅 생성, 메시지, 사진 승인, 신고를 한 곳에서 처리한다.
import { createNotification, createReport } from '@/lib/repositories/activity_data';
import {
  createChatMessage,
  createChatThread,
  getChatThreadById,
  getChatThreadByItemId,
  updateChatThread,
} from '@/lib/repositories/chat_data';
import {
  getLegacyLostItemById,
  updateLegacyLostItemChatState,
} from '@/lib/repositories/finder_listing_data';
import { getAlertSettings } from '@/lib/repositories/setting_data';
import { requireRequestedUser } from '@/lib/services/user_lookup_service';
import { formatTimeLabel, nowLabel } from '@/lib/utils/time_label';

const firstContactMessage = '안녕하세요, 분실물 BLE 신호가 감지되어 연락드립니다.';

export async function openOrCreateChatThread(input: {
  loginId?: string;
  email?: string;
  itemId: string;
}) {
  await requireRequestedUser(input, 'No user found for chat open.');
  const existing = await getChatThreadByItemId(input.itemId);

  if (existing) {
    return existing.id;
  }

  const item = await getLegacyLostItemById(input.itemId);
  if (!item) {
    throw new Error('Lost item not found.');
  }

  const timeLabel = formatTimeLabel();
  const created = await createChatThread({
    itemId: item.id,
    itemTitle: item.title,
    itemStatus: 'contact',
    lastMessage: firstContactMessage,
    lastTime: timeLabel,
    unread: 0,
    photoStatus: item.photo_status,
    otherUser: item.owner_name,
    reward: item.reward,
  });

  if (!created) {
    throw new Error('Failed to create chat thread.');
  }

  await createChatMessage({
    threadId: created.id,
    text: firstContactMessage,
    sender: 'me',
    timeLabel,
    type: 'text',
  });

  await updateLegacyLostItemChatState({
    itemId: item.id,
    status: 'contact',
    threadId: created.id,
  });

  await createNotification({
    userId: item.owner_user_id,
    title: '새 채팅이 시작되었습니다.',
    body: `${item.title} 관련 대화가 시작되었습니다.`,
    timeLabel: nowLabel(),
    type: 'info',
  });

  return created.id;
}

export async function saveChatMessage(input: {
  loginId?: string;
  email?: string;
  threadId: string;
  text: string;
}) {
  await requireRequestedUser(input, 'No user found for message send.');
  const thread = await getChatThreadById(input.threadId);
  if (!thread) {
    throw new Error('Chat thread not found.');
  }

  const timeLabel = formatTimeLabel();
  await createChatMessage({
    threadId: input.threadId,
    text: input.text,
    sender: 'me',
    timeLabel,
    type: 'text',
  });

  await updateChatThread({
    threadId: input.threadId,
    itemStatus: 'contact',
    lastMessage: input.text,
    lastTime: timeLabel,
  });

  await updateLegacyLostItemChatState({
    itemId: thread.item_id,
    status: 'contact',
  });
}

export async function markThreadAsRead(input: {
  loginId?: string;
  email?: string;
  threadId: string;
}) {
  await requireRequestedUser(input, 'No user found for read update.');
  await updateChatThread({
    threadId: input.threadId,
    unread: 0,
  });
}

export async function requestPhotoForThread(input: {
  loginId?: string;
  email?: string;
  threadId: string;
}) {
  const requester = await requireRequestedUser(input, 'No user found for photo request.');
  const thread = await getChatThreadById(input.threadId);
  if (!thread) {
    throw new Error('Chat thread not found.');
  }

  const item = await getLegacyLostItemById(thread.item_id);
  if (!item) {
    throw new Error('Lost item not found.');
  }

  const ownerSettings = await getAlertSettings(item.owner_user_id);
  const autoApprove = ownerSettings?.auto_approve_photos ?? false;
  const nextPhotoStatus = autoApprove ? 'approved' : 'pending';
  const nextMessage = autoApprove
    ? '사진 열람 요청이 자동 승인되었습니다.'
    : '사진 열람을 요청했습니다. 주인의 승인을 기다리는 중입니다.';
  const nextType = autoApprove ? 'photoApproved' : 'photoRequest';
  const notificationType = autoApprove ? 'approval' : 'info';
  const timeLabel = formatTimeLabel();

  await createChatMessage({
    threadId: input.threadId,
    text: nextMessage,
    sender: 'system',
    timeLabel,
    type: nextType,
  });

  await updateChatThread({
    threadId: input.threadId,
    itemStatus: 'contact',
    photoStatus: nextPhotoStatus,
    lastMessage: nextMessage,
    lastTime: timeLabel,
  });

  await updateLegacyLostItemChatState({
    itemId: thread.item_id,
    status: 'contact',
    photoStatus: nextPhotoStatus,
  });

  await createNotification({
    userId: requester.id,
    title: autoApprove ? '사진 승인 완료' : '사진 승인 대기',
    body: autoApprove
        ? '설정에 따라 사진이 즉시 열람 가능 상태가 되었습니다.'
        : '주인의 확인 후 사진을 열람할 수 있습니다.',
    timeLabel: nowLabel(),
    type: notificationType,
  });
}

export async function approvePhotoForThread(input: {
  loginId?: string;
  email?: string;
  threadId: string;
}) {
  const requester = await requireRequestedUser(input, 'No user found for photo approval.');
  const thread = await getChatThreadById(input.threadId);
  if (!thread) {
    throw new Error('Chat thread not found.');
  }

  const timeLabel = formatTimeLabel();
  const message = '주인이 사진 열람을 허용했습니다.';

  await createChatMessage({
    threadId: input.threadId,
    text: message,
    sender: 'system',
    timeLabel,
    type: 'photoApproved',
  });

  await updateChatThread({
    threadId: input.threadId,
    photoStatus: 'approved',
    lastMessage: message,
    lastTime: timeLabel,
  });

  await updateLegacyLostItemChatState({
    itemId: thread.item_id,
    photoStatus: 'approved',
  });

  const item = await getLegacyLostItemById(thread.item_id);
  if (item) {
    await createNotification({
      userId: requester.id,
      title: '사진 승인 완료',
      body: '이제 보호된 분실물 사진을 열람할 수 있습니다.',
      timeLabel: nowLabel(),
      type: 'approval',
    });
  }
}

export async function saveChatReport(input: {
  loginId?: string;
  email?: string;
  threadId: string;
  reason: string;
}) {
  const requester = await requireRequestedUser(input, 'No user found for report submit.');
  const thread = await getChatThreadById(input.threadId);
  if (!thread) {
    throw new Error('Chat thread not found.');
  }

  const timeLabel = formatTimeLabel();
  const reportMessage = '비매너 유저 신고가 접수되었습니다.';

  await createReport({
    threadId: input.threadId,
    targetTitle: `${thread.item_title} 채팅방`,
    reason: input.reason,
    createdAtLabel: nowLabel(),
    statusLabel: '접수 완료',
  });

  await createChatMessage({
    threadId: input.threadId,
    text: reportMessage,
    sender: 'system',
    timeLabel,
    type: 'report',
  });

  await createNotification({
    userId: requester.id,
    title: '신고 접수 완료',
    body: `${thread.item_title} 관련 신고가 검토 대기 상태로 등록되었습니다.`,
    timeLabel: nowLabel(),
    type: 'report',
  });
}
