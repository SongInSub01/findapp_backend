// 리워드 포인트, 퀘스트, 상점 구매 상태를 DB에 저장하고 조회한다.
import { getDb } from '@/lib/db/pool';
import { query } from '@/lib/db/query';
import type {
  RewardBenefitDto,
  RewardQuestDto,
  RewardShopItemDto,
  RewardStatusDto,
} from '@/lib/contracts/app-types';

const rewardQuestDefinitions = [
  {
    code: 'nearby_lost_check',
    title: '주변 분실물 3개 확인하기',
    rewardMoney: 5000,
    rewardPoints: 150,
    progressTarget: 3,
    iconKey: 'search',
  },
  {
    code: 'found_item_register',
    title: '습득물 등록하기',
    rewardMoney: 3000,
    rewardPoints: 90,
    progressTarget: 1,
    iconKey: 'camera',
  },
  {
    code: 'chat_reply',
    title: '채팅 응답하기',
    rewardMoney: 10000,
    rewardPoints: 300,
    progressTarget: 1,
    iconKey: 'chat',
  },
] as const;

const rewardBenefits = [
  {
    tier: 'Bronze',
    title: 'Bronze',
    description: '기본 포인트 적립',
    requiredPoints: 0,
  },
  {
    tier: 'Silver',
    title: 'Silver',
    description: '포인트 1.2배 적립',
    requiredPoints: 1000,
  },
  {
    tier: 'Gold',
    title: 'Gold',
    description: '포인트 1.5배 + 특별 배지',
    requiredPoints: 3000,
  },
  {
    tier: 'Master',
    title: 'Master',
    description: '랭킹 강조 표시 + 특별 테두리',
    requiredPoints: 7000,
  },
] as const;

type RewardAccountRow = {
  current_points: number;
  lifetime_points: number;
  next_goal_points: number;
  streak_days: number;
};

type RewardQuestRow = {
  code: string;
  title: string;
  reward_money: number;
  reward_points: number;
  progress_current: number;
  progress_target: number;
  completed: boolean;
  claimed: boolean;
  icon_key: string;
};

type RewardShopItemRow = {
  id: string;
  title: string;
  description: string;
  price_points: number;
  icon_key: string;
  purchased: boolean;
};

async function ensureRewardRows(userId: string) {
  await query(
    `
      insert into reward_accounts (user_id)
      values ($1)
      on conflict (user_id) do nothing
    `,
    [userId],
  );

  for (const quest of rewardQuestDefinitions) {
    await query(
      `
        insert into reward_quests (
          user_id, code, title, reward_money, reward_points, progress_target, icon_key
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (user_id, code) do update
        set title = excluded.title,
            reward_money = excluded.reward_money,
            reward_points = excluded.reward_points,
            progress_target = excluded.progress_target,
            icon_key = excluded.icon_key,
            updated_at = now()
      `,
      [
        userId,
        quest.code,
        quest.title,
        quest.rewardMoney,
        quest.rewardPoints,
        quest.progressTarget,
        quest.iconKey,
      ],
    );
  }
}

async function scalarCount(sql: string, values: unknown[]) {
  const result = await query<{ count: string }>(sql, values);
  return Number(result.rows[0]?.count ?? 0);
}

async function refreshQuestProgress(userId: string) {
  const [nearbyLostCount, foundItemCount, chatReplyCount] = await Promise.all([
    scalarCount(
      `
        select count(*)::text as count
        from lost_items
        where listing_status = 'open'
      `,
      [],
    ),
    scalarCount(
      `
        select count(*)::text as count
        from found_items
        where reporter_user_id = $1
      `,
      [userId],
    ),
    scalarCount(
      `
        select count(*)::text as count
        from chat_messages
        where sender_user_id = $1
          and sender <> 'system'
      `,
      [userId],
    ),
  ]);

  const progressByCode = new Map<string, number>([
    ['nearby_lost_check', nearbyLostCount],
    ['found_item_register', foundItemCount],
    ['chat_reply', chatReplyCount],
  ]);

  for (const quest of rewardQuestDefinitions) {
    const progress = Math.min(
      progressByCode.get(quest.code) ?? 0,
      quest.progressTarget,
    );
    await query(
      `
        update reward_quests
        set progress_current = $3,
            completed = completed or $3 >= progress_target,
            completed_at = case
              when completed_at is null and $3 >= progress_target then now()
              else completed_at
            end,
            updated_at = now()
        where user_id = $1
          and code = $2
      `,
      [userId, quest.code, progress],
    );
  }
}

function progressLabel(quest: RewardQuestRow) {
  if (quest.claimed) {
    return '수령 완료';
  }
  if (quest.completed) {
    return '완료';
  }
  return `${quest.progress_current} / ${quest.progress_target}`;
}

function toRewardQuestDto(row: RewardQuestRow): RewardQuestDto {
  return {
    code: row.code,
    title: row.title,
    rewardMoney: Number(row.reward_money),
    rewardPoints: Number(row.reward_points),
    progressCurrent: Number(row.progress_current),
    progressTarget: Number(row.progress_target),
    progressLabel: progressLabel(row),
    completed: row.completed,
    claimed: row.claimed,
    iconKey: row.icon_key,
  };
}

