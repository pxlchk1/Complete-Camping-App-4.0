/*
IMPORTANT NOTICE: DO NOT REMOVE
This is a custom client for the Grok API. You may update this service, but you should not need to.
The Grok API can be communicated with the "openai" package, so you can use the same functions as the openai package.
It may not support all the same features, so please be careful.

Models:
grok-3-latest
grok-3-fast-latest
grok-3-mini-latest
*/
import OpenAI from "openai";

type GrokClient = InstanceType<typeof OpenAI>;

let _client: GrokClient | null = null;

const GROK_BASE_URL = "https://api.x.ai/v1";

/**
 * Creates a client-like object that throws a clear error if used.
 * This prevents silent "undefined apiKey" issues and makes missing config obvious.
 */
const createDisabledClient = (reason: string): GrokClient => {
  const err = new Error(
    `[Grok] Client is disabled: ${reason}. ` +
      `Set EXPO_PUBLIC_VIBECODE_GROK_API_KEY (or disable Grok features in UI).`,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Proxy({} as any, {
    get() {
      throw err;
    },
    apply() {
      throw err;
    },
  }) as GrokClient;
};

const getTimeoutMs = (): number => {
  const raw = process.env.EXPO_PUBLIC_VIBECODE_GROK_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : NaN;
  // Default: 20s. Bound to avoid runaway wait times.
  if (!Number.isFinite(parsed) || parsed <= 0) return 20_000;
  return Math.min(Math.max(parsed, 2_000), 120_000);
};

/**
 * A fetch wrapper that enforces an AbortController timeout.
 * Also respects any upstream `init.signal` by chaining abort signals.
 */
const fetchWithTimeout: typeof fetch = async (input, init) => {
  const timeoutMs = getTimeoutMs();
  const controller = new AbortController();

  const upstreamSignal = init?.signal;
  if (upstreamSignal) {
    if (upstreamSignal.aborted) controller.abort();
    else {
      const onAbort = () => controller.abort();
      upstreamSignal.addEventListener("abort", onAbort, { once: true });
    }
  }

  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Returns a singleton Grok client (OpenAI SDK configured for x.ai).
 *
 * Notes:
 * - EXPO_PUBLIC_* env vars are embedded into the app bundle. This is fine for local/dev,
 *   but NOT secure for production secrets. Prefer a backend proxy for real deployments.
 * - If the key is missing, we return a disabled client that throws a clear error when used.
 */
export const getGrokClient = (): GrokClient => {
  if (_client) return _client;

  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_GROK_API_KEY;
  const baseURL = process.env.EXPO_PUBLIC_VIBECODE_GROK_BASE_URL || GROK_BASE_URL;

  if (!apiKey) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        "[Grok] EXPO_PUBLIC_VIBECODE_GROK_API_KEY is missing. Grok features should be hidden/disabled in the UI.",
      );
    }
    _client = createDisabledClient("Missing EXPO_PUBLIC_VIBECODE_GROK_API_KEY");
    return _client;
  }

  _client = new OpenAI({
    apiKey,
    baseURL,
    // React Native runs in a browser-like JS runtime; the OpenAI SDK may warn unless this is set.
    dangerouslyAllowBrowser: true,
    fetch: fetchWithTimeout,
  });

  return _client;
};

/**
 * Optional helper: use this to gate UI entrypoints safely.
 */
export const isGrokConfigured = (): boolean => {
  return Boolean(process.env.EXPO_PUBLIC_VIBECODE_GROK_API_KEY);
};

/**
 * Optional helper: clear cached client (useful in tests or if you support runtime config changes).
 */
export const resetGrokClientForTests = (): void => {
  _client = null;
};
