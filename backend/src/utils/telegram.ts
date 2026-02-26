import crypto from "node:crypto";

export interface TelegramWebAppUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

export interface TelegramVerifiedInitData {
  hash: string;
  authDate: number;
  user: TelegramWebAppUser;
  queryId?: string;
  startParam?: string;
  chatType?: string;
  chatInstance?: string;
  raw: Record<string, string>;
}

export class TelegramInitDataError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "TelegramInitDataError";
  }
}

const normalizeHexHash = (value: string) => value.trim().toLowerCase();

const isHexHash = (value: string) => /^[a-f0-9]{64}$/.test(value);

const safeCompareHex = (leftHex: string, rightHex: string) => {
  if (!isHexHash(leftHex) || !isHexHash(rightHex)) {
    return false;
  }

  const left = Buffer.from(leftHex, "hex");
  const right = Buffer.from(rightHex, "hex");

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
};

const parseTelegramUser = (userRaw: string | null): TelegramWebAppUser => {
  if (!userRaw) {
    throw new TelegramInitDataError(401, "Telegram user ma'lumoti topilmadi");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(userRaw);
  } catch {
    throw new TelegramInitDataError(401, "Telegram user ma'lumoti yaroqsiz");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new TelegramInitDataError(401, "Telegram user ma'lumoti yaroqsiz");
  }

  const candidate = parsed as Record<string, unknown>;
  if (typeof candidate.id !== "number" || !Number.isInteger(candidate.id)) {
    throw new TelegramInitDataError(401, "Telegram user ID yaroqsiz");
  }

  return {
    id: candidate.id,
    first_name:
      typeof candidate.first_name === "string" ? candidate.first_name : undefined,
    last_name: typeof candidate.last_name === "string" ? candidate.last_name : undefined,
    username: typeof candidate.username === "string" ? candidate.username : undefined,
    language_code:
      typeof candidate.language_code === "string" ? candidate.language_code : undefined,
    allows_write_to_pm:
      typeof candidate.allows_write_to_pm === "boolean"
        ? candidate.allows_write_to_pm
        : undefined,
    photo_url: typeof candidate.photo_url === "string" ? candidate.photo_url : undefined
  };
};

export const verifyTelegramWebAppInitData = (params: {
  initData: unknown;
  botToken: string;
  maxAgeSeconds?: number;
}): TelegramVerifiedInitData => {
  const initData =
    typeof params.initData === "string" ? params.initData.trim() : "";
  const botToken = params.botToken.trim();
  const maxAgeSeconds = params.maxAgeSeconds ?? 60 * 60 * 24;

  if (!initData) {
    throw new TelegramInitDataError(400, "initData yuborilishi shart");
  }

  if (!botToken) {
    throw new TelegramInitDataError(500, "Telegram bot token sozlanmagan");
  }

  const urlParams = new URLSearchParams(initData);
  const hashRaw = urlParams.get("hash");

  if (!hashRaw) {
    throw new TelegramInitDataError(401, "Telegram hash topilmadi");
  }

  const hash = normalizeHexHash(hashRaw);
  if (!isHexHash(hash)) {
    throw new TelegramInitDataError(401, "Telegram hash yaroqsiz");
  }

  const entries = Array.from(urlParams.entries()).filter(([key]) => key !== "hash");
  const raw: Record<string, string> = {};

  for (const [key, value] of entries) {
    raw[key] = value;
  }

  const dataCheckString = entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (!safeCompareHex(computedHash, hash)) {
    throw new TelegramInitDataError(401, "Telegram imzo tekshiruvidan o'tmadi");
  }

  const authDateRaw = raw.auth_date;
  const authDate = Number(authDateRaw);

  if (!authDateRaw || !Number.isInteger(authDate) || authDate <= 0) {
    throw new TelegramInitDataError(401, "auth_date yaroqsiz");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (authDate > nowSeconds + 30) {
    throw new TelegramInitDataError(401, "Telegram auth vaqti yaroqsiz");
  }

  if (nowSeconds - authDate > maxAgeSeconds) {
    throw new TelegramInitDataError(401, "Telegram auth muddati tugagan");
  }

  const user = parseTelegramUser(raw.user ?? null);

  return {
    hash,
    authDate,
    user,
    queryId: raw.query_id,
    startParam: raw.start_param,
    chatType: raw.chat_type,
    chatInstance: raw.chat_instance,
    raw
  };
};
