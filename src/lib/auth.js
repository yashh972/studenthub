import { SignJWT, jwtVerify } from 'jose';

const secretStr = process.env.JWT_SECRET || 'studyhub-super-secret-key-development-jwt-123456';
const JWT_SECRET = new TextEncoder().encode(secretStr);

/**
 * Creates a signed JWT token containing the given payload.
 * Expires in 7 days by default.
 * @param {Object} payload 
 * @returns {Promise<string>}
 */
export async function signJWT(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * Verifies a JWT token and returns the payload if successful.
 * Returns null if verification fails.
 * @param {string} token 
 * @returns {Promise<Object|null>}
 */
export async function verifyJWT(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    console.error('JWT Verification failed:', error.message);
    return null;
  }
}
