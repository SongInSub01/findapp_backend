// 운영 문의와 사용자 신고 문의를 inquiries 테이블에 저장하는 저장소다.
import { query } from '@/lib/db/query';

export interface InquiryRow {
  id: string;
  category: 'report' | 'support' | 'moderation';
  title: string;
  body: string;
  status: 'open' | 'reviewing' | 'resolved' | 'closed';
  related_item_type: 'lost' | 'found' | null;
  related_item_id: string | null;
  created_at: string;
}

export async function listInquiriesByUser(userId: string) {
  const result = await query<InquiryRow>(
    `
      select id, category, title, body, status, related_item_type, related_item_id,
             created_at::text as created_at
      from inquiries
      where user_id = $1
      order by created_at desc
    `,
    [userId],
  );
  return result.rows;
}

export async function createInquiry(input: {
  userId: string;
  category: 'report' | 'support' | 'moderation';
  title: string;
  body: string;
  relatedItemType: 'lost' | 'found' | null;
  relatedItemId: string | null;
}) {
  const result = await query<{ id: string }>(
    `
      insert into inquiries (
        user_id, category, title, body, related_item_type, related_item_id
      )
      values ($1, $2, $3, $4, $5, $6)
      returning id
    `,
    [
      input.userId,
      input.category,
      input.title,
      input.body,
      input.relatedItemType,
      input.relatedItemId,
    ],
  );
  return result.rows[0];
}
