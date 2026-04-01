import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from '../functions/auth-register';
import { prisma } from '../functions/lib/prisma';
import * as bcrypt from 'bcryptjs';
import { signAccessToken, signRefreshToken } from '../functions/lib/jwt';

// Mock dependencies
vi.mock('../functions/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('hashed-password'),
}));

vi.mock('../functions/lib/jwt', () => ({
  signAccessToken: vi.fn().mockResolvedValue('access-token'),
  signRefreshToken: vi.fn().mockResolvedValue('refresh-token'),
}));

vi.mock('../functions/lib/tokens', () => ({
  createToken: vi.fn().mockResolvedValue({ token: 'mock-token' }),
  buildActionUrl: vi.fn().mockReturnValue('http://localhost:8080/verify-email?token=mock-token'),
}));

vi.mock('../functions/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('auth-register function', () => {
  const createEvent = (body: any) => ({
    httpMethod: 'POST',
    body: JSON.stringify(body),
    headers: {},
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('declines registration if email already exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-1', email: 'test@example.com' } as any);

    const response = await handler(createEvent({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe'
    }), {} as any);

    expect(response.statusCode).toBe(409);
    expect(JSON.parse(response.body!)).toEqual({ error: 'Email already registered.' });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('registers successfully with valid payload', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'user-2',
      email: 'newuser@example.com',
      firstName: 'John',
      lastName: 'Doe',
      passwordHash: 'hashed-password',
      role: 'USER'
    } as any);

    const response = await handler(createEvent({
      email: 'newuser@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe'
    }), {} as any);

    expect(response.statusCode).toBe(201);
    expect(response.multiValueHeaders?.['Set-Cookie']).toBeDefined();

    const body = JSON.parse(response.body!);
    expect(body.user.email).toBe('newuser@example.com');
    // Sanitize user should have removed passwordHash
    expect(body.user.passwordHash).toBeUndefined();

    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe'
      })
    }));

    expect(signAccessToken).toHaveBeenCalledWith({ sub: 'user-2' });
    expect(signRefreshToken).toHaveBeenCalledWith({ sub: 'user-2' });
  });

  it('validates minimum password length', async () => {
    // Password is only 3 chars (requires 8 usually from schema, let's test zod validation intercept)
    const response = await handler(createEvent({
      email: 'test@example.com',
      password: '123',
      firstName: 'John',
      lastName: 'Doe'
    }), {} as any);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body!);
    expect(body.error).toBe('Validation Error');
  });
});
