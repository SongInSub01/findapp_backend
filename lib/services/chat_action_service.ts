// 채팅 생성, 메시지, 사진 승인, 신고를 한 곳에서 처리한다.
import { createNotification, createReport } from '@/lib/repositories/activity_data';
import {
  createChatMessage,
  createChatThread,
  getChatThreadById,
  getChatThreadByItemIdAndRequesterUserId,
  getLegacyChatThreadByItemId,
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

type ChatThreadAccessRow = {
  owner_user_id: string;
  requester_user_id: string | null;
};

// 채팅방 소유자나 요청자가 아닌 사용자의 접근을 차단한다.
function ensureThreadParticipant(userId: string, thread: ChatThreadAccessRow) {
  if (thread.owner_user_id !== userId && thread.requester_user_id !== userId) {
    throw new Error('User is not a participant of this chat thread.');
  }
}

// 알림을 보낼 상대방 사용자를 계산한다.
function otherParticipantId(thread: ChatThreadAccessRow, actorUserId: string) {
  if (thread.owner_user_id !== actorUserId) {
    return thread.owner_user_id;
  }
  if (thread.requester_user_id && thread.requester_user_id !== actorUserId) {
    return thread.requester_user_id;
  }
  return null;
}

// 상대방이 있는 경우에만 읽지 않은 메시지 수를 올린다.
function unreadForOtherParticipant(thread: ChatThreadAccessRow, actorUserId: string) {
  return otherParticipantId(thread, actorUserId) ? 1 : 0;
}

// 분실물 기준으로 사용자별 채팅방을 열거나 새로 만든다.
export async function openOrCreateChatThread(input: {
  loginId?: string;
  email?: string;
  itemId: string;
}) {
  const requester = await requireRequestedUser(input, 'No user found for chat open.');
  const existing = await getChatThreadByItemIdAndRequesterUserId(
    input.itemId,
    requester.id,
  );

  if (existing) {
    return existing.id;
  }

  const item = await getLegacyLostItemById(input.itemId);
  if (!item) {
    throw new Error('Lost item not found.');
  }

  const legacyThread = await getLegacyChatThreadByItemId(input.itemId);
  if (legacyThread) {
    return legacyThread.id;
  }

  const timeLabel = formatTimeLabel();
  const created = await createChatThread({
    itemId: item.id,
    itemTitle: item.title,
    itemStatus: 'contact',
    requesterUserId: requester.id,
    lastMessage: firstContactMessage,
    lastTime: timeLabel,
    unread: item.owner_user_id === requester.id ? 0 : 1,
    photoStatus: item.photo_status,
    otherUser: item.owner_name,
    reward: item.reward,
    lastSenderUserId: requester.id,
  });

  if (!created) {
    throw new Error('Failed to create chat thread.');
  }

  await createChatMessage({
    threadId: created.id,
    text: firstContactMessage,
    sender: 'me',
    senderUserId: requester.id,
    timeLabel,
    type: 'text',
  });

  await updateLegacyLostItemChatState({
    itemId: item.id,
    status: 'contact',
    threadId: created.id,
  });

  if (item.owner_user_id !== requester.id) {
  await createNotification({
    userId: item.owner_user_id,
    title: '새 채팅이 시작되었습니다.',
    body: `${item.title} 관련 대화가 시작되었습니다.`,
    timeLabel: nowLabel(),
    type: 'info',
  });
  }

  return created.id;
}

// 참여자가 보낸 채팅 메시지를 저장하고 채팅방 요약을 갱신한다.
export async function saveChatMessage(input: {
  loginId?: string;
  email?: string;
  threadId: string;
  text: string;
}) {
  const requester = await requireRequestedUser(input, 'No user found for message send.');
  const thread = await getChatThreadById(input.threadId);
  if (!thread) {
    throw new Error('Chat thread not found.');
  }
  ensureThreadParticipant(requester.id, thread);

  const timeLabel = formatTimeLabel();
  await createChatMessage({
    threadId: input.threadId,
    text: input.text,
    sender: 'me',
    senderUserId: requester.id,
    timeLabel,
    type: 'text',
  });

  await updateChatThread({
    threadId: input.threadId,
    itemStatus: 'contact',
    lastMessage: input.text,
    lastTime: timeLabel,
    unread: unreadForOtherParticipant(thread, requester.id),
    lastSenderUserId: requester.id,
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
  const requester = await requireRequestedUser(input, 'No user found for read update.');
  const thread = await getChatThreadById(input.threadId);
  if (!thread) {
    throw new Error('Chat thread not found.');
  }
  ensureThreadParticipant(requester.id, thread);
  await updateChatThread({
    threadId: input.threadId,
    unread: 0,
  });
}

// 사진 열람 요청을 저장하고, 설정에 따라 자동 승인 여부를 처리한다.
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
  ensureThreadParticipant(requester.id, thread);

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
    senderUserId: requester.id,
    timeLabel,
    type: nextType,
  });

  await updateChatThread({
    threadId: input.threadId,
    itemStatus: 'contact',
    photoStatus: nextPhotoStatus,
    lastMessage: nextMessage,
    lastTime: timeLabel,
    unread: unreadForOtherParticipant(thread, requester.id),
    lastSenderUserId: requester.id,
  });

  await updateLegacyLostItemChatState({
    itemId: thread.item_id,
    status: 'contact',
    photoStatus: nextPhotoStatus,
  });

  const notificationUserId = autoApprove
    ? requester.id
    : otherParticipantId(thread, requester.id);
  if (notificationUserId) {
    await createNotification({
    userId: notificationUserId,
    title: autoApprove ? '사진 승인 완료' : '사진 승인 대기',
    body: autoApprove
        ? '설정에 따라 사진이 즉시 열람 가능 상태가 되었습니다.'
        : '주인의 확인 후 사진을 열람할 수 있습니다.',
    timeLabel: nowLabel(),
    type: notificationType,
  });
  }
}

