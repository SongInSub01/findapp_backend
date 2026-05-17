// 채팅 스레드와 메시지 저장/조회 SQL을 담당하는 저장소다.
import { query } from '@/lib/db/query';

// 채팅 스레드와 메시지는 분실물 소유자와 요청자 기준으로 묶어 읽는다.
async function listMessagesForThreads(threadIds: readonly string[], viewerUserId: string) {
  if (threadIds.length == 0) {
    return new Map<string, Array<{
      id: string;
      thread_id: string;
      text: string;
      sender: 'me' | 'other' | 'system';
      time_label: string;
      type: 'text' | 'photoRequest' | 'photoApproved' | 'report';
    }>>();
  }

  const messageResult = await query<{
    id: string;
    thread_id: string;
    text: string;
    sender: 'me' | 'other' | 'system';
    time_label: string;
    type: 'text' | 'photoRequest' | 'photoApproved' | 'report';
  }>(
    `
      select id,
             thread_id,
             text,
             case
               when sender = 'system' then 'system'
               when sender_user_id is null then sender
               when sender_user_id = $2 then 'me'
               else 'other'
             end as sender,
             time_label,
             type
      from chat_messages
      where thread_id = any($1::uuid[])
      order by created_at asc
    `,
    [threadIds, viewerUserId],
  );

  const messagesByThread = new Map<string, typeof messageResult.rows>();
  for (const row of messageResult.rows) {
    const bucket = messagesByThread.get(row.thread_id) ?? [];
    bucket.push(row);
    messagesByThread.set(row.thread_id, bucket);
  }
  return messagesByThread;
}

// 사용자가 참여한 채팅방을 조회하고, 보는 사람 기준으로 메시지 방향을 다시 계산한다.
export async function listChatThreadsForUser(userId: string) {
  const threadResult = await query<{
    id: string;
    item_id: string;
    item_title: string;
    item_status: 'safe' | 'lost' | 'contact';
    last_message: string;
    last_time: string;
    unread: number;
    photo_status: 'locked' | 'pending' | 'approved';
    other_user: string;
    reward: number | null;
    requester_user_id: string | null;
    owner_user_id: string;
    last_sender_user_id: string | null;
  }>(
    `
      select chat_threads.id,
             chat_threads.item_id,
             chat_threads.item_title,
             chat_threads.item_status,
             chat_threads.last_message,
             chat_threads.last_time,
             case
               when chat_threads.last_sender_user_id = $1 then 0
               else chat_threads.unread
             end as unread,
             chat_threads.photo_status,
             case
               when chat_threads.requester_user_id = $1 then lost_items.owner_name
               else coalesce(requester_user.public_name, lost_items.owner_name)
             end as other_user,
             chat_threads.reward,
             chat_threads.requester_user_id,
             lost_items.owner_user_id,
             chat_threads.last_sender_user_id
      from chat_threads
      inner join lost_items on lost_items.id = chat_threads.item_id
      left join users requester_user on requester_user.id = chat_threads.requester_user_id
      where lost_items.owner_user_id = $1
         or chat_threads.requester_user_id = $1
      order by chat_threads.created_at desc
    `,
    [userId],
  );

  const messagesByThread = await listMessagesForThreads(
    threadResult.rows.map((thread) => thread.id),
    userId,
  );

  return threadResult.rows.map((thread) => ({
    ...thread,
    messages: messagesByThread.get(thread.id) ?? [],
  }));
}

// 채팅방 접근 권한 확인에 필요한 소유자와 요청자 정보를 함께 조회한다.
export async function getChatThreadById(threadId: string) {
  const result = await query<{
    id: string;
    item_id: string;
    item_title: string;
    item_status: 'safe' | 'lost' | 'contact';
    last_message: string;
    last_time: string;
    unread: number;
    photo_status: 'locked' | 'pending' | 'approved';
    other_user: string;
    reward: number | null;
    requester_user_id: string | null;
    owner_user_id: string;
    last_sender_user_id: string | null;
  }>(
    `
      select chat_threads.id,
             chat_threads.item_id,
             chat_threads.item_title,
             chat_threads.item_status,
             chat_threads.last_message,
             chat_threads.last_time,
             chat_threads.unread,
             chat_threads.photo_status,
             chat_threads.other_user,
             chat_threads.reward,
             chat_threads.requester_user_id,
             lost_items.owner_user_id,
             chat_threads.last_sender_user_id
      from chat_threads
      inner join lost_items on lost_items.id = chat_threads.item_id
      where chat_threads.id = $1
      limit 1
    `,
    [threadId],
  );
  return result.rows[0] ?? null;
}

