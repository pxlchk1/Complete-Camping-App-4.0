/*
IMPORTANT NOTICE: DO NOT REMOVE
This is a custom client for the OpenAI API. You may update this service, but you should not need to.

valid model names:
gpt-4.1-2025-04-14
o4-mini-2025-04-16
gpt-4o-2024-11-20
*/
import OpenAI from "openai";

type OpenAIClient = InstanceType<typeof OpenAI>;

let _client: OpenAIClient | null = null;

/**
 * Creates a client-like object that throws a clear error if used.
 * This prevents "undefined apiKey" crashes and makes missing config obvious.
 */
const createDisabledClient = (reason: string): OpenAIClient => {
  const err = new Error(
    `[OpenAI] Client is disabled: ${reason}. ` +
      `Set EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY (or disable AI features in UI).`,
  );

  // Proxy will throw on any property access/call.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Proxy({} as any, {
    get() {
      throw err;
    },
    apply() {
      throw err;
    },
  }) as OpenAIClient;
};

const getTimeoutMs = (): number => {
  const raw = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : NaN;
  // Default: 20s. Keep it bounded to avoid "infinite spinner" UX.
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
 * Returns a singleton OpenAI client.
 *
 * Notes:
 * - EXPO_PUBLIC_* env vars are embedded into the app bundle. This is fine for local/dev,
 *   but NOT secure for production secrets. Prefer a backend proxy for real deployments.
 * - If the key is missing, we return a disabled client that throws a clear error when used.
 */
export const getOpenAIClient = (): OpenAIClient => {
  if (_client) return _client;

  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;
  const baseURL = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_BASE_URL;

  if (!apiKey) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        "[OpenAI] EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY is missing. AI features should be hidden/disabled in the UI.",
      );
    }
    _client = createDisabledClient("Missing EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY");
    return _client;
  }

  _client = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
    // React Native runs in a browser-like JS runtime; the OpenAI SDK may warn unless this is set.
    dangerouslyAllowBrowser: true,
    fetch: fetchWithTimeout,
  });

  return _client;
};

/**
 * Optional helper: use this to gate UI entrypoints safely.
 * Example: if (!isOpenAIConfigured()) { show paywall/info instead of AI screen }
 */
export const isOpenAIConfigured = (): boolean => {
  return Boolean(process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY);
};

/**
 * Optional helper: clear cached client (useful in tests or if you support runtime config changes).
 */
export const resetOpenAIClientForTests = (): void => {
  _client = null;
};