// 주인이 사진 열람을 승인하면 채팅방과 분실물 상태를 함께 갱신한다.
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
  ensureThreadParticipant(requester.id, thread);

  const timeLabel = formatTimeLabel();
  const message = '주인이 사진 열람을 허용했습니다.';

  await createChatMessage({
    threadId: input.threadId,
    text: message,
    sender: 'system',
    senderUserId: requester.id,
    timeLabel,
    type: 'photoApproved',
  });

  await updateChatThread({
    threadId: input.threadId,
    photoStatus: 'approved',
    lastMessage: message,
    lastTime: timeLabel,
    unread: unreadForOtherParticipant(thread, requester.id),
    lastSenderUserId: requester.id,
  });

  await updateLegacyLostItemChatState({
    itemId: thread.item_id,
    photoStatus: 'approved',
  });

  const notificationUserId = otherParticipantId(thread, requester.id);
  if (notificationUserId) {
    await createNotification({
      userId: notificationUserId,
      title: '사진 승인 완료',
      body: '이제 보호된 분실물 사진을 열람할 수 있습니다.',
      timeLabel: nowLabel(),
      type: 'approval',
    });
  }
}

// 채팅 신고 내용을 저장하고 신고 접수 메시지와 알림을 남긴다.
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
  ensureThreadParticipant(requester.id, thread);

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
    senderUserId: requester.id,
    timeLabel,
    type: 'report',
  });

  await updateChatThread({
    threadId: input.threadId,
    lastMessage: reportMessage,
    lastTime: timeLabel,
    unread: 0,
    lastSenderUserId: requester.id,
  });

  await createNotification({
    userId: requester.id,
    title: '신고 접수 완료',
    body: `${thread.item_title} 관련 신고가 검토 대기 상태로 등록되었습니다.`,
    timeLabel: nowLabel(),
    type: 'report',
  });
}
