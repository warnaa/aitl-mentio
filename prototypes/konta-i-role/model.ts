export const DEMO_NOW = '2026-11-01T11:00:00Z';
export const DEMO_PASSWORD = 'MentioDemo!';
export type Role = 'mentee' | 'mentor' | 'admin';
export interface DemoAccount {
  email: string;
  name: string;
  roles: Role[];
  page?: 'draft' | 'published';
  passwordless?: boolean;
}
export const ACCOUNTS: DemoAccount[] = [
  { name: 'Ada Przykładowa', email: 'ada@example.test', roles: ['mentee'] },
  { name: 'Tomasz Modelowy', email: 'tomasz@example.test', roles: ['mentee', 'mentor'], page: 'draft' },
  { name: 'Olga Testowa', email: 'olga@example.test', roles: ['mentee', 'admin'] },
  { name: 'Leon Fikcyjny', email: 'leon@example.test', roles: ['mentee', 'mentor', 'admin'], page: 'published' },
  { name: 'Nina Szkicowa', email: 'nina@example.test', roles: ['mentee', 'mentor'] },
  { name: 'Konto archiwalne', email: 'legacy@example.test', roles: ['mentee'], passwordless: true },
];
export const SCREENS = [
  { id: 's04', title: 'Punkt powrotu', path: '/', stories: '#24 · Dm03, 09, 12' },
  { id: 's01', title: 'Logowanie', path: '/logowanie', stories: '#24 · Dm01, 02, 07–09, 12' },
  { id: 's02', title: 'Rejestracja', path: '/rejestracja', stories: '#24 · Dm01, 05, 07–09, 12, 14' },
  { id: 's03', title: 'Dołącz do mentorów', path: '/zostan-mentorem', stories: '#24 · Dm02, 03, 13, 14' },
  { id: 's06', title: 'Start mentora', path: '/mentor/strona', stories: '#14 / E01-S01 · #24 Dm09' },
  { id: 's07', title: 'Panel operatora', path: '/admin', stories: '#24 · Dm06' },
  { id: 's12', title: 'Pomoc z logowaniem', path: '/pomoc-z-logowaniem', stories: '#24 · Dm04 · L08' },
  { id: 's08', title: 'Nie znaleziono strony', path: '404', stories: '#24 · Dm06 · L09' },
  { id: 's11', title: 'Błąd otwarcia strony', path: '500', stories: '#24 · Dm02 · L12' },
] as const;
export type ScreenId = typeof SCREENS[number]['id'];
/** Screen notes belong to the review surface, outside the simulated product. */
export const SCREEN_NOTES: Record<ScreenId, { simulation: string; unresolved: string }> = {
  s01: { simulation: 'Logowanie, limity i sesja są lokalne; użyj wyłącznie MentioDemo!.', unresolved: 'Prototyp nie potwierdza działania JWT, ochrony haseł ani bezpieczeństwa infrastruktury.' },
  s02: { simulation: 'Konto powstaje tylko w pamięci; utracona odpowiedź i zajęty adres to scenariusze demo. Nie wysyłamy maila.', unresolved: 'Unikalność i wyścigi zapisów wymagają testów implementacji. Prototyp nie zmienia zasad rejestracji.' },
  s03: { simulation: 'Dodanie roli, jej cofnięcie i termin sesji są modelowane lokalnie.', unresolved: 'Nie sprawdzamy transakcji, CLI operatora ani współbieżnych zmian w bazie.' },
  s04: { simulation: 'Nagłówek pokazuje wyłącznie obecność symulowanego cookie; przekazanie do dalszego przepływu kończy się tutaj.', unresolved: 'To granica przepływu kont, nie projekt pełnej strony głównej ani rezerwacji.' },
  s06: { simulation: 'Status, fikcyjny adres i slug są przykładowe; zapis i publikacja pozostają jawnie nieaktywne.', unresolved: 'Nie rozstrzygamy edycji strony, konfliktów sluga, cennika, terminów ani publikacji.' },
  s07: { simulation: 'Liczba wynika z fixtures; 0 i Połączono są wynikami symulowanego odczytu, bez połączenia z bazą.', unresolved: 'PanelShell to zatwierdzony przyszły wygląd; nie migrujemy obecnej aplikacji i nie projektujemy zarządzania kontami.' },
  s08: { simulation: 'Wspólny widok 404 symuluje brak adresu lub roli; plik prototypu jest nadal serwowany jako HTTP 200.', unresolved: 'Rzeczywiste kody HTTP i kontrola uprawnień wymagają implementacji backendu.' },
  s11: { simulation: 'Awaria i ponowienie odczytu są lokalne; przy niepewnym wyniku nie ponawiamy automatycznie zapisu.', unresolved: 'Nie potwierdzamy monitoringu, przywracania usługi ani rzeczywistego wyniku operacji w bazie.' },
  s12: { simulation: 'To wyłącznie instrukcja kontaktu; nie otwieramy kanału i nie resetujemy hasła.', unresolved: 'Weryfikacja tożsamości i prywatny kontakt należą do procedury operatora, poza prototypem.' },
};
export function isScreen(value: string): value is ScreenId {
  return SCREENS.some(screen => screen.id === value);
}
export function startFor(account: DemoAccount): ScreenId {
  return account.roles.includes('admin') ? 's07' : account.roles.includes('mentor') ? 's06' : 's04';
}
export function slugFor(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replaceAll('ł', 'l').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
