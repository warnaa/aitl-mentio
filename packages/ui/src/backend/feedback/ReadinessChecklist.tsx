import type { ReactNode } from 'react';
export interface ReadinessItem {
  key: string;
  label: string;
  met: boolean;
}
export function ReadinessChecklist({
  items,
  actionsByKey = {},
  title = 'Before you publish',
}: {
  items: readonly ReadinessItem[];
  actionsByKey?: Record<string, ReactNode>;
  title?: ReactNode;
}) {
  return (
    <section className="space-y-4" aria-label="Readiness">
      <h2 className="text-lg font-medium">{title}</h2>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.key}>
            <span>
              {item.met ? 'Complete: ' : 'Required: '}
              {item.label}
            </span>
            {!item.met && actionsByKey[item.key]}
          </li>
        ))}
      </ul>
    </section>
  );
}
