import { loginUser } from '../lib/services/auth_service';
import { openOrCreateChatThread, saveChatMessage } from '../lib/services/chat_action_service';
import { createFinderLostItem, getFinderBootstrap } from '../lib/services/finder_app_service';
import { query } from '../lib/db/query';
import { createPasswordHash } from '../lib/security/password_tools';

type TestAccount = {
  loginId: string;
  password: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  latitude: number;
  longitude: number;
  zoneName: string;
  zoneAddress: string;
  itemTitle: string;
  itemColor: string;
  itemLocation: string;
};

const accounts: TestAccount[] = [
  {
    loginId: 'admin',
    password: 'admin1234',
    email: 'admin@findapp.local',
    name: 'Admin',
    role: 'admin',
    latitude: 37.5665,
    longitude: 126.978,
    zoneName: 'Admin Test Zone',
    zoneAddress: 'Seoul City Hall',
    itemTitle: 'Admin Test Lost Item',
    itemColor: 'black',
    itemLocation: 'Admin Test Location',
  },
  {
    loginId: 'test',
    password: 'test1234',
    email: 'test@findapp.local',
    name: 'Test',
    role: 'user',
    latitude: 37.5651,
    longitude: 126.9895,
    zoneName: 'Test Account Zone',
    zoneAddress: 'Seoul Test Zone',
    itemTitle: 'Test Account Lost Item',
    itemColor: 'blue',
    itemLocation: 'Test Account Location',
  },
];

async function upsertTestAccount(account: TestAccount) {
  const passwordHash = await createPasswordHash(account.password);
  const result = await query<{ id: string }>(
    `
      insert into users (
        name, user_name, email, login_id, password_hash,
        initials, photo_asset_path, public_name, role, is_active, updated_at
      )
      values (
        $1, $1, $2, $3, $4,
        $5, 'assets/images/icon.png', $1, $6, true, now()
      )
      on conflict (login_id) do update
      set
        name = excluded.name,
        user_name = excluded.user_name,
        email = excluded.email,
        password_hash = excluded.password_hash,
        initials = excluded.initials,
        photo_asset_path = excluded.photo_asset_path,
        public_name = excluded.public_name,
        role = excluded.role,
        is_active = true,
        updated_at = now()
      returning id
    `,
    [
      account.name,
      account.email,
      account.loginId,
      passwordHash,
      account.name.substring(0, 1),
      account.role,
    ],
  );

  const userId = result.rows[0].id;

  await query(
    `
      insert into alert_settings (
        user_id, distance_meters, disconnect_minutes, vibration_enabled,
        sound_enabled, auto_approve_photos, keep_photo_private_by_default,
        default_reward, map_theme
      )
      values ($1, 10, 5, true, true, false, true, 30000, 'light')
      on conflict (user_id) do update
      set
        distance_meters = excluded.distance_meters,
        disconnect_minutes = excluded.disconnect_minutes,
        vibration_enabled = excluded.vibration_enabled,
        sound_enabled = excluded.sound_enabled,
        auto_approve_photos = excluded.auto_approve_photos,
        keep_photo_private_by_default = excluded.keep_photo_private_by_default,
        default_reward = excluded.default_reward,
        map_theme = excluded.map_theme
    `,
    [userId],
  );

  await query(
    `
      insert into current_locations (user_id, latitude, longitude, accuracy_meters, updated_at)
      values ($1, $2, $3, 8.5, now())
      on conflict (user_id) do update
      set latitude = excluded.latitude,
          longitude = excluded.longitude,
          accuracy_meters = excluded.accuracy_meters,
          updated_at = excluded.updated_at
    `,
    [userId, account.latitude, account.longitude],
  );

  await query(
    `
      insert into safe_zones (user_id, name, address, latitude, longitude, radius_meters)
      select $1, $2, $3, $4, $5, 100
      where not exists (
        select 1 from safe_zones where user_id = $1 and name = $2
      )
    `,
    [userId, account.zoneName, account.zoneAddress, account.latitude, account.longitude],
  );

  return userId;
}

