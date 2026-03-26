import crypto from "node:crypto";
import QRCode from "qrcode";
import { config } from "../config.js";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const generatePublicToken = () => crypto.randomBytes(24).toString("base64url");

export const generatePublicCode = (prefix: string) =>
  `${prefix}_${crypto.randomBytes(6).toString("hex")}`;

export const hashValue = (value?: string | null) => {
  if (!value) {
    return null;
  }

  return crypto.createHash("sha256").update(value).digest("hex");
};

export function buildPublicQrUrl(token: string): string;
export function buildPublicQrUrl(token: string | null | undefined): string | null;
export function buildPublicQrUrl(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  const baseUrl = trimTrailingSlash(config.publicMenuBaseUrl);
  return `${baseUrl}/q/${token}`;
}

export const buildQrSvgMarkup = async (token: string) => {
  return QRCode.toString(buildPublicQrUrl(token), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: {
      dark: "#111827",
      light: "#ffffff"
    }
  });
};
