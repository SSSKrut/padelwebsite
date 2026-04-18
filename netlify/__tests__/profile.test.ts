import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from '../functions/profile';
import { prisma } from '../functions/lib/prisma';
import { verifyUser } from '../functions/lib/auth';

// Mock dependencies
vi.mock('../functions/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userEmailPreferences: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('../functions/lib/auth', () => ({
  verifyUser: vi.fn(),
}));

describe('profile function', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com', role: 'USER' };

  const createEvent = (method: string, body?: any) => ({
    httpMethod: method,
    body: body ? JSON.stringify(body) : null,
    headers: {},
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyUser).mockResolvedValue(mockUser as any);
  });

  it('GET /profile returns user without password', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: 'secret-hash',
      firstName: 'John',
      lastName: 'Doe',
      emailPreferences: null,
    } as any);

    const response = await handler(createEvent('GET'), {} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body!);
    expect(body.passwordHash).toBeUndefined();
    expect(body.firstName).toBe('John');
  });

  it('GET /profile returns 404 if user not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const response = await handler(createEvent('GET'), {} as any);

    expect(response.statusCode).toBe(404);
  });

  it('PATCH /profile updates user details', async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: 'secret-hash',
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '12345'
    } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: 'secret-hash',
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '12345',
      emailPreferences: null,
    } as any);

    const response = await handler(createEvent('PATCH', {
      firstName: 'Jane',
      phone: '12345'
    }), {} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body!);
    expect(body.user.passwordHash).toBeUndefined();
    expect(body.user.firstName).toBe('Jane');
    expect(body.user.phone).toBe('12345');
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-123' },
      data: { firstName: 'Jane', phone: '12345' }
    }));
    expect(prisma.userEmailPreferences.upsert).not.toHaveBeenCalled();
  });

  it('PATCH /profile requires at least one field to update', async () => {
    const response = await handler(createEvent('PATCH', {}), {} as any);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body!)).toEqual({ error: 'No fields provided to update' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('PATCH /profile updates email preferences', async () => {
    vi.mocked(prisma.userEmailPreferences.upsert).mockResolvedValue({} as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: 'secret-hash',
      firstName: 'John',
      lastName: 'Doe',
      emailPreferences: {
        eventReminder: false,
      },
    } as any);

    const response = await handler(createEvent('PATCH', {
      emailPreferences: { eventReminder: false },
    }), {} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body!);
    expect(body.user.emailPreferences.eventReminder).toBe(false);
    expect(prisma.userEmailPreferences.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-123' },
      update: { eventReminder: false },
    }));
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
