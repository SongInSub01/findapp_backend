// Flutter 앱과 백엔드가 주고받는 DTO 계약 정의 모음이다.
export type ItemStatus = 'safe' | 'lost' | 'contact';
export type PhotoAccessStatus = 'locked' | 'pending' | 'approved';
export type ChatSender = 'me' | 'other' | 'system';
export type ChatMessageType = 'text' | 'photoRequest' | 'photoApproved' | 'report';
export type NotificationType = 'alert' | 'approval' | 'info' | 'report';
export type ListingType = 'lost' | 'found';
export type ListingWorkflowStatus = 'open' | 'matched' | 'resolved' | 'archived';
export type MatchStatus = 'suggested' | 'reviewing' | 'confirmed' | 'dismissed';
export type InquiryCategory = 'report' | 'support' | 'moderation';
export type InquiryStatus = 'open' | 'reviewing' | 'resolved' | 'closed';

export interface UserProfileDto {
  id: string;
  name: string;
  email: string;
  loginId: string;
  initials: string;
  photoAssetPath: string;
  publicName: string;
}

export interface BleDeviceDto {
  id: string;
  name: string;
  iconKey: string;
  status: ItemStatus;
  location: string;
  lastSeen: string;
  bleCode: string;
  mapX: number;
  mapY: number;
  distance: string | null;
  reward: number | null;
  photoAssetPath: string | null;
}

export interface LostItemDto {
  id: string;
  title: string;
  location: string;
  timeLabel: string;
  reward: number;
  status: ItemStatus;
  photoStatus: PhotoAccessStatus;
  distance: string;
  ownerName: string;
  description: string;
  mapX: number;
  mapY: number;
  threadId: string | null;
  photoAssetPath: string | null;
}

export interface ChatMessageDto {
  id: string;
  text: string;
  sender: ChatSender;
  timeLabel: string;
  type: ChatMessageType;
}

export interface ChatThreadDto {
  id: string;
  itemId: string;
  itemTitle: string;
  itemStatus: ItemStatus;
  lastMessage: string;
  lastTime: string;
  unread: number;
  photoStatus: PhotoAccessStatus;
  otherUser: string;
  reward: number | null;
  messages: ChatMessageDto[];
}

export interface SafeZoneDto {
  id: string;
  name: string;
  address: string;
  radiusMeters: number;
}

export interface AlertSettingsDto {
  distanceMeters: number;
  disconnectMinutes: number;
  vibrationEnabled: boolean;
  soundEnabled: boolean;
  autoApprovePhotos: boolean;
  keepPhotoPrivateByDefault: boolean;
}

export interface NotificationDto {
  id: string;
  title: string;
  body: string;
  timeLabel: string;
  type: NotificationType;
  isRead: boolean;
}

export interface ReportDto {
  id: string;
  targetTitle: string;
  reason: string;
  createdAtLabel: string;
  statusLabel: string;
}

export interface AppBootstrapDto {
  userProfile: UserProfileDto;
  myDevices: BleDeviceDto[];
  lostItems: LostItemDto[];
  chatThreads: ChatThreadDto[];
  safeZones: SafeZoneDto[];
  alertSettings: AlertSettingsDto;
  notifications: NotificationDto[];
  reports: ReportDto[];
}

export interface FinderUserProfileDto {
  id: string;
  name: string;
  email: string;
  loginId: string;
  publicName: string;
  role: string;
  phoneNumber: string | null;
  profileBio: string | null;
}

export interface ListingImageDto {
  id: string;
  imageUrl: string;
  fileName: string;
  mimeType: string;
  isPrimary: boolean;
}

export interface ListingSummaryDto {
  id: string;
  itemType: ListingType;
  title: string;
  category: string;
  color: string;
  location: string;
  happenedAt: string;
  happenedAtLabel: string;
  listingStatus: ListingWorkflowStatus;
  description: string;
  featureNotes: string;
  contactNote: string;
  ownerDisplayName: string;
  imageUrl: string | null;
  reward: number | null;
  matchCount: number;
  isMine: boolean;
}

export interface ListingDetailDto extends ListingSummaryDto {
  createdAt: string;
  updatedAt: string;
  images: ListingImageDto[];
}

export interface MatchDto {
  id: string;
  score: number;
  matchStatus: MatchStatus;
  reasonSummary: string;
  detailScores: Record<string, number>;
  lostItem: ListingSummaryDto;
  foundItem: ListingSummaryDto;
}

export interface InquiryDto {
  id: string;
  category: InquiryCategory;
  title: string;
  body: string;
  status: InquiryStatus;
  relatedItemType: ListingType | null;
  relatedItemId: string | null;
  createdAt: string;
  createdAtLabel: string;
}

export interface DashboardSummaryDto {
  openLostCount: number;
  openFoundCount: number;
  matchedCount: number;
  unreadNotificationCount: number;
}

export interface FinderBootstrapDto {
  userProfile: FinderUserProfileDto;
  myDevices: BleDeviceDto[];
  lostItems: LostItemDto[];
  chatThreads: ChatThreadDto[];
  safeZones: SafeZoneDto[];
  alertSettings: AlertSettingsDto;
  reports: ReportDto[];
  dashboardSummary: DashboardSummaryDto;
  myLostItems: ListingSummaryDto[];
  myFoundItems: ListingSummaryDto[];
  recentLostItems: ListingSummaryDto[];
  recentFoundItems: ListingSummaryDto[];
  suggestedMatches: MatchDto[];
  notifications: NotificationDto[];
  inquiries: InquiryDto[];
  availableCategories: string[];
  availableColors: string[];
}
