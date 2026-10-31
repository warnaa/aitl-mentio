# Tokeny: Mentio

Data: 2026-10-31. Status: zatwierdzone przez użytkowniczkę w rozmowie. Wartości opracował agent na podstawie [przyjętych referencji](referencje.md); użytkowniczka zatwierdziła tabelę i obie listy przed zapisaniem. Nie zmieniła żadnej wartości między przedstawieniem propozycji a zatwierdzeniem.

Nie ma `packages/ui/src/tokens.css`. Źródłem istniejących tokenów jest [packages/ui/src/styles/globals.css](../packages/ui/src/styles/globals.css), który definiuje jasny i ciemny motyw. Fonty, jednostka odstępów i domyślny czas przejścia pochodzą z importowanego [motywu Tailwinda](../node_modules/tailwindcss/theme.css).

Zachowujemy istniejące nazwy znaczeniowe shadcn. Konkretne kolory, odstępy i czas były propozycjami agenta: referencje zatwierdzały kierunek, ale nie liczby. Zatwierdzenie obejmuje teraz wartości poniżej. Nie wybrano nowego koloru marki: główne działanie wyróżnia się ciepłym, ciemnym wypełnieniem w jasnym motywie i jasnym w ciemnym.

Oznaczenia: **J** — motyw jasny, **C** — ciemny. `T01` oznacza zatwierdzoną propozycję techniczną: zachowanie istniejącej roli błędu i poprawę kontrastu zgodnie z wymaganiem użytkowniczki. Identyfikatory R, U i A odnoszą się do pliku referencji. „Nowy” i „istniejący” opisują stan względem kodu w momencie opracowania; ten dokument nie wdraża zmian CSS ani komponentów.

## Tabela tokenów

