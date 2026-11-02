# Konta i role — etap 0 prototypu

Data: 2026-11-01. Wynik: **etap 0 zakończony; cały prototyp jeszcze niepowstały**.

## Zlecenie

Przygotować klikalny prototyp z zatwierdzonej mapy `lekcja-07/mapa-ekranow.md`,
z rzeczywistych komponentów Mentio, osobno od aplikacji. Pracować etapami 0–3,
po każdym zdać raport i poczekać na „dalej”. Bieżąca zgoda obejmuje wyłącznie plan.

## Lista zadań

- [x] Przeczytać mapę, najnowszą znalezioną rewizję discovery, brief i wybrać specyfikację kont.
- [x] Sprawdzić komponenty, tokeny, Storybook, silnik komentarzy i lokalne instrukcje.
- [x] Zaplanować runtime, kolejność, kontrolki, konta, luki i walidację.
- [x] Zapisać plan w `prototypes/konta-i-role/POSTEP.md` i zweryfikować dokumentację.
- [ ] Otrzymać „dalej” przed rozpoczęciem etapu 1.
- [ ] Etapy 1–3, każdy z osobnym raportem i zatrzymaniem.

## Ustalenia i zmienione pliki

Wybrano `.ai/specs/2026-10-30-accounts-and-sign-in.md`, bo wskazany plik z 4 września
nie istnieje w lokalnym `.ai/specs/`. Najnowszy znaleziony discovery to revision-001:
ma rejestrację mentora, bez działającego logowania i bez bramki zaproszeń. Plan zachowuje
9 aktywnych ekranów i 48 pozycji stanów mapy, bez s05/s09/s10.

Zaplanowano React/TypeScript/Vite/Tailwind z istniejących zależności i rzeczywistych
eksportów `@mentio/ui`. Źródła w `prototypes/konta-i-role/`, wynik w ignorowanym
`packages/ui/.storybook/public/prototypes/konta-i-role/` do obsługi przez Storybook na 3000.
Plan zawiera konto/rola/scenariusz, powiązanie ekranów z komponentami i luki, w tym
zaszyte angielskie teksty CrudForm oraz stały `panel-main` w PanelShell.

Dodano tylko:
- `prototypes/konta-i-role/POSTEP.md` — pełny plan i warunki wznowienia.
- niniejszy log.

Nie zmieniono specyfikacji, kodu aplikacji, DS, konfiguracji, lockfile ani discovery.
Nie zbudowano prototypu. Zastane zmiany użytkownika pozostały nienaruszone.

## Weryfikacja i ograniczenia

Sprawdzono lokalne źródła, API komponentów, konfigurację `staticDirs`, obecność
zależności i ignorowanie wyników. Sprawdzono dokumentację planu i diff.
GET na `localhost:3000/` dał HTTP 200 z HTML Next.js; docelowy Storybook jeszcze nie działa
na tym adresie. Nie zatrzymano żadnego procesu. Uruchomienie i diagnoza przełączenia
należą do etapu 1. Nie uruchamiano testów aplikacji ani przeglądarkowych, bo nie ma kodu UI.

## Needs from you

„dalej” do rozpoczęcia etapu 1, zgodnie z wyraźnym etapowaniem zadania.
