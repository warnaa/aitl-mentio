// Fictional accounts for the existing admin Users list (`/admin/users`). The shape mirrors core's
// `UserDto` (`services/auth/user.service.ts`): `ui` must not import `core`, so it is declared here.
// `name` is null for rows that predate the name field (accounts spec, Data Model → Legacy rows).
export interface AdminUser { id: string; email: string; name: string | null; createdAt: string }

const people: [string, string | null][] = [
  ['kasia.nowak@example.test', 'Kasia Nowak'],
  ['alex.kowalski@example.test', 'Alex Kowalski'],
  ['marta.zielinska@example.test', 'Marta Zielińska'],
  ['piotr.wojcik@example.test', 'Piotr Wójcik'],
  ['ola.lewandowska@example.test', 'Ola Lewandowska'],
  ['tomek.kaminski@example.test', null],
  ['ewa.dabrowska@example.test', 'Ewa Dąbrowska'],
  ['bartek.mazur@example.test', 'Bartek Mazur'],
  ['zofia.krawczyk@example.test', 'Zofia Krawczyk'],
  ['jan.szymanski@example.test', null],
  ['magda.wozniak@example.test', 'Magda Woźniak'],
  ['kuba.kozlowski@example.test', 'Kuba Kozłowski'],
  ['natalia.jankowska@example.test', 'Natalia Jankowska'],
  ['michal.wojciechowski@example.test', 'Michał Wojciechowski'],
  ['agnieszka.kwiatkowska@example.test', 'Agnieszka Kwiatkowska'],
];

const id = (index: number) => `5d0c6f2e-8a41-4b7e-9c3d-${String(index + 1).padStart(12, '0')}`;

/** 45 accounts, newest first (the API orders by `createdAt desc, id asc`). Created at 10:00 UTC, one per day. */
export const adminUsers: AdminUser[] = Array.from({ length: 45 }, (_, index) => {
  const [email, name] = people[index % people.length];
  const [local, domain] = email.split('@');
  const day = new Date(Date.UTC(2026, 9, 31, 10, 0, 0) - index * 86_400_000);
  return { id: id(index), email: index < people.length ? email : `${local}${Math.floor(index / people.length) + 1}@${domain}`, name, createdAt: day.toISOString() };
});

/** Legacy rows without a name: the list shows “—” (existing `users-table.tsx`). */
export const legacyUsers: AdminUser[] = adminUsers.slice(0, 6).map((user, index) => (index % 2 === 0 ? { ...user, name: null } : user));

/** The longest realistic values: a name at the 80-character registration limit, and a long work address. */
export const longUser: AdminUser = {
  id: id(99),
  email: 'aleksandra.wisniewska-kowalczyk.grzybowska@instytut-informatyki-stosowanej.example.test',
  name: 'Aleksandra Maria Wiśniewska-Kowalczyk-Grzybowska z domu Szczepańska-Wróbel-Lisek',
  createdAt: '2026-11-01T09:15:00.000Z',
};
