/**
 * Onboarding Debug Logger
 * 
 * A safe logger that never crashes the app.
 * All logging is controlled by the ONBOARDING_DEBUG flag.
 * Sensitive keys are automatically redacted.
 */

import { ONBOARDING_DEBUG } from './onboardingConfig';

// Keys that should always be redacted from logs
const SENSITIVE_KEYS = [
  'token',
  'refreshToken',
  'idToken',
  'accessToken',
  'password',
  'authorization',
  'secret',
  'apiKey',
  'credential',
];

/**
 * Redacts sensitive values from an object for safe logging.
 * Returns a new object with sensitive keys replaced with '[REDACTED]'.
 */
function redactSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const redacted: Record<string, unknown> = {};
  
  for (const key of Object.keys(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some(sensitiveKey => 
      lowerKey.includes(sensitiveKey.toLowerCase())
    );
    
    if (isSensitive) {
      redacted[key] = '[REDACTED]';
    } else if (data[key] && typeof data[key] === 'object' && !Array.isArray(data[key])) {
      // Recursively redact nested objects
      redacted[key] = redactSensitiveData(data[key] as Record<string, unknown>);
    } else {
      redacted[key] = data[key];
    }
  }
  
  return redacted;
}

/**
 * Extracts just the keys from an object for logging.
 */
function getPayloadKeys(data: Record<string, unknown>): string[] {
  if (!data || typeof data !== 'object') {
    return [];
  }
  return Object.keys(data);
}

export interface OnboardingLogMeta {
  step: string;
  op: 'setDoc' | 'updateDoc' | 'batchCommit' | 'getDoc' | 'deleteDoc';
  path: string;
}

export interface OnboardingLogPayload {
  payloadKeys?: string[];
  payload?: Record<string, unknown>;
  includePayload?: boolean;
}

export interface OnboardingLogError {
  code?: string;
  message?: string;
}

/**
 * Logs onboarding activity. Does nothing if ONBOARDING_DEBUG is false.
 * Never throws - all errors are caught and silently ignored.
 */
export function onboardingLog(
  phase: 'before' | 'success' | 'error',
  meta: OnboardingLogMeta,
  payload?: OnboardingLogPayload,
  error?: OnboardingLogError
): void {
  // Early return if debugging is disabled
  if (!ONBOARDING_DEBUG) {
    return;
  }

  try {
    const prefix = `[Onboarding:${meta.step}]`;
    const timestamp = new Date().toISOString();
    
    switch (phase) {
      case 'before':
        console.log(
          `${prefix} BEFORE ${meta.op}`,
          `\n  Timestamp: ${timestamp}`,
          `\n  Path: ${meta.path}`,
          payload?.payloadKeys ? `\n  PayloadKeys: ${JSON.stringify(payload.payloadKeys)}` : '',
          payload?.includePayload && payload?.payload 
            ? `\n  Payload: ${JSON.stringify(redactSensitiveData(payload.payload), null, 2)}`
            : ''
        );
        break;
        
      case 'success':
        console.log(
          `${prefix} SUCCESS ${meta.op}`,
          `\n  Timestamp: ${timestamp}`,
          `\n  Path: ${meta.path}`
        );
        break;
        
      case 'error':
        console.error(
          `${prefix} ERROR ${meta.op}`,
          `\n  Timestamp: ${timestamp}`,
          `\n  Path: ${meta.path}`,
          `\n  ErrorCode: ${error?.code || 'unknown'}`,
          `\n  ErrorMessage: ${error?.message || 'No message'}`
        );
        break;
    }
  } catch {
    // Never crash - silently ignore logging errors
  }
}

/**
 * Creates a debug string for error messages when ONBOARDING_DEBUG is true.
 * Returns empty string when debugging is disabled.
 */
export function getDebugErrorString(step: string, errorCode?: string): string {
  if (!ONBOARDING_DEBUG) {
    return '';
  }
  
  try {
    return ` [DEBUG: step=${step}, code=${errorCode || 'unknown'}]`;
  } catch {
    return '';
  }
}

/**
 * Utility to safely stringify data for logging.
 */
export function safeStringify(data: unknown): string {
  try {
    if (data && typeof data === 'object') {
      return JSON.stringify(redactSensitiveData(data as Record<string, unknown>), null, 2);
    }
    return String(data);
  } catch {
    return '[Unable to stringify]';
  }
}

export { getPayloadKeys, redactSensitiveData };
