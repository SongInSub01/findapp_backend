// 알림함과 신고 내역처럼 사용자 활동 로그 성격의 테이블 접근을 모아 둔다.
import { query } from '@/lib/db/query';

export async function listNotifications(userId: string) {
  const result = await query<{
    id: string;
    title: string;
    body: string;
    time_label: string;
    type: 'alert' | 'approval' | 'info' | 'report';
    is_read: boolean;
  }>(
    `
      select id, title, body, time_label, type, is_read
      from notifications
      where user_id = $1
      order by created_at desc
    `,
    [userId],
  );
  return result.rows;
}

export async function listReports() {
  const result = await query<{
    id: string;
    target_title: string;
    reason: string;
    created_at_label: string;
    status_label: string;
  }>(
    `
      select id, target_title, reason, created_at_label, status_label
      from reports
      order by created_at desc
    `,
  );
  return result.rows;
}

export async function createNotification(input: {
  userId: string;
  title: string;
  body: string;
  timeLabel: string;
  type: 'alert' | 'approval' | 'info' | 'report';
  isRead?: boolean;
}) {
  const result = await query<{ id: string }>(
    `
      insert into notifications (user_id, title, body, time_label, type, is_read)
      values ($1, $2, $3, $4, $5, $6)
      returning id
    `,
    [
      input.userId,
      input.title,
      input.body,
      input.timeLabel,
      input.type,
      input.isRead ?? false,
    ],
  );
  return result.rows[0] ?? null;
}

export async function createReport(input: {
  threadId: string;
  targetTitle: string;
  reason: string;
  createdAtLabel: string;
  statusLabel: string;
}) {
  const result = await query<{ id: string }>(
    `
      insert into reports (thread_id, target_title, reason, created_at_label, status_label)
      values ($1, $2, $3, $4, $5)
      returning id
    `,
    [
      input.threadId,
      input.targetTitle,
      input.reason,
      input.createdAtLabel,
      input.statusLabel,
    ],
  );
  return result.rows[0] ?? null;
}