async function findLostItemId(loginId: string, title: string) {
  const result = await query<{ id: string }>(
    `
      select lost_items.id
      from lost_items
      inner join users on users.id = lost_items.owner_user_id
      where users.login_id = $1
        and lost_items.title = $2
      order by lost_items.created_at desc
      limit 1
    `,
    [loginId, title],
  );

  return result.rows[0]?.id ?? null;
}

async function ensureLostItem(account: TestAccount) {
  const existingId = await findLostItemId(account.loginId, account.itemTitle);
  if (existingId) {
    return existingId;
  }

  const detail = await createFinderLostItem({
    loginId: account.loginId,
    title: account.itemTitle,
    category: 'wallet',
    color: account.itemColor,
    location: account.itemLocation,
    happenedAt: new Date().toISOString(),
    latitude: account.latitude,
    longitude: account.longitude,
    accuracyMeters: 8.5,
    reward: 10000,
    listingStatus: 'open',
    description: `${account.itemTitle} for local app testing`,
    featureNotes: 'Prepared by db:test-users',
    contactNote: 'Use chat for account-to-account testing',
    images: [],
  });

  return detail.id;
}

async function hasMessage(threadId: string, text: string) {
  const result = await query<{ exists: boolean }>(
    `
      select exists (
        select 1 from chat_messages where thread_id = $1 and text = $2
      ) as exists
    `,
    [threadId, text],
  );
  return result.rows[0]?.exists ?? false;
}

async function ensureChat(requester: TestAccount, owner: TestAccount, itemId: string) {
  const threadId = await openOrCreateChatThread({
    loginId: requester.loginId,
    itemId,
  });

  const requesterMessage = `${requester.loginId} can contact ${owner.loginId}`;
  if (!(await hasMessage(threadId, requesterMessage))) {
    await saveChatMessage({
      loginId: requester.loginId,
      threadId,
      text: requesterMessage,
    });
  }

  const ownerMessage = `${owner.loginId} can reply to ${requester.loginId}`;
  if (!(await hasMessage(threadId, ownerMessage))) {
    await saveChatMessage({
      loginId: owner.loginId,
      threadId,
      text: ownerMessage,
    });
  }

  return threadId;
}

async function main() {
  const [admin, test] = accounts;

  await Promise.all(accounts.map(upsertTestAccount));

  const adminItemId = await ensureLostItem(admin);
  const testItemId = await ensureLostItem(test);
  const testToAdminThreadId = await ensureChat(test, admin, adminItemId);
  const adminToTestThreadId = await ensureChat(admin, test, testItemId);

  const [adminLogin, testLogin, adminBootstrap, testBootstrap] = await Promise.all([
    loginUser({ loginId: admin.loginId, password: admin.password }),
    loginUser({ loginId: test.loginId, password: test.password }),
    getFinderBootstrap({ loginId: admin.loginId }),
    getFinderBootstrap({ loginId: test.loginId }),
  ]);

  console.log(JSON.stringify({
    ok: true,
    accounts: [
      { loginId: adminLogin.loginId, password: admin.password },
      { loginId: testLogin.loginId, password: test.password },
    ],
    items: {
      adminItemId,
      testItemId,
    },
    threads: {
      testToAdminThreadId,
      adminToTestThreadId,
    },
    ready: {
      admin: {
        myLostItems: adminBootstrap.myLostItems.length,
        chatThreads: adminBootstrap.chatThreads.length,
        safeZones: adminBootstrap.safeZones.length,
        rewardQuests: adminBootstrap.rewardStatus.quests.length,
      },
      test: {
        myLostItems: testBootstrap.myLostItems.length,
        chatThreads: testBootstrap.chatThreads.length,
        safeZones: testBootstrap.safeZones.length,
        rewardQuests: testBootstrap.rewardStatus.quests.length,
      },
    },
  }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });