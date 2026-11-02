# Konta i role — etap 3

Data: 2026-11-01, wznowiono 2026-11-02 („kontynuuj prace”). Zgoda: „DALEJ” po raporcie etapu 2. Status: w toku.
Zakres: notatki ekranów, uczciwość symulacji, dokumentacja, testy nawigacji,
wszystkie kontrolki, klawiatura, 320/1440 × jasny/ciemny, pełny przegląd komentarzy.

- [x] Odczytać postęp, README, stan repo i kontrakt przeglądu; potwierdzić HTTP 200.
- [x] Notatki przy każdym ekranie (SCREEN_NOTES: historie, symulacja, poza rozstrzygnięciem) — zgodne z mapą.
- [x] Testy nawigacji: `navigation.test.mts` (9 ekranów × gość + 5 kont, cookies, s11, linki produktu) — 4/4 PASS.
- [x] `tsconfig` obejmuje też `*.mts`; lokalny `jsdom.d.ts` (bez nowych zależności).
- [x] Audyt: `settle()` przed axe (Radix/przekierowania), pomija nieskończony puls Skeleton; fokus Select czeka na animację.
- [ ] README: sekcja scenariuszy i sprawdzenia dla etapu 3.
- [ ] Sprawdzić wszystkie stany w czterech kombinacjach szerokości/motywu.
- [ ] Wykonać nawigację produktu i każdą kontrolkę scenariuszy; klawiaturę i focus.
- [ ] Sprawdzić operacje komentarzy, eksporty, trwałość i izolację.
- [ ] Poprawić wykryte defekty, uruchomić stosowne testy i bramkę.
- [ ] Zapisać dowody, końcowy raport, ograniczenia, luki DS i pytania; zatrzymać się.

Źródła produktu i DS pozostają bez zmian. Kod wyłącznie w prototypes/konta-i-role/;
build w ignorowanym public Storybooka. Podgląd z poprzednich etapów na porcie 3000.

## Needs from you

Brak podczas weryfikacji. Akceptacja gotowego prototypu jest odrębna od wyników testów.
