# Konta i role — etap 3

Data: 2026-11-01, wznowiono 2026-11-02 („kontynuuj prace”). Zgoda: „DALEJ” po raporcie etapu 2. Status: zakończony 2026-11-02; czeka na przegląd.
Zakres: notatki ekranów, uczciwość symulacji, dokumentacja, testy nawigacji,
wszystkie kontrolki, klawiatura, 320/1440 × jasny/ciemny, pełny przegląd komentarzy.

- [x] Odczytać postęp, README, stan repo i kontrakt przeglądu; potwierdzić HTTP 200.
- [x] Notatki przy każdym ekranie (SCREEN_NOTES: historie, symulacja, poza rozstrzygnięciem) — zgodne z mapą.
- [x] Testy nawigacji: `navigation.test.mts` (9 ekranów × gość + 5 kont, cookies, s11, linki produktu) — 4/4 PASS.
- [x] `tsconfig` obejmuje też `*.mts`; lokalny `jsdom.d.ts` (bez nowych zależności).
- [x] Audyt: `settle()` przed axe (Radix/przekierowania), pomija nieskończony puls Skeleton; fokus Select czeka na animację.
- [x] README: sekcja scenariuszy i sprawdzenia dla etapu 3.
- [x] Sprawdzić wszystkie stany w czterech kombinacjach szerokości/motywu.
- [x] Wykonać nawigację produktu i każdą kontrolkę scenariuszy; klawiaturę i focus.
- [x] Sprawdzić operacje komentarzy, eksporty, trwałość i izolację.
- [x] Poprawić wykryte defekty, uruchomić stosowne testy i bramkę.
- [x] Zapisać dowody, końcowy raport, ograniczenia, luki DS i pytania; zatrzymać się.

Źródła produktu i DS pozostają bez zmian. Kod wyłącznie w prototypes/konta-i-role/;
build w ignorowanym public Storybooka. Podgląd z poprzednich etapów na porcie 3000.

## Wynik

Testy lokalne 29/29; macierz 197/197; kontrolki 85/85 (40 w 4 wariantach + 45 opcji; wcześniejsze „109” liczyło 24 opcje podwójnie); komentarze 13/13; bramka repo PASS.
Naprawiono: przepełnienie paska przy 320 px, obsługę klawiatury listy wątków komentarzy.
Incydent: Storybook na 3000 przestał działać w trakcie (przyczyna nieustalona), przywrócony komendą z README.
Commity: `5c159f2` (etapy 0–2 + etap 3 w toku) i commit zamykający etap 3 na gałęzi `prototype/konta-i-role`.
Pełny raport: `prototypes/konta-i-role/POSTEP.md`.

## Needs from you

Przegląd prototypu. Pytania do specyfikacji: brak otwartych (5 kandydatów rozstrzyga spec, patrz POSTEP.md). Akceptacja jest odrębna od wyników testów.
