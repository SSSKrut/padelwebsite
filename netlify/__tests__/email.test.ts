import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderTemplate } from '../functions/lib/emailTemplates';

// Mock Resend — vi.hoisted ensures the fn is available when vi.mock runs
const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

// Import after mock is set up
import { sendEmail } from '../functions/lib/email';

describe('renderTemplate', () => {
  it('renders welcome template with actionUrl', () => {
    const result = renderTemplate('welcome', {
      firstName: 'Alex',
      actionUrl: 'https://sunsetpadel.at/login',
    });

    expect(result.subject).toBe('Welcome to Sun Set Padel!');
    expect(result.html).toContain('Alex');
    expect(result.html).toContain('https://sunsetpadel.at/login');
    expect(result.html).toContain('Get Started');
  });

  it('renders welcome template without actionUrl', () => {
    const result = renderTemplate('welcome', { firstName: 'Alex' });

    expect(result.subject).toBe('Welcome to Sun Set Padel!');
    expect(result.html).toContain('Alex');
    expect(result.html).not.toContain('Get Started');
  });

  it('renders email-verification template', () => {
    const result = renderTemplate('email-verification', {
      firstName: 'John',
      actionUrl: 'https://sunsetpadel.at/verify?token=abc123',
    });

    expect(result.subject).toContain('Verify your email');
    expect(result.html).toContain('John');
    expect(result.html).toContain('https://sunsetpadel.at/verify?token=abc123');
    expect(result.html).toContain('Verify Email');
  });

  it('renders password-reset template', () => {
    const result = renderTemplate('password-reset', {
      firstName: 'Maria',
      actionUrl: 'https://sunsetpadel.at/reset?token=xyz',
    });

    expect(result.subject).toContain('Reset your password');
    expect(result.html).toContain('Maria');
    expect(result.html).toContain('Reset Password');
    expect(result.html).toContain('https://sunsetpadel.at/reset?token=xyz');
    expect(result.html).toContain("didn't request this");
  });

  it('renders event-registration template with all fields', () => {
    const result = renderTemplate('event-registration', {
      firstName: 'Alex',
      eventTitle: 'Sunday Padel',
      eventDate: '2026-03-22',
      eventTime: '18:00',
      eventVenue: 'Padel Vienna Arena',
      actionUrl: 'https://sunsetpadel.at/events/1',
    });

    expect(result.subject).toBe('Registration confirmed: Sunday Padel');
    expect(result.html).toContain('Alex');
    expect(result.html).toContain('Sunday Padel');
    expect(result.html).toContain('2026-03-22');
    expect(result.html).toContain('18:00');
    expect(result.html).toContain('Padel Vienna Arena');
    expect(result.html).toContain('View Event');
  });

  it('renders event-registration template with only required fields', () => {
    const result = renderTemplate('event-registration', {
      firstName: 'Alex',
      eventTitle: 'Quick Match',
      eventDate: '2026-04-01',
    });

    expect(result.html).toContain('Quick Match');
    expect(result.html).toContain('2026-04-01');
    expect(result.html).not.toContain('Time:');
    expect(result.html).not.toContain('Venue:');
    expect(result.html).not.toContain('View Event');
  });

  it('renders contact template', () => {
    const result = renderTemplate('contact', {
      name: 'Test User',
      email: 'test@example.com',
      phone: '+43 123 456',
      subject: 'Question about memberships',
      message: 'Hello,\nI have a question.',
    });

    expect(result.subject).toContain('Question about memberships');
    expect(result.html).toContain('Test User');
    expect(result.html).toContain('test@example.com');
    expect(result.html).toContain('+43 123 456');
    expect(result.html).toContain('Hello,<br/>I have a question.');
  });

  it('renders contact template with defaults for optional fields', () => {
    const result = renderTemplate('contact', {
      name: 'Anon',
      email: 'a@b.com',
      message: 'Hi',
    });

    expect(result.subject).toContain('Website contact request');
    expect(result.html).toContain('—'); // phone placeholder
  });

  it('escapes HTML in user-provided data', () => {
    const result = renderTemplate('welcome', {
      firstName: '<script>alert("xss")</script>',
    });

    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('&lt;script&gt;');
  });

  it('renders event-reminder template with all fields', () => {
    const result = renderTemplate('event-reminder', {
      firstName: 'Alex',
      eventTitle: 'Sunday Padel',
      eventDate: '2026-03-29',
      eventTime: '18:00',
      eventVenue: 'Padel Vienna Arena',
      actionUrl: 'https://sunsetpadel.at/events/1',
    });

    expect(result.subject).toBe('Reminder: Sunday Padel is tomorrow!');
    expect(result.html).toContain('Alex');
    expect(result.html).toContain('Sunday Padel');
    expect(result.html).toContain('2026-03-29');
    expect(result.html).toContain('18:00');
    expect(result.html).toContain('Padel Vienna Arena');
    expect(result.html).toContain('View Event');
    expect(result.html).toContain('see you tomorrow');
  });

  it('renders event-reminder template with only required fields', () => {
    const result = renderTemplate('event-reminder', {
      firstName: 'Alex',
      eventTitle: 'Quick Match',
      eventDate: '2026-04-01',
    });

    expect(result.html).toContain('Quick Match');
    expect(result.html).toContain('2026-04-01');
    expect(result.html).not.toContain('Time:');
    expect(result.html).not.toContain('Venue:');
    expect(result.html).not.toContain('View Event');
  });

  it('all templates include base layout elements', () => {
    const templates = [
      { name: 'welcome' as const, data: { firstName: 'X' } },
      { name: 'email-verification' as const, data: { firstName: 'X', actionUrl: 'http://a.com' } },
      { name: 'password-reset' as const, data: { firstName: 'X', actionUrl: 'http://a.com' } },
      { name: 'event-registration' as const, data: { firstName: 'X', eventTitle: 'E', eventDate: 'D' } },
      { name: 'event-reminder' as const, data: { firstName: 'X', eventTitle: 'E', eventDate: 'D' } },
      { name: 'contact' as const, data: { name: 'X', email: 'x@x.com', message: 'M' } },
    ];

    for (const t of templates) {
      const result = renderTemplate(t.name, t.data as any);
      expect(result.html).toContain('Sun Set Padel');
      expect(result.html).toContain('sunsetpadel.at');
      expect(result.html).toContain('<!DOCTYPE html>');
    }
  });
});

