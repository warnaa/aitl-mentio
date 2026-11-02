# Konta i role — etap 2

Data: 2026-11-01. Zgoda: „dalej” po raporcie etapu 1. Wynik: etap 2 zakończony;
cały prototyp oczekuje na końcowy audyt etapu 3. Integracja aplikacji nadal niewykonana — startup error.
Zakres: 48 stanów mapy, konta demo, sesje i role, bramki, błędy i zachowanie danych.
Nie obejmuje końcowego audytu etapu 3 ani zmian aplikacji/DS.

- [x] Odczytać plan, mapę, źródła etapu 1 i instrukcje DS.
- [x] Niezależnie sprawdzić pułapki mapy w osobnym worktree `/tmp/konta-role-stage2-review` (agent read-only).
- [x] Dodać deterministyczny model sesji i scenariuszy z rejestrem 48 stanów.
- [x] Podłączyć kontrolki przeglądu i stany rzeczywistych komponentów DS.
- [x] Sprawdzić model i przejścia w przeglądarce, zachowanie danych i komentarzy.
- [x] Uaktualnić README/POSTEP, zachować dowody, zatrzymać się przed etapem 3.

Źródła: `lekcja-07/mapa-ekranow.md`, `.ai/specs/2026-10-30-accounts-and-sign-in.md`.
Źródła prototypu: `prototypes/konta-i-role/`; build w ignorowanym public Storybooka.

## Zmiany i dowody

Dodano `simulation.ts`, `states.ts`, `scenarios.ts`, `simulation.test.mts`, oba skrypty
`verify-stage2*.py`, STANY.md oraz dowody w `evidence/stage2/`. Uaktualniono main.tsx,
styles.css, lokalny tsconfig, README i POSTEP. Dopisano lekcję o deadline fixtures i
zamrożeniu wariantu wysłanego żądania. Aplikacja, DS, specyfikacje i konfiguracja podglądu bez zmian.

Wszystkie 48 ID osiągalne w prawdziwych akcjach lokalnych. 22 lokalne testy PASS,
95 checkpointów browser PASS (48 unikalnych ID, 30 sprawdzeń poza wyborem stanu i powtórzone wejścia).
Sprawdzono m.in. zatrzymane żądania i double-submit, zachowanie wartości po błędach,
L07, sesje A/B, role, reset, grant, oba rodzaje wygaśnięcia dołączenia, lost-response/409,
bezpieczne cele i odmowę roli, loading bez zera oraz zachowanie poprawnego pina komentarza.
Obejrzano zrzuty nowych stanów i wąski komunikat utraty sesji w obu motywach.

Niezależny statyczny przegląd wykrył dwa blokery; oba usunięto i dodano regresje:
świeże uwierzytelnienie ma pełne 24h od stałego teraz; już wysłana rejestracja zachowuje
wariant sprzed oczekiwania. Kontrolka wariantu jest blokowana podczas pending.

Vite/local lint/types oraz repo lint/types/coverage/build/audit PASS; 304 unit testy repo
z 100% każdej metryki. Integracja po buildzie ponownie zatrzymała się w Vite/Vitest
`code.charCodeAt is not a function`; testów integracyjnych nie uruchomiono. Brak środowiska
DB testów również pozostaje. Nie zmieniano infrastruktury aplikacji.

526 hashy wejściowych źródeł bez zmian. Silnik JS i comments.js bez zmian;
budowanie odświeżyło ignorowany next-env.d.ts. Wyniki pozostają w public/prototypes
ignorowanym przez Git. Podgląd Storybooka z etapu 1 jest nadal na 3000.

Pełny raport i instrukcja wznowienia: prototypes/konta-i-role/POSTEP.md.
Nie wykonano etapu 3 ani końcowej akceptacji. Nie ma nowych pytań do specyfikacji lub luk DS.

## Needs from you

Po zakończeniu etapu 2: „dalej” przed etapem 3.
