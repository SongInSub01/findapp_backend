// 앱 화면에 맞는 한글 시간 라벨을 서버에서 통일해서 만든다.
export function formatTimeLabel(date: Date = new Date()) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Seoul',
  }).format(date);
}

export function nowLabel() {
  return '방금 전';
}

export function formatRelativeDateLabel(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays <= 7) {
    return `${diffDays}일 전`;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Seoul',
  }).format(date);
}

export function formatIsoString(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}
