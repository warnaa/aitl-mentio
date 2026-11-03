import { asClass, asValue, createContainer, InjectionMode } from 'awilix';
import { describe, expect, it } from 'vitest';
import { systemClock, type Clock } from './clock';

class ExpiryChecker {
  private readonly clock: Clock;

  constructor({ clock }: { clock: Clock }) {
    this.clock = clock;
  }

  isExpired(expiresAt: Date): boolean {
    return this.clock.now().getTime() >= expiresAt.getTime();
  }
}

describe('systemClock', () => {
  it('returns the current instant as a Date', () => {
    const before = Date.now();
    const now = systemClock.now();
    const after = Date.now();

    expect(now).toBeInstanceOf(Date);
    expect(now.getTime()).toBeGreaterThanOrEqual(before);
    expect(now.getTime()).toBeLessThanOrEqual(after);
  });

  it('returns a fresh Date on every call', () => {
    expect(systemClock.now()).not.toBe(systemClock.now());
  });
});

describe('an injected fixed clock', () => {
  it('is honoured by a service that takes the clock from the cradle', () => {
    const fixed = new Date('2026-09-04T12:00:00.000Z');
    const container = createContainer({ injectionMode: InjectionMode.PROXY, strict: true });
    container.register({
      clock: asValue<Clock>({ now: () => fixed }),
      checker: asClass(ExpiryChecker),
    });

    const checker = container.resolve<ExpiryChecker>('checker');

    expect(checker.isExpired(new Date('2026-09-04T12:00:00.000Z'))).toBe(true);
    expect(checker.isExpired(new Date('2026-09-04T12:00:00.001Z'))).toBe(false);
  });
});
