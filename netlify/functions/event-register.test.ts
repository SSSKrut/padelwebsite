import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './event-register';
import { prisma } from './lib/prisma';
import { verifyUser } from './lib/auth';

// Mock dependencies
vi.mock('./lib/prisma', () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
    },
    eventRegistration: {
      findFirst: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('./lib/auth', () => ({
  verifyUser: vi.fn(),
}));

describe('event-register function', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com', role: 'USER' };
  const mockEventId = "123e4567-e89b-12d3-a456-426614174000";

  const createEvent = (body) => ({
    httpMethod: 'POST',
    body: JSON.stringify(body),
    headers: {},
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyUser).mockResolvedValue(mockUser as any);
  });

  it('declines registration if event is not found', async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(null);

    const response = await handler(createEvent({ eventId: mockEventId }), {} as any);
    
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body!)).toEqual({ error: 'Event not found' });
  });

  it('unregisters if user is already registered', async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      id: mockEventId,
      maxParticipants: 16,
      _count: { participants: 10 }
    } as any);
    
    vi.mocked(prisma.eventRegistration.findFirst).mockResolvedValue({
      id: 'reg-123',
      eventId: mockEventId,
      userId: mockUser.id
    } as any);

    const response = await handler(createEvent({ eventId: mockEventId }), {} as any);
    
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body!)).toEqual({ message: 'Successfully unregistered', registered: false });
    expect(prisma.eventRegistration.delete).toHaveBeenCalledWith({ where: { id: 'reg-123' }});
  });

  it('declines registration if event is full', async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      id: mockEventId,
      maxParticipants: 16,
      _count: { participants: 16 }
    } as any);
    
    vi.mocked(prisma.eventRegistration.findFirst).mockResolvedValue(null);

    const response = await handler(createEvent({ eventId: mockEventId }), {} as any);
    
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body!)).toEqual({ error: 'Event is already full' });
  });

  it('registers successfully if event has space and user not registered', async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      id: mockEventId,
      maxParticipants: 16,
      _count: { participants: 15 } // One spot left
    } as any);
    
    vi.mocked(prisma.eventRegistration.findFirst).mockResolvedValue(null);

    const response = await handler(createEvent({ eventId: mockEventId }), {} as any);
    
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body!)).toEqual({ message: 'Successfully registered', registered: true });
    expect(prisma.eventRegistration.create).toHaveBeenCalledWith({
      data: { eventId: mockEventId, userId: mockUser.id }
    });
  });
});
