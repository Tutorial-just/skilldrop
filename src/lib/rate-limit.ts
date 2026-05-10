type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

const store = new Map<string, RateLimitRecord>();

function cleanupExpiredRecords() {
  const now = Date.now();

  for (const [key, record] of store.entries()) {
    if (record.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  cleanupExpiredRecords();

  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs;

    store.set(key, {
      count: 1,
      resetAt,
    });

    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - 1,
      resetAt,
    };
  }

  if (existing.count >= options.limit) {
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  store.set(key, existing);

  return {
    success: true,
    limit: options.limit,
    remaining: Math.max(options.limit - existing.count, 0),
    resetAt: existing.resetAt,
  };
}

export function getClientIp(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return (
    headers.get("x-real-ip") ??
    headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

export function assertRateLimit(
  key: string,
  options: RateLimitOptions,
  message = "Too many requests. Please try again later.",
) {
  const result = rateLimit(key, options);

  if (!result.success) {
    throw new Error(message);
  }

  return result;
}

export const rateLimitPresets = {
  auth: {
    limit: 10,
    windowMs: 60 * 1000,
  },
  booking: {
    limit: 8,
    windowMs: 60 * 1000,
  },
  payment: {
    limit: 6,
    windowMs: 60 * 1000,
  },
  profileUpdate: {
    limit: 20,
    windowMs: 60 * 1000,
  },
  contact: {
    limit: 5,
    windowMs: 60 * 1000,
  },
} satisfies Record<string, RateLimitOptions>;