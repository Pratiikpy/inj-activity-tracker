// API error handling utilities
export interface APIErrorHandler {
  connectionTimeout: string;
  dnsFailure: string;
  rateLimited: string;
  serverError500: string;
  notFound404: string;
  badRequest400: string;
  emptyResponse: string;
  malformedJSON: string;
  missingFields: string;
  apiKeyExhausted: string;
  ipBlocked: string;
}

export const apiErrorMessages: APIErrorHandler = {
  connectionTimeout: 'Network timeout - please try again',
  dnsFailure: 'Cannot reach Injective servers - check connection',
  rateLimited: 'Too many requests - please wait 30 seconds',
  serverError500: 'Injective API temporarily down - try again in 1 minute',
  notFound404: 'Address not found on network',
  badRequest400: 'Invalid request - please check address format',
  emptyResponse: 'No data returned - address may be inactive',
  malformedJSON: 'Server returned invalid data - please retry',
  missingFields: 'Incomplete data received - some stats unavailable',
  apiKeyExhausted: 'API limit reached - please wait',
  ipBlocked: 'IP temporarily blocked - try from different network',
};

export function getAPIErrorMessage(status: number | string, fallback = 'Unknown error'): string {
  switch (status) {
    case 400: return apiErrorMessages.badRequest400;
    case 404: return apiErrorMessages.notFound404;
    case 429: return apiErrorMessages.rateLimited;
    case 500: return apiErrorMessages.serverError500;
    default: return fallback;
  }
} 