import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineHandler } from '../functions/lib/apiHandler';

// Mock the auth module so we can control what verifyUser returns.
vi.mock('../functions/lib/auth', () => ({
  verifyUser: vi.fn(),
}));

import { verifyUser } from '../functions/lib/auth';

// Helper to create a fake Netlify Event
const createEvent = (options: any = {}) => ({
  httpMethod: 'GET',
  path: '/test',
  headers: {},
  body: null,
  isBase64Encoded: false,
  queryStringParameters: {},
  ...options,
});

describe('defineHandler Role Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockHandlerFn = vi.fn(async () => ({ success: true }));

  it('allows access to public endpoints without throwing errors', async () => {
    const handler = defineHandler({
      handler: mockHandlerFn,
    });

    const result: any = await handler(createEvent(), {} as any);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ success: true });
    expect(verifyUser).not.toHaveBeenCalled();
    expect(mockHandlerFn).toHaveBeenCalled();
  });

  it('rejects unauthenticated users when requireAuth is true', async () => {
    (verifyUser as any).mockRejectedValue(new Error('Unauthorized'));

    const handler = defineHandler({
      requireAuth: true,
      handler: mockHandlerFn,
    });

    const result: any = await handler(createEvent(), {} as any);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body)).toEqual({ error: 'Unauthorized' });
    expect(mockHandlerFn).not.toHaveBeenCalled();
  });

  it('allows authenticated (ordinary) users when requireAuth is true', async () => {
    (verifyUser as any).mockResolvedValue({ id: 'user-id', role: 'USER' });

    const handler = defineHandler({
      requireAuth: true,
      handler: mockHandlerFn,
    });

    const result: any = await handler(createEvent(), {} as any);

    expect(result.statusCode).toBe(200);
    expect(mockHandlerFn).toHaveBeenCalledWith(
      expect.objectContaining({ user: { id: 'user-id', role: 'USER' } })
    );
  });

  it('blocks ordinary users when requireAdmin is true', async () => {
    (verifyUser as any).mockResolvedValue({ id: 'user-id', role: 'USER' });

    const handler = defineHandler({
      requireAdmin: true,
      handler: mockHandlerFn,
    });

    const result: any = await handler(createEvent(), {} as any);

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body)).toEqual({ error: 'Forbidden. Admin access required.' });
    expect(mockHandlerFn).not.toHaveBeenCalled();
  });

  it('allows ADMIN users when requireAdmin is true', async () => {
    (verifyUser as any).mockResolvedValue({ id: 'admin-id', role: 'ADMIN' });

    const handler = defineHandler({
      requireAdmin: true,
      handler: mockHandlerFn,
    });

    const result: any = await handler(createEvent(), {} as any);

    expect(result.statusCode).toBe(200);
    expect(mockHandlerFn).toHaveBeenCalledWith(
      expect.objectContaining({ user: { id: 'admin-id', role: 'ADMIN' } })
    );
  });

  it('allows SUPER_ADMIN users when requireAdmin is true', async () => {
    (verifyUser as any).mockResolvedValue({ id: 'super-admin-id', role: 'SUPER_ADMIN' });

    const handler = defineHandler({
      requireAdmin: true,
      handler: mockHandlerFn,
    });

    const result: any = await handler(createEvent(), {} as any);

    expect(result.statusCode).toBe(200);
    expect(mockHandlerFn).toHaveBeenCalledWith(
      expect.objectContaining({ user: { id: 'super-admin-id', role: 'SUPER_ADMIN' } })
    );
  });
});

describe('apiHandler error sanitization', () => {
  it('does not expose Prisma P1001 error codes to client', async () => {
    const handler = defineHandler({
      handler: async () => {
        const err: any = new Error('Connection refused');
        err.code = 'P1001';
        throw err;
      },
    });

    const result: any = await handler(createEvent(), {} as any);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Internal Server Error');
    expect(body.error).not.toContain('DATABASE_URL');
    expect(body.error).not.toContain('P1001');
  });

  it('does not expose P2021 table-not-found details', async () => {
    const handler = defineHandler({
      handler: async () => {
        const err: any = new Error('Table not found');
        err.code = 'P2021';
        throw err;
      },
    });

    const result: any = await handler(createEvent(), {} as any);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Internal Server Error');
    expect(body.error).not.toContain('migrate');
    expect(body.error).not.toContain('P2021');
  });

  it('does not expose P1002 connection error details', async () => {
    const handler = defineHandler({
      handler: async () => {
        const err: any = new Error('Connection timed out');
        err.code = 'P1002';
        throw err;
      },
    });

    const result: any = await handler(createEvent(), {} as any);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Internal Server Error');
  });

  it('surfaces application-level errors with statusCode', async () => {
    const handler = defineHandler({
      handler: async () => {
        const err: any = new Error('This link has expired.');
        err.statusCode = 400;
        throw err;
      },
    });

    const result: any = await handler(createEvent(), {} as any);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('This link has expired.');
  });

  it('returns generic 500 for unknown errors', async () => {
    const handler = defineHandler({
      handler: async () => {
        throw new Error('Something unexpected');
      },
    });

    const result: any = await handler(createEvent(), {} as any);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Internal Server Error');
    expect(body.error).not.toContain('unexpected');
  });
});
