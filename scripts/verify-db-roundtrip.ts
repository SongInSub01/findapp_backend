// 핵심 기능의 write -> DB 저장 -> read/bootstrap 왕복을 점검한다.
import { createBleDevice } from '../lib/repositories/device_data';
import { upsertCurrentLocation } from '../lib/repositories/current_location_data';
import { query } from '../lib/db/query';
import { registerUser, loginUser } from '../lib/services/auth_service';
import {
  createFinderFoundItem,
  createFinderLostItem,
  getFinderBootstrap,
  listFinderMatches,
  searchFinderListings,
  submitFinderInquiry,
} from '../lib/services/finder_app_service';
import {
  approvePhotoForThread,
  openOrCreateChatThread,
  requestPhotoForThread,
  saveChatMessage,
  saveChatReport,
} from '../lib/services/chat_action_service';
import {
  saveAlertSettingValues,
  saveSafeZoneValues,
} from '../lib/services/setting_update_service';
import { claimRewardQuestForUser } from '../lib/services/reward_service';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function scalar<T extends Record<string, unknown>>(sql: string, values: unknown[]) {
  const result = await query<T>(sql, values);
  return result.rows[0] ?? null;
}

async function main() {
  // 실제 API 서비스 흐름처럼 사용자 생성부터 좌표 저장, 채팅, 조회까지 한 번에 검증한다.
  const runId = `rt-${Date.now()}`;
  const email = `${runId}@roundtrip.findapp.local`;
  const password = `roundtrip-${runId}`;
  const titleSeed = `왕복검증 ${runId}`;

  const user = await registerUser({
    userName: `검증${runId}`,
    email,
    password,
  });
  const loggedIn = await loginUser({ loginId: email, password });
  assert(loggedIn.loginId === email, 'auth login did not return registered loginId');
  await query(
    `
      insert into users (
        name, user_name, email, login_id, password_hash, initials,
        photo_asset_path, public_name, role
      )
      values (
        '관리자', '관리자', 'admin@roundtrip.findapp.local', 'admin',
        'roundtrip-admin', '관', 'assets/images/icon.png', '관리자', 'admin'
      )
      on conflict (login_id) do nothing
    `,
    [],
  );

  const userRow = await scalar<{ last_login_at: string | null }>(
    'select last_login_at from users where login_id = $1',
    [email],
  );
  assert(userRow?.last_login_at, 'users.last_login_at was not updated');

  await saveAlertSettingValues({
    loginId: email,
    distanceMeters: 20,
    disconnectMinutes: 3,
    vibrationEnabled: false,
    soundEnabled: true,
    autoApprovePhotos: false,
    keepPhotoPrivateByDefault: true,
    defaultReward: 42000,
    mapTheme: 'light',
  });

  await saveSafeZoneValues({
    loginId: email,
    name: `${titleSeed} 안전지대`,
    address: '서울시 검증구 왕복로 1',
    radiusMeters: 80,
  });

  await createBleDevice({
    userId: user.id,
    name: `${titleSeed} BLE 지갑`,
    iconKey: 'wallet',
    status: 'safe',
    bleStatus: 'near',
    location: '왕복 검증 위치',
    lastSeen: '방금 전',
    bleCode: `BLE-${runId}`,
    mapX: 0.45,
    mapY: 0.55,
    distance: '1m',
    reward: 42000,
    photoAssetPath: 'assets/images/icon.png',
  });

  await upsertCurrentLocation({
    userId: user.id,
    latitude: 37.5665,
    longitude: 126.978,
    accuracyMeters: 12,
  });

  const lostDetail = await createFinderLostItem({
    loginId: email,
    title: `${titleSeed} 갈색 지갑`,
    category: '지갑',
    color: '갈색',
    location: '왕복 검증역 1번 출구',
    happenedAt: new Date().toISOString(),
    reward: 42000,
    listingStatus: 'open',
    description: 'DB 왕복 검증용 분실물입니다.',
    featureNotes: '갈색 카드지갑',
    contactNote: '앱 채팅으로 연락해 주세요.',
    images: [
      {
        imageUrl: 'assets/images/icon.png',
        fileName: 'icon.png',
        mimeType: 'image/png',
        isPrimary: true,
      },
    ],
  });

  const foundDetail = await createFinderFoundItem({
    loginId: email,
    title: `${titleSeed} 갈색 카드지갑`,
    category: '지갑',
    color: '갈색',
    location: '왕복 검증역 2번 출구',
    happenedAt: new Date().toISOString(),
    listingStatus: 'open',
    description: 'DB 왕복 검증용 습득물입니다.',
    featureNotes: '갈색 카드지갑',
    storageNote: '검증 보관함',
    contactNote: '앱 문의로 연락해 주세요.',
    images: [
      {
        imageUrl: 'assets/images/splash_icon.png',
        fileName: 'splash_icon.png',
        mimeType: 'image/png',
        isPrimary: true,
      },
    ],
  });

  const searchItems = await searchFinderListings({
    loginId: email,
    itemType: 'all',
    queryText: runId,
  });
  assert(searchItems.some((item) => item.id === lostDetail.id), 'lost item missing from search');
  assert(searchItems.some((item) => item.id === foundDetail.id), 'found item missing from search');

  const matches = await listFinderMatches({ loginId: email });
  assert(Array.isArray(matches), 'matches response is not an array');

  const threadId = await openOrCreateChatThread({
    loginId: email,
    itemId: lostDetail.id,
  });
  await saveChatMessage({
    loginId: email,
    threadId,
    text: `${titleSeed} 채팅 메시지`,
  });
  await requestPhotoForThread({ loginId: email, threadId });
  await approvePhotoForThread({ loginId: email, threadId });
  await saveChatReport({
    loginId: email,
    threadId,
    reason: `${titleSeed} 신고 사유`,
  });

  const peerEmail = `${runId}.peer@roundtrip.findapp.local`;
  const peerPassword = `roundtrip-peer-${runId}`;
  await registerUser({
    userName: `Peer ${runId}`,
    email: peerEmail,
    password: peerPassword,
  });
  const peerThreadId = await openOrCreateChatThread({
    loginId: peerEmail,
    itemId: lostDetail.id,
  });
  const peerText = `${runId} peer chat message`;
  await saveChatMessage({
    loginId: peerEmail,
    threadId: peerThreadId,
    text: peerText,
  });

  const ownerChatCheck = await getFinderBootstrap({ loginId: email });
  const peerChatCheck = await getFinderBootstrap({ loginId: peerEmail });
  const ownerPeerThread = ownerChatCheck.chatThreads.find(
    (thread) => thread.id === peerThreadId,
  );
  const peerThread = peerChatCheck.chatThreads.find(
    (thread) => thread.id === peerThreadId,
  );
  assert(
    ownerPeerThread?.messages.some(
      (message) => message.text === peerText && message.sender === 'other',
    ),
    'owner did not see peer chat message as other',
  );
  assert(
    peerThread?.messages.some(
      (message) => message.text === peerText && message.sender === 'me',
    ),
    'peer did not see own chat message as me',
  );

  await submitFinderInquiry({
    loginId: email,
    category: 'support',
    title: `${titleSeed} 문의`,
    body: 'DB 왕복 검증 문의입니다.',
    relatedItemType: 'lost',
    relatedItemId: lostDetail.id,
  });

  const bootstrap = await getFinderBootstrap({ loginId: email });
  assert(bootstrap.userProfile.loginId === email, 'bootstrap user mismatch');
  assert(bootstrap.myDevices.some((device) => device.bleCode === `BLE-${runId}`), 'bootstrap device missing');
  assert(bootstrap.myLostItems.some((item) => item.id === lostDetail.id), 'bootstrap lost listing missing');
  assert(bootstrap.myFoundItems.some((item) => item.id === foundDetail.id), 'bootstrap found listing missing');
  assert(bootstrap.chatThreads.some((thread) => thread.id === threadId), 'bootstrap chat thread missing');
  assert(bootstrap.safeZones.some((zone) => zone.name.includes(runId)), 'bootstrap safe zone missing');
  assert(bootstrap.inquiries.some((inquiry) => inquiry.title.includes(runId)), 'bootstrap inquiry missing');
  assert(bootstrap.currentLocation?.latitude === 37.5665, 'bootstrap current location missing');
  assert(
    bootstrap.rewardStatus.quests.some(
      (quest) => quest.code === 'found_item_register' && quest.completed,
    ),
    'bootstrap reward quest missing or incomplete',
  );

  const claimedRewardStatus = await claimRewardQuestForUser({
    loginId: email,
    questCode: 'found_item_register',
  });
  assert(
    claimedRewardStatus.currentPoints >= 90,
    'reward points were not added after quest claim',
  );

  const counts = await scalar<{
    users: string;
    devices: string;
    lost_items: string;
    found_items: string;
    chat_messages: string;
    reports: string;
    inquiries: string;
    reward_accounts: string;
    reward_quests: string;
  }>(
    `
      select
        (select count(*) from users where login_id = $1)::text as users,
        (select count(*) from ble_devices where user_id = $2)::text as devices,
        (select count(*) from lost_items where owner_user_id = $2)::text as lost_items,
        (select count(*) from found_items where reporter_user_id = $2)::text as found_items,
        (select count(*) from chat_messages where thread_id = $3)::text as chat_messages,
        (select count(*) from reports where reason like $4)::text as reports,
        (select count(*) from inquiries where user_id = $2)::text as inquiries,
        (select count(*) from reward_accounts where user_id = $2)::text as reward_accounts,
        (select count(*) from reward_quests where user_id = $2)::text as reward_quests
    `,
    [email, user.id, threadId, `%${runId}%`],
  );

  assert(counts?.users === '1', 'DB user count mismatch');
  assert(Number(counts.devices) >= 1, 'DB device count mismatch');
  assert(Number(counts.lost_items) >= 1, 'DB lost item count mismatch');
  assert(Number(counts.found_items) >= 1, 'DB found item count mismatch');
  assert(Number(counts.chat_messages) >= 4, 'DB chat message count mismatch');
  assert(Number(counts.reports) >= 1, 'DB report count mismatch');
  assert(Number(counts.inquiries) >= 1, 'DB inquiry count mismatch');
  assert(Number(counts.reward_accounts) >= 1, 'DB reward account count mismatch');
  assert(Number(counts.reward_quests) >= 3, 'DB reward quest count mismatch');

  console.log(JSON.stringify({
    ok: true,
    runId,
    loginId: email,
    lostItemId: lostDetail.id,
    foundItemId: foundDetail.id,
    threadId,
    peerThreadId,
    checkedTables: [
      'users',
      'alert_settings',
      'safe_zones',
      'ble_devices',
      'current_locations',
      'lost_items',
      'found_items',
      'item_images',
      'matches',
      'chat_threads',
      'chat_messages',
      'reports',
      'inquiries',
      'notifications',
      'reward_accounts',
      'reward_quests',
      'reward_shop_items',
      'reward_purchases',
      'reward_point_events',
    ],
  }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      message: error instanceof Error ? error.message : 'Unknown roundtrip error',
    }, null, 2));
    process.exit(1);
  });
