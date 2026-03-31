// 채팅 스레드와 메시지 저장/조회 SQL을 담당하는 저장소다.
import { query } from '@/lib/db/query';

// 채팅 스레드와 메시지는 분실물 소유자 기준으로 묶어 읽는다.
async function listMessagesForThreads(threadIds: readonly string[]) {
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
      select id, thread_id, text, sender, time_label, type
      from chat_messages
      where thread_id = any($1::uuid[])
      order by created_at asc
    `,
    [threadIds],
  );

  const messagesByThread = new Map<string, typeof messageResult.rows>();
  for (const row of messageResult.rows) {
    const bucket = messagesByThread.get(row.thread_id) ?? [];
    bucket.push(row);
    messagesByThread.set(row.thread_id, bucket);
  }
  return messagesByThread;
}

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
  }>(
    `
      select chat_threads.id, chat_threads.item_id, chat_threads.item_title,
             chat_threads.item_status, chat_threads.last_message, chat_threads.last_time,
             chat_threads.unread, chat_threads.photo_status, chat_threads.other_user,
             chat_threads.reward
      from chat_threads
      inner join lost_items on lost_items.id = chat_threads.item_id
      where lost_items.owner_user_id = $1
      order by chat_threads.created_at desc
    `,
    [userId],
  );

  const messagesByThread = await listMessagesForThreads(
    threadResult.rows.map((thread) => thread.id),
  );

  return threadResult.rows.map((thread) => ({
    ...thread,
    messages: messagesByThread.get(thread.id) ?? [],
  }));
}

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
  }>(
    `
      select id, item_id, item_title, item_status, last_message, last_time,
             unread, photo_status, other_user, reward
      from chat_threads
      where id = $1
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

export async function createChatThread(input: {
  itemId: string;
  itemTitle: string;
  itemStatus: 'safe' | 'lost' | 'contact';
  lastMessage: string;
  lastTime: string;
  unread: number;
  photoStatus: 'locked' | 'pending' | 'approved';
  otherUser: string;
  reward?: number | null;
}) {
  const result = await query<{ id: string }>(
    `
      insert into chat_threads (
        item_id, item_title, item_status, last_message, last_time,
        unread, photo_status, other_user, reward
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      returning id
    `,
    [
      input.itemId,
      input.itemTitle,
      input.itemStatus,
      input.lastMessage,
      input.lastTime,
      input.unread,
      input.photoStatus,
      input.otherUser,
      input.reward ?? null,
    ],
  );
  return result.rows[0] ?? null;
}

export async function createChatMessage(input: {
  threadId: string;
  text: string;
  sender: 'me' | 'other' | 'system';
  timeLabel: string;
  type: 'text' | 'photoRequest' | 'photoApproved' | 'report';
}) {
  const result = await query<{ id: string }>(
    `
      insert into chat_messages (thread_id, text, sender, time_label, type)
      values ($1,$2,$3,$4,$5)
      returning id
    `,
    [input.threadId, input.text, input.sender, input.timeLabel, input.type],
  );
  return result.rows[0] ?? null;
}

export async function updateChatThread(input: {
  threadId: string;
  itemStatus?: 'safe' | 'lost' | 'contact';
  lastMessage?: string;
  lastTime?: string;
  unread?: number;
  photoStatus?: 'locked' | 'pending' | 'approved';
  reward?: number | null;
}) {
  const result = await query<{ id: string }>(
    `
      update chat_threads
      set item_status = coalesce($2, item_status),
          last_message = coalesce($3, last_message),
          last_time = coalesce($4, last_time),
          unread = coalesce($5, unread),
          photo_status = coalesce($6, photo_status),
          reward = coalesce($7, reward)
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
    ],
  );
  return result.rows[0] ?? null;
}
