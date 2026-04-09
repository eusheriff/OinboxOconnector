import { SignJWT, jwtVerify } from 'jose';

export interface AppJWTPayload {
  sub: string;
  tenantId: string;
  role: string;
  name: string;
  email?: string;
}

const DEFAULT_EXPIRATION = '24h';
const IMPERSONATION_EXPIRATION = '1h';
const ALGORITHM = 'HS256';

/**
 * Gera um JWT com payload e secret.
 */
export async function generateJWT(
  payload: AppJWTPayload,
  secret: string,
  options?: { expiresIn?: string },
): Promise<string> {
  const jwtSecret = new TextEncoder().encode(secret);
  const expiresIn = options?.expiresIn || DEFAULT_EXPIRATION;

  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(jwtSecret);

  return token;
}

/**
 * Gera um JWT para impersonação (expiração curta de 1h).
 */
export async function generateImpersonationJWT(
  payload: AppJWTPayload,
  secret: string,
): Promise<string> {
  return generateJWT(payload, secret, { expiresIn: IMPERSONATION_EXPIRATION });
}

/**
 * Verifica e decodifica um JWT.
 */
export async function verifyJWT(
  token: string,
  secret: string,
): Promise<{ payload: Record<string, unknown> }> {
  const jwtSecret = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, jwtSecret);
  return { payload };
}
