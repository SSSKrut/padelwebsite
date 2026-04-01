import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from '../functions/auth-login';
import { prisma } from '../functions/lib/prisma';
import * as bcrypt from 'bcryptjs';
import { signAccessToken, signRefreshToken } from '../functions/lib/jwt';

// Mock dependencies
vi.mock('../functions/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  compare: vi.fn(),
}));

vi.mock('../functions/lib/jwt', () => ({
  signAccessToken: vi.fn().mockResolvedValue('access-token'),
  signRefreshToken: vi.fn().mockResolvedValue('refresh-token'),
}));

describe('auth-login function', () => {
  const createEvent = (body: any) => ({
    httpMethod: 'POST',
    body: JSON.stringify(body),
    headers: {},
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('declines login if user not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const response = await handler(createEvent({ email: 'fake@example.com', password: 'password123' }), {} as any);

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body!)).toEqual({ error: 'Invalid credentials.' });
  });

  it('declines login if password is incorrect', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-1', email: 'test@example.com', passwordHash: 'hash' } as any);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as any);

    const response = await handler(createEvent({ email: 'test@example.com', password: 'wrongpassword' }), {} as any);

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body!)).toEqual({ error: 'Invalid credentials.' });
  });

  it('logs in successfully with correct credentials', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: 'hash',
      role: 'USER'
    } as any);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as any);

    const response = await handler(createEvent({ email: 'test@example.com', password: 'correctpassword' }), {} as any);

    expect(response.statusCode).toBe(200);
    expect(response.multiValueHeaders?.['Set-Cookie']).toBeDefined();

    const body = JSON.parse(response.body!);
    expect(body.user.email).toBe('test@example.com');
    // Sanitize user should have removed passwordHash
    expect(body.user.passwordHash).toBeUndefined();

    expect(signAccessToken).toHaveBeenCalledWith({ sub: 'user-1' });
    expect(signRefreshToken).toHaveBeenCalledWith({ sub: 'user-1' });
  });
});