describe('sendEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({ error: null });
  });

  it('sends email with correct parameters', async () => {
    await sendEmail({
      to: 'user@example.com',
      template: 'welcome',
      data: { firstName: 'Alex' },
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const call = mockSend.mock.calls[0][0];
    expect(call.to).toEqual(['user@example.com']);
    expect(call.subject).toBe('Welcome to Sun Set Padel!');
    expect(call.html).toContain('Alex');
  });

  it('sends to multiple recipients', async () => {
    await sendEmail({
      to: ['a@example.com', 'b@example.com'],
      template: 'welcome',
      data: { firstName: 'Team' },
    });

    const call = mockSend.mock.calls[0][0];
    expect(call.to).toEqual(['a@example.com', 'b@example.com']);
  });

  it('includes replyTo when provided', async () => {
    await sendEmail({
      to: 'admin@example.com',
      template: 'contact',
      data: { name: 'User', email: 'user@test.com', message: 'Hi' },
      replyTo: 'user@test.com',
    });

    const call = mockSend.mock.calls[0][0];
    expect(call.replyTo).toBe('user@test.com');
  });

  it('does not include replyTo when not provided', async () => {
    await sendEmail({
      to: 'user@example.com',
      template: 'welcome',
      data: { firstName: 'Alex' },
    });

    const call = mockSend.mock.calls[0][0];
    expect(call.replyTo).toBeUndefined();
  });

  it('allows subject override', async () => {
    await sendEmail({
      to: 'user@example.com',
      template: 'welcome',
      data: { firstName: 'Alex' },
      subjectOverride: 'Custom Subject!',
    });

    const call = mockSend.mock.calls[0][0];
    expect(call.subject).toBe('Custom Subject!');
  });

  it('throws when Resend returns an error', async () => {
    mockSend.mockResolvedValue({ error: { message: 'Invalid API key' } });

    await expect(
      sendEmail({
        to: 'user@example.com',
        template: 'welcome',
        data: { firstName: 'Alex' },
      }),
    ).rejects.toThrow('Email send failed: Invalid API key');
  });
});
