/**
 * API 에러 응답 객체에서 읽을 수 있는 문구 형태로 에러 메시지를 추출하는 유틸리티
 */
export function extractErrorMessage(errorData: any, fallbackMessage: string = '오류가 발생했습니다.'): string {
  if (!errorData) return fallbackMessage;

  if (typeof errorData === 'string') {
    return errorData;
  }

  const detail = errorData.detail;

  if (typeof detail === 'string') {
    return detail;
  }

  // FastAPI Validation Error (422 Unprocessable Entity) 처리
  if (Array.isArray(detail)) {
    return detail
      .map((item: any) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const msg = item.msg || JSON.stringify(item);
          const loc = Array.isArray(item.loc)
            ? item.loc.filter((l: any) => l !== 'body' && l !== 'query' && l !== 'path').join(' -> ')
            : '';
          return loc ? `[${loc}] ${msg}` : msg;
        }
        return String(item);
      })
      .join(', ');
  }

  if (detail && typeof detail === 'object') {
    return JSON.stringify(detail);
  }

  if (typeof errorData.message === 'string') {
    return errorData.message;
  }

  return fallbackMessage;
}
