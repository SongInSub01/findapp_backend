// PostgreSQL 내부 오류 코드를 앱 사용자가 이해할 수 있는 문장으로 바꾼다.
type DatabaseErrorLike = Error & {
  code?: string;
  constraint?: string;
};

function uniqueConstraintMessage(constraint?: string) {
  switch (constraint) {
    case 'ble_devices_user_ble_code_unique_idx':
      return '이미 등록된 BLE 기기입니다. 다른 기기를 선택해 주세요.';
    case 'users_email_key':
      return '이미 사용 중인 이메일입니다.';
    case 'users_login_id_key':
    case 'users_login_id_unique_idx':
      return '이미 사용 중인 로그인 아이디입니다.';
    case 'chat_threads_item_requester_user_unique_idx':
      return '이미 해당 물건에 대한 채팅방이 있습니다.';
    case 'matches_unique_pair':
      return '이미 등록된 매칭 정보입니다.';
    default:
      return '이미 등록된 정보입니다. 기존 내용을 확인해 주세요.';
  }
}

export function toPublicDatabaseError(error: unknown) {
  if (!(error instanceof Error)) {
    return error;
  }

  const databaseError = error as DatabaseErrorLike;

  switch (databaseError.code) {
    case '23505':
      return new Error(uniqueConstraintMessage(databaseError.constraint));
    case '23503':
      return new Error('연결된 정보를 찾지 못했습니다. 삭제되었거나 사용할 수 없는 항목인지 확인해 주세요.');
    case '23514':
      return new Error('입력한 값이 허용 범위를 벗어났습니다. 내용을 다시 확인해 주세요.');
    case '23502':
      return new Error('필수 입력값이 빠져 있습니다. 내용을 다시 확인해 주세요.');
    case '22P02':
      return new Error('입력 형식이 올바르지 않습니다. 내용을 다시 확인해 주세요.');
    default:
      return error;
  }
}
