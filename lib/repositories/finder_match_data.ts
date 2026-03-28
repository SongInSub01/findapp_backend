// 자동 매칭 결과 조회와 재계산 결과 저장을 담당하는 matches 저장소다.
import { query } from '@/lib/db/query';

export interface MatchRow {
  id: string;
  lost_item_id: string;
  found_item_id: string;
  score: string;
  match_status: 'suggested' | 'reviewing' | 'confirmed' | 'dismissed';
  reason_summary: string;
  detail_scores: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export async function listMatchesForUser(userId: string) {
  const result = await query<MatchRow>(
    `
      select matches.id, matches.lost_item_id, matches.found_item_id, matches.score::text,
             matches.match_status, matches.reason_summary, matches.detail_scores,
             matches.created_at::text, matches.updated_at::text
      from matches
      inner join lost_items on lost_items.id = matches.lost_item_id
      inner join found_items on found_items.id = matches.found_item_id
      where lost_items.owner_user_id = $1 or found_items.reporter_user_id = $1
      order by matches.score desc, matches.updated_at desc
    `,
    [userId],
  );
  return result.rows;
}

export async function listMatchesForListing(input: {
  itemType: 'lost' | 'found';
  itemId: string;
}) {
  const whereClause = input.itemType === 'lost'
    ? 'matches.lost_item_id = $1'
    : 'matches.found_item_id = $1';

  const result = await query<MatchRow>(
    `
      select matches.id, matches.lost_item_id, matches.found_item_id, matches.score::text,
             matches.match_status, matches.reason_summary, matches.detail_scores,
             matches.created_at::text, matches.updated_at::text
      from matches
      where ${whereClause}
      order by matches.score desc, matches.updated_at desc
    `,
    [input.itemId],
  );
  return result.rows;
}

export async function replaceMatchesForLostItem(input: {
  lostItemId: string;
  matches: Array<{
    foundItemId: string;
    score: number;
    matchStatus: 'suggested' | 'reviewing' | 'confirmed' | 'dismissed';
    reasonSummary: string;
    detailScores: Record<string, number>;
  }>;
}) {
  await query('delete from matches where lost_item_id = $1', [input.lostItemId]);

  for (const match of input.matches) {
    await query(
      `
        insert into matches (
          lost_item_id, found_item_id, score, match_status, reason_summary, detail_scores, updated_at
        )
        values ($1, $2, $3, $4, $5, $6::jsonb, now())
      `,
      [
        input.lostItemId,
        match.foundItemId,
        match.score,
        match.matchStatus,
        match.reasonSummary,
        JSON.stringify(match.detailScores),
      ],
    );
  }
}

export async function replaceMatchesForFoundItem(input: {
  foundItemId: string;
  matches: Array<{
    lostItemId: string;
    score: number;
    matchStatus: 'suggested' | 'reviewing' | 'confirmed' | 'dismissed';
    reasonSummary: string;
    detailScores: Record<string, number>;
  }>;
}) {
  await query('delete from matches where found_item_id = $1', [input.foundItemId]);

  for (const match of input.matches) {
    await query(
      `
        insert into matches (
          lost_item_id, found_item_id, score, match_status, reason_summary, detail_scores, updated_at
        )
        values ($1, $2, $3, $4, $5, $6::jsonb, now())
      `,
      [
        match.lostItemId,
        input.foundItemId,
        match.score,
        match.matchStatus,
        match.reasonSummary,
        JSON.stringify(match.detailScores),
      ],
    );
  }
}
