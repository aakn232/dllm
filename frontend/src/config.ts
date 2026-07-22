// 환경변수 기반 API 기본 URL 설정
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;

// VITE_API_BASE_URL 설정이 없으면 현재 창 호스트 또는 상대 경로 기반 처리
export const API_BASE_URL = rawBaseUrl !== undefined ? rawBaseUrl : '';
export const API_V1_BASE = `${API_BASE_URL}/api/v1`;
