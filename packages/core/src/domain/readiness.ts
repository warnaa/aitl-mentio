import { ValidationError } from '../http/errors';

export interface ReadinessItem {
  key: string;
  label: string;
  met: boolean;
}
export interface Readiness {
  ready: boolean;
  items: ReadinessItem[];
}
export interface Requirement<T> {
  key: string;
  label: string;
  test: (value: T) => boolean;
}

export function defineReadiness<T>(requirements: readonly Requirement<T>[]) {
  function evaluate(value: T): Readiness {
    const items = requirements.map(({ key, label, test }) => ({ key, label, met: test(value) }));
    return { ready: items.every((item) => item.met), items };
  }
  function assert(value: T, message = 'Complete the required profile fields before publishing.'): void {
    const result = evaluate(value);
    if (!result.ready) {
      throw new ValidationError(
        message,
        Object.fromEntries(result.items.filter((item) => !item.met).map((item) => [item.key, [item.label]])),
      );
    }
  }
  return { evaluate, assert };
}
