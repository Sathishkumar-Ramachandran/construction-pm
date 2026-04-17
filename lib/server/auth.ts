import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET!);
const ALGO = "HS256";
const EXPIRE_HOURS = parseInt(process.env.ACCESS_TOKEN_EXPIRE_HOURS || "8");

export async function createAccessToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT({ ...payload, type: "access" })
    .setProtectedHeader({ alg: ALGO })
    .setExpirationTime(`${EXPIRE_HOURS}h`)
    .sign(getSecret());
}

export async function decodeAccessToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.type !== "access") return null;
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(plain: string, hashed: string): boolean {
  return bcrypt.compareSync(plain, hashed);
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateInviteToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function generateResetToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}
