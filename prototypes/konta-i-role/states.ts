import type { ScreenId } from './model';

export const STATE_LABELS = {
  s01: ['Pusty formularz', 'Wysyłanie', 'Walidacja pól', 'Nieprawidłowe dane · 401', 'Limit prób · 429', 'Brak sieci', 'Błąd usługi · 500', 'Sukces → cel', 'Niebezpieczny cel → /', 'Już zalogowano → cel', 'Powrót po utracie sesji'],
  s02: ['Pusty formularz', 'Wysyłanie', 'Walidacja pól', 'Zajęty adres · 409', 'Limit prób · 429', 'Brak sieci', 'Błąd usługi · 500', 'Zapisano, utracono odpowiedź', 'Sukces → cel', 'Niebezpieczny cel → /', 'Już zalogowano → cel', 'Wariant mentora'],
  s03: ['Dołączenie', 'Wysyłanie', 'Błąd akcji', 'Dodano rolę → cel', 'Utrata sesji', 'Już mentor → cel', 'Gość → logowanie'],
  s04: ['Bez cookie', 'Cookie obecne', 'Nieaktualne cookie', 'Wylogowywanie', 'Błąd wylogowania', 'Wylogowano', 'Publiczny widok przy awarii'],
  s06: ['Istniejąca strona', 'Brak strony', 'Ładowanie', 'Błąd odczytu'],
  s07: ['Dane', 'Zero użytkowników', 'Błąd danych', 'Ładowanie'],
  s08: ['Wspólna 404 / odmowa'], s11: ['Awaria sprawdzania dostępu'], s12: ['Instrukcja odzyskania dostępu'],
} satisfies Record<ScreenId, string[]>;
export type StateId = `${ScreenId}.${string}`;
export const STATES = Object.entries(STATE_LABELS).flatMap(([screen, labels]) => labels.map((label, i) => ({ id: `${screen}.${String(i + 1).padStart(2, '0')}` as StateId, screen: screen as ScreenId, label })));
export function labelForState(id: string): string { return STATES.find(state => state.id === id)?.label ?? id; }