| Token | Warstwa | Wartość | Pochodzenie | Gdzie używać | Gdzie nie używać |
|---|---|---|---|---|---|
| `--raw-neutral-50` | surowa, nowy | `#FAFAF9` | Propozycja palety dla R01.4, zatwierdzona | Wyłącznie definicje tokenów | Bezpośrednio w komponentach |
| `--raw-neutral-100` | surowa, nowy | `#F5F5F4` | R01.4, zatwierdzona propozycja | Wyłącznie definicje tokenów | W komponentach |
| `--raw-neutral-200` | surowa, nowy | `#E7E5E4` | R01.4, zatwierdzona propozycja | Wyłącznie definicje tokenów | W komponentach |
| `--raw-neutral-400` | surowa, nowy | `#A8A29E` | R01.4, zatwierdzona propozycja | Wyłącznie definicje tokenów | W komponentach |
| `--raw-neutral-500` | surowa, nowy | `#78716C` | R01.3–R01.4, zatwierdzona propozycja | Wyłącznie definicje tokenów | W komponentach |
| `--raw-neutral-600` | surowa, nowy | `#57534E` | R01.4, zatwierdzona propozycja | Wyłącznie definicje tokenów | W komponentach |
| `--raw-neutral-800` | surowa, nowy | `#292524` | R01.4, zatwierdzona propozycja | Wyłącznie definicje tokenów | W komponentach |
| `--raw-neutral-900` | surowa, nowy | `#1C1917` | R01.4, zatwierdzona propozycja | Wyłącznie definicje tokenów | W komponentach |
| `--raw-neutral-950` | surowa, nowy | `#0C0A09` | R01.4, zatwierdzona propozycja | Wyłącznie definicje tokenów | W komponentach |
| `--raw-red-700` | surowa, nowy | `#B91C1C` | T01, zatwierdzona propozycja | Wyłącznie definicje tokenów błędu | Jako kolor marki |
| `--raw-red-300` | surowa, nowy | `#FCA5A5` | T01, zatwierdzona propozycja | Wyłącznie definicje tokenów błędu | Jako kolor marki |
| `--spacing` | surowa, istniejący | `0.25rem`; skala × `1, 2, 3, 4, 6, 8, 12` | Istniejący Tailwind; R01.1, R02.1 | Definicje odstępów: `4, 8, 12, 16, 24, 32, 48px` przy bazie `16px` | Bezpośrednio w nowych wzorcach zamiast tokenu relacji |
| `--font-sans` | surowa, istniejący | Obecny systemowy stos Tailwinda, bez zmian | Zachowanie istniejącego fontu | Definicja fontu tekstu | Do oznaczania kodu |
| `--font-mono` | surowa, istniejący | Obecny stos: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace` | R01.2; istniejący Tailwind | Definicja fontu kodu | Bezpośrednio w nowych komponentach |
| `--raw-line-1` | surowa, nowy | `1px` | R01.3, zatwierdzona propozycja grubości | Definicja separatora | Jako odstęp |
| `--raw-duration-150` | surowa, nowy | `150ms` | U02.1; obecny czas Tailwinda | Definicja czasu informacji zwrotnej | Bezpośrednio w komponentach |
| `--ease-in-out` | surowa, istniejący | `cubic-bezier(0.4, 0, 0.2, 1)` | U02.1; istniejący Tailwind | Definicja przebiegu przejścia | Jako uzasadnienie dodania animacji |
| `--background` | znaczeniowa, istniejący | J: neutral-50; C: neutral-950 | R01.4, A01.1 | Tło strony i pola tekstowego | Wypełnienie głównego przycisku |
| `--foreground` | znaczeniowa, istniejący | J: neutral-900; C: neutral-50 | R01.1, R01.4 | Podstawowy tekst na powierzchniach neutralnych | Tekst na `primary` |
| `--card` | znaczeniowa, istniejący | J: neutral-100; C: neutral-900 | R01.4, A01.2 | Nieprzezroczyste powierzchnie paneli | Szklane, przezroczyste karty |
| `--card-foreground` | znaczeniowa, istniejący | `var(--foreground)` | R01.1, R01.4 | Tekst panelu | Tekst na głównym działaniu |
| `--popover` | znaczeniowa, istniejący | `var(--card)` | R01.4, A01.2 | Nieprzezroczyste menu i popovery | Powiadomienie dublujące zmianę |
| `--popover-foreground` | znaczeniowa, istniejący | `var(--foreground)` | R01.1 | Tekst menu i popoverów | Metadane zamiast `muted-foreground` |
| `--muted` | znaczeniowa, istniejący | J: neutral-200; C: neutral-800 | R01.4, R02.3 | Pomocnicza powierzchnia, zaznaczony wiersz | Kolor tekstu |
| `--muted-foreground` | znaczeniowa, istniejący | J: neutral-600; C: neutral-400 | R01.1, R02.3 | Czas wiadomości, opis pomocniczy, placeholder | Najważniejsza treść lub jedyny sygnał błędu |
| `--primary` | znaczeniowa, istniejący | J: neutral-800; C: neutral-200 | R01.5 | Wypełnienie głównego działania; istniejące linki | Każde działanie na ekranie |
| `--primary-foreground` | znaczeniowa, istniejący | J: neutral-50; C: neutral-950 | R01.5 | Tekst i ikona na `primary` | Tekst na powierzchniach neutralnych |
| `--secondary` | znaczeniowa, istniejący | `var(--muted)` | R01.5 | Wypełnienie działania pomocniczego | Wyróżnienie głównej czynności |
| `--secondary-foreground` | znaczeniowa, istniejący | `var(--foreground)` | R01.5 | Tekst działania pomocniczego | Tekst na `primary` |
| `--accent` | znaczeniowa, istniejący | `var(--muted)` | R01.5, U02.1 | Tło wskazywanego elementu menu lub pomocniczego działania | Nowy kolor marki |
| `--accent-foreground` | znaczeniowa, istniejący | `var(--foreground)` | R01.1, U02.1 | Tekst na `accent` | Tekst na `primary` |
| `--border` | znaczeniowa, istniejący | J i C: neutral-500 | R01.3, R01.4 | Separatory i granice powierzchni | Tekst pomocniczy |
| `--input` | znaczeniowa, istniejący | `var(--border)` | R01.1; wymaganie kontrastu | Obramowanie pola | Przezroczyste tło pola |
| `--ring` | znaczeniowa, istniejący | J: neutral-600; C: neutral-400 | R01.1, U02.1; wymaganie kontrastu | Pełny kolor fokusu na neutralnym otoczeniu | `ring/50` jako jedyny wskaźnik fokusu |
| `--destructive` | znaczeniowa, istniejący | J: red-700; C: red-300 | T01 | Tekst błędu, działanie destrukcyjne | Zwykłe główne działanie |
| `--destructive-foreground` | znaczeniowa, nowy | J: neutral-50; C: neutral-950 | T01; brak istniejącej nazwy tej roli | Tekst na wypełnieniu `destructive` | Zwykły tekst błędu na tle strony |
| `--space-within-group` | znaczeniowa, nowy | `2 × --spacing` = `0.5rem` | R01.1, R02.3 | Elementy jednej grupy, np. autor i czas | Oddzielanie sekcji |
| `--space-between-groups` | znaczeniowa, nowy | `4 × --spacing` = `1rem` | R01.1, R02.1 | Oddzielne grupy informacji | Odstęp wewnątrz jednej etykiety |
| `--space-panel` | znaczeniowa, nowy | `6 × --spacing` = `1.5rem` | R01.1, R02.1; obecne `Card` | Wewnętrzny odstęp panelu | Padding każdej komórki gęstej tabeli |
| `--space-section` | znaczeniowa, nowy | `8 × --spacing` = `2rem` | R01.1, R02.1 | Odstęp między sekcjami | Odstęp między wiadomościami jednej grupy |
| `--default-font-family` | znaczeniowa, istniejący | `var(--font-sans)` | R01.1; zachowanie obecnej typografii | Zwykły tekst interfejsu | Kod i nazwy plików |
| `--font-code` | znaczeniowa, nowy | `var(--font-mono)` | R01.2 | Kod i nazwy plików | Cała rozmowa i nawigacja |
| `--divider-width` | znaczeniowa, nowy | `var(--raw-line-1)` | R01.3 | Cienki separator wierszy | Grubość wskaźnika fokusu |
| `--default-transition-duration` | znaczeniowa, istniejący | `var(--raw-duration-150)` | U02.1, R02.4 | Krótka informacja zwrotna przy zmienionym elemencie | Animacja ciągła lub opóźnianie wyniku |
| `--default-transition-timing-function` | znaczeniowa, istniejący | `var(--ease-in-out)` | U02.1 | Przebieg tych krótkich przejść | Samodzielny powód dodania ruchu |
| `--sidebar` | komponentowa, istniejący alias | `var(--card)` | R02.6, R01.4 | Powierzchnia nawigacji pomocniczej | Tło rozmowy |
| `--sidebar-foreground` | komponentowa, istniejący alias | `var(--foreground)` | R02.6 | Tekst tej nawigacji | Metadane wiadomości |
| `--sidebar-primary` | komponentowa, istniejący alias | `var(--primary)` | R02.6, R01.5 | Główne działanie, jeśli występuje w nawigacji | Wszystkie pozycje menu |
| `--sidebar-primary-foreground` | komponentowa, istniejący alias | `var(--primary-foreground)` | R02.6, R01.5 | Tekst na `sidebar-primary` | Zwykłe pozycje menu |
| `--sidebar-accent` | komponentowa, istniejący alias | `var(--accent)` | R02.6, U02.1 | Wskazanie pozycji nawigacji | Dekoracja rozmowy |
| `--sidebar-accent-foreground` | komponentowa, istniejący alias | `var(--accent-foreground)` | R02.6 | Tekst na wskazanej pozycji | Tekst na głównym działaniu |
| `--sidebar-border` | komponentowa, istniejący alias | `var(--border)` | R02.6, R01.3 | Granica nawigacji | Tekst |
| `--sidebar-ring` | komponentowa, istniejący alias | `var(--ring)` | R02.6, U02.1 | Fokus w nawigacji | Przygaszony, jedyny sygnał fokusu |

Wartości zapisane jako `neutral-…` i `red-…` oznaczają odwołania do odpowiednich tokenów surowych, nie bezpośrednie wartości w komponentach. Nie dodajemy nowych tokenów komponentowych: istniejące `sidebar-*` zachowują zgodność, a przyciski, tabele i wiadomości korzystają ze znaczeń wspólnych. Promienie, cienie i rozmiary tekstu pozostają obecne — referencje nie uzasadniają ich zmiany. Tokeny wykresów pozostają poza tym zakresem.

## Lista par kolorów i kontrastów

Wyniki policzono ze względnej luminancji sRGB, z uwzględnieniem mieszania przezroczystych kolorów z tłem. Próg oceniono przed zaokrągleniem: **4,5 : 1 dla tekstu**, **3 : 1 dla istotnych elementów interfejsu**. Odpowiada to wymaganiom użytkowniczki i [WCAG dla tekstu](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) oraz [elementów nietekstowych](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

Poniższe trójki wyników dotyczą kolejno teł **`background` / `card` / `muted`**. `popover`, `secondary`, `accent` i powierzchnie nawigacji korzystają z tych samych wartości. Wyniki podano jako stosunek do 1.

- `foreground` na tych tłach: **J: 16,75 / 16,03 / 13,93**, **C: 18,91 / 16,75 / 14,52** — tekst przechodzi.
- `muted-foreground` na tych tłach: **J: 7,30 / 6,99 / 6,08**, **C: 7,83 / 6,93 / 6,02** — metadane i placeholdery przechodzą.
- `primary` jako tekst linku na tych tłach: **J: 14,52 / 13,91 / 12,08**, **C: 15,74 / 13,93 / 12,08** — przechodzi.
- `destructive` jako tekst błędu na tych tłach: **J: 6,20 / 5,93 / 5,15**, **C: 10,41 / 9,21 / 7,99** — przechodzi.
- `primary-foreground` na `primary`: **J: 14,52**, **C: 15,74** — tekst przycisku przechodzi.
- `destructive-foreground` na pełnym `destructive`: **J: 6,20**, **C: 10,41** — tekst przechodzi.
- `border` i `input` względem trzech teł: **J: 4,59 / 4,40 / 3,82**, **C: 4,12 / 3,65 / 3,16** — przechodzą próg dla interfejsu; nie są kolorami tekstu.
- Pełny `ring` względem trzech teł: **J: 7,30 / 6,99 / 6,08**, **C: 7,83 / 6,93 / 6,02** — przechodzi. Zatwierdzono odsunięcie obwódki od wypełnienia przycisku tak, by sąsiadowała ze sprawdzonym neutralnym tłem.
- Obecny hover `primary/90`, na trzech tłach: kontrast etykiety **J: 10,72 / 10,81 / 11,06**, **C: 12,74 / 12,93 / 13,09**; kontrast wypełnienia do otoczenia **J: 10,72 / 10,34 / 9,20**, **C: 12,74 / 11,45 / 10,05** — przechodzi.
- Hover `destructive/90`, z zatwierdzoną etykietą: **J: 5,39 / 5,42 / 5,51**, **C: 8,53 / 8,68 / 8,80**; wypełnienie do otoczenia **J: 5,39 / 5,19 / 4,59**, **C: 8,53 / 7,68 / 6,76** — przechodzi.
- Pozostałe istniejące mieszanki neutralnych teł (`muted/50`, `secondary/80`, `accent/50`, `muted/40`) mieszczą się między sprawdzonymi powierzchniami. Najniższy kontrast podstawowego tekstu: **J: 13,93**, **C: 14,52**; pomocniczego: **J: 6,08**, **C: 6,02**.
- Istniejące tło komunikatu błędu `destructive/5`, nakładane na trzy tła: tytuł błędu **J: 5,70 / 5,47 / 4,76**, **C: 9,78 / 8,43 / 7,24**; tekst pomocniczy **J: 6,73 / 6,44 / 5,62**, **C: 7,36 / 6,34 / 5,45** — przechodzi. Czerwone podbarwienie traktujemy jako dekorację, a informację przekazują również tekst i jego rola.

Problemy dotychczasowych wartości CSS i zatwierdzone poprawki (dotychczasowe oznaczają stan źródła w dniu opracowania, przed wdrożeniem tej dokumentacji):

- **Poniżej progu tekstu:** dotychczasowy `muted-foreground` na `muted` w jasnym motywie ma **4,34 : 1**. Poprawka w tabeli daje **6,08 : 1**.
- **Poniżej progu interfejsu:** dotychczasowy jasny `border`/`input` na `background` ma **1,26 : 1**. Poprawka daje **4,59 : 1**.
- **Poniżej progu interfejsu:** dotychczasowe ciemne obramowania z bieli o kryciu 10–15% mają na tle strony i karty około **1,25–1,57 : 1**. Zatwierdzono pełny `border`/`input`.
- **Poniżej progu interfejsu:** dotychczasowy jasny `ring` na tle strony ma **2,59 : 1**, a `ring/50` około **1,55 : 1**. Zatwierdzono pełny kolor z tabeli. Samej zmiany wartości tokenu nie należy uznawać za poprawkę, jeśli komponent nadal osłabia go przezroczystością.
- **Poniżej progu tekstu:** dotychczasowy jasny `destructive` na `muted` ma **4,37 : 1**. Poprawka daje **5,15 : 1**.
- Biały tekst na pełnym dotychczasowym ciemnym `destructive` miałby **2,89 : 1**. Dotychczasowy komponent przyciemnia wypełnienie przez `/60`, więc tego wyniku nie traktujemy jako dowodu błędu obecnego przycisku. Zatwierdzona para to pełny kolor oraz `destructive-foreground`, dające **10,41 : 1**.

Wyniki dotyczą wskazanych par i stanów. Nie obejmują dowolnego nakładania kolorów ani nie są audytem wyrenderowanych ekranów. Jeżeli użytkowniczka zmieni wartość koloru, przed zapisaniem zmienionej wersji trzeba ponownie obliczyć kontrasty i pokazać pary, które spadły poniżej progu.

## Lista decyzji, które nie są tokenami

- **R01.1, R02.1 — zasada kompozycji:** gęste listy; w sesji główny obszar zajmuje rozmowa. Tokeny odstępów wspierają tę decyzję, ale nie zastępują projektu układu.
- **R01.2 — zasada typografii:** kod i nazwy plików używają `font-code`, pozostały tekst zwykłego fontu.
- **R01.3 — cecha listy:** cienki separator rozdziela sąsiednie wiersze.
- **R01.5 — zasada hierarchii:** najważniejsza czynność ma wypełniony przycisk; pozostałe są słabsze wizualnie. Sam `primary` nie wybiera głównej czynności.
- **R02.2 — cecha rozmowy:** można odpowiedzieć na konkretną wiadomość; odpowiedź zachowuje powiązanie ze źródłem. Sposób prezentacji wątku nadal wymaga projektu.
- **R02.3 — cecha wiadomości:** widoczny autor i czas.
- **R02.4 — zasada informacji zwrotnej:** zmiana oznaczona przy właściwym elemencie, bez wyskakującego komunikatu powtarzającego tę informację.
- **R02.5 — zasada treści:** interfejs nie dodaje dekoracyjnych emoji; emoji rozmówców pozostają treścią wiadomości.
- **R02.6 — zasada nawigacji:** nawigacja pomocnicza oddzielona od rozmowy, ograniczona do bieżącego zadania.
- **U01.1 — zasada języka:** druga osoba liczby pojedynczej, serdecznie, jak do kolegi.
- **U02.1 — zasada ruchu:** animacja pomaga rozpoznać zmianę i jej lokalizację. Zatwierdzone doprecyzowanie: przejścia koloru lub obramowania zamiast dekoracyjnego przesuwania i skalowania; wynik działania nie czeka na zakończenie animacji.
- **A01.1–A01.3 — zasady wyglądu:** jednolite tła, nieprzezroczyste powierzchnie, brak dekoracyjnych iskierek.
- **A02.1–A02.3 — granice komponentów:** bez modułów lekcji, procentu ukończenia nauki i certyfikatów. Nie wyklucza to wskaźnika kroków rezerwacji.
- **A03.1–A03.3 — granice komponentów:** bez gwiazdek, średnich ocen i sortowania według ratingu; eksponujemy publiczne realizacje mentora.
- **Zatwierdzona propozycja techniczna dla kontrastu:** pola mają neutralne tło zamiast `dark:bg-input/30`; fokus korzysta z pełnego `ring`; przyciski destrukcyjne z jawnej pary tła i tekstu. Tych warunków nie da się zapewnić samą tabelą tokenów.