export async function getChatThreadByItemId(itemId: string) {
  const result = await query<{ id: string }>(
    `
      select id
      from chat_threads
      where item_id = $1
      limit 1
    `,
    [itemId],
  );
  return result.rows[0] ?? null;
}

// 같은 사용자가 같은 분실물에 중복 채팅방을 만들지 않도록 기존 방을 찾는다.
export async function getChatThreadByItemIdAndRequesterUserId(
  itemId: string,
  requesterUserId: string,
) {
  const result = await query<{ id: string }>(
    `
      select id
      from chat_threads
      where item_id = $1
        and requester_user_id = $2
      limit 1
    `,
    [itemId, requesterUserId],
  );
  return result.rows[0] ?? null;
}

export async function getLegacyChatThreadByItemId(itemId: string) {
  const result = await query<{ id: string }>(
    `
      select id
      from chat_threads
      where item_id = $1
        and requester_user_id is null
      limit 1
    `,
    [itemId],
  );
  return result.rows[0] ?? null;
}

// 새 채팅방을 만들 때 요청자와 마지막 발신자를 함께 저장한다.
export async function createChatThread(input: {
  itemId: string;
  itemTitle: string;
  itemStatus: 'safe' | 'lost' | 'contact';
  requesterUserId: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  photoStatus: 'locked' | 'pending' | 'approved';
  otherUser: string;
  reward?: number | null;
  lastSenderUserId?: string | null;
}) {
  const result = await query<{ id: string }>(
    `
      insert into chat_threads (
        item_id, item_title, item_status, requester_user_id,
        last_message, last_time, unread, photo_status, other_user, reward,
        last_sender_user_id
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      returning id
    `,
    [
      input.itemId,
      input.itemTitle,
      input.itemStatus,
      input.requesterUserId,
      input.lastMessage,
      input.lastTime,
      input.unread,
      input.photoStatus,
      input.otherUser,
      input.reward ?? null,
      input.lastSenderUserId ?? null,
    ],
  );
  return result.rows[0] ?? null;
}

// 메시지를 저장하면서 실제 발신자 사용자 id를 함께 남긴다.
export async function createChatMessage(input: {
  threadId: string;
  text: string;
  sender: 'me' | 'other' | 'system';
  senderUserId?: string | null;
  timeLabel: string;
  type: 'text' | 'photoRequest' | 'photoApproved' | 'report';
}) {
  const result = await query<{ id: string }>(
    `
      insert into chat_messages (thread_id, text, sender, sender_user_id, time_label, type)
      values ($1,$2,$3,$4,$5,$6)
      returning id
    `,
    [
      input.threadId,
      input.text,
      input.sender,
      input.senderUserId ?? null,
      input.timeLabel,
      input.type,
    ],
  );
  return result.rows[0] ?? null;
}

// 채팅방 요약 정보와 마지막 발신자를 갱신한다.
export async function updateChatThread(input: {
  threadId: string;
  itemStatus?: 'safe' | 'lost' | 'contact';
  lastMessage?: string;
  lastTime?: string;
  unread?: number;
  photoStatus?: 'locked' | 'pending' | 'approved';
  reward?: number | null;
  lastSenderUserId?: string | null;
}) {
  const result = await query<{ id: string }>(
    `
      update chat_threads
      set item_status = coalesce($2, item_status),
          last_message = coalesce($3, last_message),
          last_time = coalesce($4, last_time),
          unread = coalesce($5, unread),
          photo_status = coalesce($6, photo_status),
          reward = coalesce($7, reward),
          last_sender_user_id = coalesce($8, last_sender_user_id)
      where id = $1
      returning id
    `,
    [
      input.threadId,
      input.itemStatus ?? null,
      input.lastMessage ?? null,
      input.lastTime ?? null,
      input.unread ?? null,
      input.photoStatus ?? null,
      input.reward,
      input.lastSenderUserId,
    ],
  );
  return result.rows[0] ?? null;
}
