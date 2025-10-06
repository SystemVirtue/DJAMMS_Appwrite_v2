/**
 * API Response Helpers
 * Ensures all API responses follow the standardized envelope: { success, data, message?, error? }
 */

export type ErrorDetails = any;

export function successResponse<T = any>(data: T | null = null, message?: string) {
  const resp: { success: true; data: T | null; message?: string } = {
    success: true,
    data: data
  };
  if (message) resp.message = message;
  return resp;
}

export function errorResponse(opts: {
  code?: string;
  message?: string;
  userMessage?: string;
  details?: ErrorDetails;
} = {}) {
  const { code = 'ERROR', message = 'An error occurred', userMessage, details } = opts;
  return {
    success: false,
    data: null,
    message,
    error: {
      code,
      message,
      userMessage: userMessage || message,
      details: details || null
    }
  };
}
