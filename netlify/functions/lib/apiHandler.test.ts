import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineHandler } from './apiHandler';

// Mock the auth module so we can control what verifyUser returns.
vi.mock('./auth', () => ({
  verifyUser: vi.fn(),
}));

import { verifyUser } from './auth';

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