function toRewardShopItemDto(row: RewardShopItemRow): RewardShopItemDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    pricePoints: Number(row.price_points),
    iconKey: row.icon_key,
    purchased: row.purchased,
  };
}

function buildBenefitDtos(lifetimePoints: number): RewardBenefitDto[] {
  const currentIndex = rewardBenefits.reduce((bestIndex, benefit, index) => {
    if (lifetimePoints >= benefit.requiredPoints) {
      return index;
    }
    return bestIndex;
  }, 0);

  return rewardBenefits.map((benefit, index) => ({
    ...benefit,
    isCurrent: index === currentIndex,
  }));
}

export async function getRewardStatus(userId: string): Promise<RewardStatusDto> {
  await ensureRewardRows(userId);
  await refreshQuestProgress(userId);

  const [accountResult, questResult, shopResult] = await Promise.all([
    query<RewardAccountRow>(
      `
        select current_points, lifetime_points, next_goal_points, streak_days
        from reward_accounts
        where user_id = $1
      `,
      [userId],
    ),
    query<RewardQuestRow>(
      `
        select code, title, reward_money, reward_points, progress_current,
               progress_target, completed, claimed, icon_key
        from reward_quests
        where user_id = $1
        order by case code
          when 'nearby_lost_check' then 1
          when 'found_item_register' then 2
          when 'chat_reply' then 3
          else 99
        end
      `,
      [userId],
    ),
    query<RewardShopItemRow>(
      `
        select reward_shop_items.id,
               reward_shop_items.title,
               reward_shop_items.description,
               reward_shop_items.price_points,
               reward_shop_items.icon_key,
               reward_purchases.user_id is not null as purchased
        from reward_shop_items
        left join reward_purchases
          on reward_purchases.shop_item_id = reward_shop_items.id
         and reward_purchases.user_id = $1
        order by reward_shop_items.sort_order asc
      `,
      [userId],
    ),
  ]);

  const account = accountResult.rows[0] ?? {
    current_points: 0,
    lifetime_points: 0,
    next_goal_points: 3500,
    streak_days: 1,
  };
  const currentPoints = Number(account.current_points);
  const nextGoalPoints = Number(account.next_goal_points);

  return {
    currentPoints,
    lifetimePoints: Number(account.lifetime_points),
    nextGoalPoints,
    progress: Math.min(1, currentPoints / nextGoalPoints),
    streakDays: Number(account.streak_days),
    quests: questResult.rows.map(toRewardQuestDto),
    shopItems: shopResult.rows.map(toRewardShopItemDto),
    benefits: buildBenefitDtos(Number(account.lifetime_points)),
  };
}

export async function claimRewardQuest(userId: string, questCode: string) {
  await ensureRewardRows(userId);
  await refreshQuestProgress(userId);

  const db = getDb();
  const client = await db.connect();

  try {
    await client.query('begin');
    const claimResult = await client.query<{
      title: string;
      reward_points: number;
    }>(
      `
        update reward_quests
        set claimed = true,
            claimed_at = now(),
            updated_at = now()
        where user_id = $1
          and code = $2
          and completed = true
          and claimed = false
        returning title, reward_points
      `,
      [userId, questCode],
    );
    const quest = claimResult.rows[0];
    if (!quest) {
      throw new Error('완료되지 않았거나 이미 수령한 리워드입니다.');
    }

    await client.query(
      `
        update reward_accounts
        set current_points = current_points + $2,
            lifetime_points = lifetime_points + $2,
            updated_at = now()
        where user_id = $1
      `,
      [userId, quest.reward_points],
    );
    await client.query(
      `
        insert into reward_point_events (user_id, points, reason, quest_code)
        values ($1, $2, $3, $4)
      `,
      [userId, quest.reward_points, `${quest.title} 리워드 수령`, questCode],
    );
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }

  return getRewardStatus(userId);
}

export async function purchaseRewardShopItem(userId: string, itemId: string) {
  await ensureRewardRows(userId);

  const db = getDb();
  const client = await db.connect();

  try {
    await client.query('begin');
    const itemResult = await client.query<{
      title: string;
      price_points: number;
    }>(
      `
        select title, price_points
        from reward_shop_items
        where id = $1
      `,
      [itemId],
    );
    const item = itemResult.rows[0];
    if (!item) {
      throw new Error('리워드 상품을 찾을 수 없습니다.');
    }

    const purchaseResult = await client.query<{ shop_item_id: string }>(
      `
        insert into reward_purchases (user_id, shop_item_id)
        values ($1, $2)
        on conflict (user_id, shop_item_id) do nothing
        returning shop_item_id
      `,
      [userId, itemId],
    );
    if (!purchaseResult.rows[0]) {
      throw new Error('이미 구매한 리워드 상품입니다.');
    }

    const accountResult = await client.query<{ user_id: string }>(
      `
        update reward_accounts
        set current_points = current_points - $2,
            updated_at = now()
        where user_id = $1
          and current_points >= $2
        returning user_id
      `,
      [userId, item.price_points],
    );
    if (!accountResult.rows[0]) {
      throw new Error('포인트가 부족합니다.');
    }

    await client.query(
      `
        insert into reward_point_events (user_id, points, reason, shop_item_id)
        values ($1, $2, $3, $4)
      `,
      [userId, -Number(item.price_points), `${item.title} 구매`, itemId],
    );
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }

  return getRewardStatus(userId);
}
