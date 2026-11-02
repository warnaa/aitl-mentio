# Mentio — konta i role

Klikalny prototyp Epiku 01 (konta i role) po etapie 3. Ścieżki sukcesu, 48 stanów mapy,
konta demo, bramki dostępu i scenariusze działają; każdy ekran ma notatkę z historiami,
symulacją i tym, czego prototyp nie rozstrzyga. To materiał do przeglądu, nie kod produkcyjny.
[POSTEP.md](POSTEP.md) jest punktem wznowienia; [STANY.md](STANY.md) łączy stany z dowodami.

## Uruchomienie

Z katalogu głównego repozytorium, z istniejącym `node_modules`:

```bash
node_modules/.bin/vite build --config prototypes/konta-i-role/vite.config.ts
npm run storybook -- --port 3000 --exact-port --host 0.0.0.0 --no-open --ci
```

W podglądzie sandboxa na porcie 3000 otwórz **`/prototypes/konta-i-role/index.html`**.
Root portu pokazuje Storybook. Wynik budowania trafia do
`packages/ui/.storybook/public/prototypes/konta-i-role/`, który jest ignorowany przez Git.
Nie commituj tego wyniku. Źródła nie są importowane przez aplikację.

Na czas tego etapu zatrzymano rozpoznany proces PM2 `workspace-preview`, który
automatycznie przywracał Next.js na porcie 3000, i uruchomiono Storybook w sesji narzędzia.
Nie zmieniono `openmercato.toml`. Po restarcie sandboxa jego konfiguracja nadal wskazuje
Next.js. Jeśli chcesz wrócić do aplikacji: zakończ tę instancję Storybooka i wykonaj
`pm2 restart workspace-preview`. Przed uruchomieniem czegokolwiek ustal właściciela portu;
`--exact-port` zapobiega przypadkowemu uruchomieniu podglądu na innym porcie.

## Jak kliknąć ścieżki sukcesu

- **Mentee:** „Załóż konto” → „Wstaw dane demo” w pasku przeglądu → „Załóż konto” → punkt powrotu.
- **Nowy mentor:** „Zostań mentorem” na s04 → rejestracja mentora → dane demo → początek s06.
- **Istniejący mentee:** zaloguj Adę → „Zostań mentorem” → potwierdź dołączenie → s06.
- **Istniejący mentor:** zaloguj Tomasza → s06, status „Szkic”.
- **Operator:** zaloguj Olgę → s07. Leon ma wszystkie role i startuje w s07;
  link „Panel mentora” prowadzi do s06 ze statusem „Opublikowana”.
- **Pomoc:** s01 → „Nie pamiętasz hasła?” → s12 → „Wróć do logowania”.

Pasek „Dane do logowania” wybiera dane do wstawienia do formularza.
Przycisk „Przełącz konto” w scenariuszach wybiera sesję tego konta. Sam wybór danych
w selektorze nie loguje; przełączenie sesji nie odnawia wcześniej unieważnionych sesji.
„Wstaw dane demo” na rejestracji zawsze daje fikcyjną nową osobę.
„Reset demo” kasuje wyłącznie stan produktu w pamięci, bez usuwania komentarzy.

## Konta demo

Wspólne jawne hasło symulacji: **`MentioDemo!`**. Nie wpisuj prawdziwego hasła.
Możesz ręcznie wypełnić formularz lub wybrać osobę i użyć „Wstaw dane demo”.

| Osoba | E-mail | Role |
|---|---|---|
| Ada Przykładowa | `ada@example.test` | mentee |
| Tomasz Modelowy | `tomasz@example.test` | mentee, mentor |
| Olga Testowa | `olga@example.test` | mentee, admin |
| Leon Fikcyjny | `leon@example.test` | mentee, mentor, admin |
| Nina Szkicowa | `nina@example.test` | mentee, mentor, bez strony |
| Konto archiwalne | `legacy@example.test` | mentee, bez hasła; odmowa logowania |
| Nowa osoba | `nowa@example.test` | rejestracja nowego konta |

Zegar produktu: **1 listopada 2026, 12:00, Europe/Warsaw** (`2026-11-01T11:00:00Z`).
Znaczniki czasu komentarzy są rzeczywistym czasem przeglądu; nie są zdarzeniami produktu.
Zastane sesje A/B mają termin `2026-11-02T10:00:00Z`; nowe logowanie lub rejestracja
przy stałym „teraz” daje pełne 24 godziny, do `2026-11-02T11:00:00Z`.
Dołączenie do mentorów i no-op nie przesuwają dotychczasowego terminu.

## Scenariusze

Rozwiń „Scenariusze · konta, sesje i błędy”. Wszystkie kontrolki są poza nawigacją produktu.

- **„Stan z mapy” → „Uruchom stan”** odtwarza fixtures i uruchamia rzeczywisty formularz
  albo akcję DS. To celowo resetuje produktowe dane demo, bez usuwania komentarzy.
  Stan przejściowy obserwujesz w „Ostatnich przejściach stanów”; nie ma osobnych ekranów sukcesu.
- **„Następne żądanie”** zmienia wynik następnej akcji. Brak sieci, 500 i konflikt nie
  resetują formularza. Utracona odpowiedź rejestracji tworzy jedno konto bez sesji;
  ponowienie daje 409 i zwykły link do logowania. Wynik jest zużywany raz.
- **„Wstrzymaj następne żądanie”** zatrzymuje akcję w pending. „Dokończ żądanie” zwalnia
  oczekiwanie. Duplikat submit jest blokowany; reset lub zmiana konta anuluje niedokończoną akcję.
  Wariant rejestracji jest nieaktywny w trakcie wysyłania.
- **A/B:** wyloguj A, wybierz B — dostęp pozostaje. Powrót do A nie jest nowym logowaniem.
  Przywrócenie dostępu wymaga zwykłego logowania formularzem.
- **Nadanie roli poza sesją** zmienia konto, ale stare sesje nadal mają poprzednie role.
  Zwykłe logowanie albo uprawnione dołączenie przyjmuje świeże role. Odebranie istniejącej
  roli mentor i reset operatora unieważniają obie sesje. Odebranie nieobecnej roli jest no-op.
- **Wygaśnięcie przed/po zapisie roli** różni się tym, czy mentor został już dopisany do konta.
  W obu wariantach wymagane jest logowanie; wcześniejsza operacja nie jest ponawiana automatycznie.
- **Cookie i infrastruktura:** wadliwe cookie nadal pokazuje publiczny przycisk wylogowania,
  lecz nie daje dostępu. Awaria sprawdzania dostępu daje s11 i nie udaje wylogowania.
  Publiczny s04 działa również podczas tej awarii. Retry s11 ponawia tylko odczyt.
- **Cel powrotu:** pusty → start według ról; odrzucony → `/`, także dla operatora;
  bezpieczny → cel z oddzielnym sprawdzeniem uprawnień. Kontekst przechodzi przez
  logowanie, rejestrację i instrukcję pomocy. Przy utracie sesji niewysłane dane są kasowane
  zgodnie z L07, a oba ustalone komunikaty są widoczne.
- **Odczyty paneli:** mentor ma brak strony, szkic, opublikowaną, loading i błąd;
  operator ma dane, zero, loading i błąd. Zero jest oddzielnym wynikiem odczytu demo,
  nie usuwa kont. Loading nie pokazuje pozornego zera i pozostawia nawigację.
- **Limity:** logowanie 5 prób / 15 min, rejestracja 3 / 60 min na adres.
  Sukces również zużywa próbę. „Wyzeruj limity demo” jest kontrolką testu; produkt nie ma
  takiej akcji, a zegar sam się nie przesuwa.

## Bramki dostępu

- **Gość na chronionym ekranie** (s03, s06, s07) trafia do logowania; adres tego ekranu staje się
  celem powrotu i po zalogowaniu jest sprawdzany ponownie.
- **Zalogowany bez wymaganej roli** widzi wspólną polską 404 (s08), identyczną z nieistniejącym
  adresem. Wyjaśnienie „Ta strona wymaga innej roli (mentor/admin)” pokazuje wyłącznie pasek
  przeglądu — produkt celowo go nie ujawnia (L09).
- **Awaria weryfikacji sesji** daje s11; publiczne s04, s08 i s12 nadal działają.

## Notatki przy ekranach

Pod każdą ramką produktu jest notatka przeglądu: numery historii (#24 Dm…, #14 / E01-S01),
co jest symulacją i czego prototyp nie rozstrzyga. Notatki są widoczne także w trybie
„Presentation”. Źródło: `SCREEN_NOTES` w `model.ts`.

## Komentarze i ekranowa mapa

`prototypeId` ma stałą wartość **`konta-i-role`**. Sekcje zachowują s01–s04, s06–s08,
s11–s12. s05/s09/s10 są wycofane i nie powstają. Dostarczony silnik JS jest niezmieniony.

„Comment” przechwytuje kliknięcie elementu, zamiast uruchamiać jego akcję. Dodaj uwagę,
potem wróć do „Clickable”. „Threads” otwiera panel; „Presentation” przełącza pojedynczy
ekran i mapę; „← Back” korzysta z historii silnika. Linki ekranu mają postać `#s01` itd.
Wybranie panelu z paska nie nadaje roli ani sesji.
Przycisk produktu „Wróć do poprzedniej strony” na 404 używa historii przeglądarki;
lokalny mostek zachowuje przejścia Back/Forward bez modyfikowania silnika JS.

Komentarze są lokalne dla przeglądarki i originu. Aby je przekazać, użyj
„Export for repository” (`comments.js`) albo „Export Markdown”. Nie ma współpracy na żywo.
Istniejących logów nie zastępuj pustym plikiem; zachowuj operacje i tombstones.

## Źródła i luki DS

Źródło zachowania: `lekcja-07/mapa-ekranow.md` i wybrana
`.ai/specs/2026-10-30-accounts-and-sign-in.md`; kontekst: product brief i discovery revision-001.
Wygląd: importowane komponenty `packages/ui/src` oraz `@mentio/ui/styles.css`;
porównanie logowania: story `product-platform-and-accounts-screens--sign-in-form`.
Pełna tabela ekran → komponent → historie znajduje się w POSTEP.md.

Lokalne oznaczenia `DS-GAP` obejmują 404 (DS01), awarię (DS02), przyszły PanelShell operatora
(DS04), polskie teksty zaszyte w CrudForm (DS05), instrukcję s12 oraz stałe ID PanelShell.
Transform budowania tłumaczy wyłącznie oczekiwane literały formularza i nadaje panelom
unikalne cele skip-linków. Nie edytuje źródeł DS. Regresyjny test kontroluje ten kontrakt.
Lokalne CSS ukrywa nieaktywny skip-link, ponieważ pozycjonowana `.frame` silnika inaczej
przesuwa go nad ekran produktu. Link pozostaje dostępny klawiaturą.

Kolory i geometria produktu pochodzą z DS. Dostarczony CSS silnika zachowano jako materiał
przeglądu; mostek przypisuje mu semantyczne kolory Mentio, a lokalne nadpisania używają tokenów.
Zachowano zatwierdzony systemowy font stack, także znany nietypowy wygląd cyfr na tym hoście.

## Ograniczenia symulacji

- Nie ma kont, bazy, cookies uwierzytelniania, JWT, hashowania ani rzeczywistych sesji.
  Formularze działają wyłącznie lokalnie; CSP blokuje połączenia i wysyłanie formularzy.
  Hasło demo pozostaje tylko w pamięci; nie jest wysyłane ani zapisywane w storage.
- Nie ma maili, OAuth, weryfikacji e-maila ani resetu hasła w aplikacji.
- Nie ma rezerwacji, płatności, cen, terminów ani publikacji strony mentora.
  Początek edytora jest wyraźnie nieaktywny. Kopiowanie fikcyjnego adresu korzysta z lokalnego schowka.
- Reguły sesji, ról, limitów, awarii i `returnTo` są lokalnym modelem interakcji,
  bez dowodu bezpieczeństwa rzeczywistego backendu. W rejestracji i przy logowaniu używaj
  tylko `MentioDemo!`; ograniczenie to należy do symulacji, nie do produkcyjnej polityki haseł.
- Reload resetuje produktowy stan demo; komentarze przeglądu pozostają.
- Nie rozstrzygamy bezpieczeństwa backendu, dostarczania wiadomości, wyścigów transakcji,
  polityki produkcyjnego wdrożenia ani brakujących projektów poza mapą.
- s08 i s11 to widoki w jednej stronie prototypu: serwer zawsze odpowiada HTTP 200.
  Prawdziwe kody 404/500 i odmowa roli należą do implementacji.
- Zegar demo stoi (1.11.2026, 12:00 Warszawa). Limity prób nie wygasają same;
  „Wyzeruj limity demo” to kontrolka przeglądu, nie funkcja produktu.
- Przy 320 px otwarty panel komentarzy zakrywa pasek przeglądu. Aby przełączyć
  Clickable/Comment, najpierw zamknij panel (Close lub Escape). To zachowanie dostarczonego silnika.
- Lokalna integracja przeglądu (`review-integration.ts`) uzupełnia silnik o obsługę klawiatury:
  nagłówki wątków są przyciskami (Enter/Spacja), Alt+Enter przypina uwagę do elementu z focusem,
  puste komentarze są zablokowane z podpowiedzią. Silnik JS pozostaje kopią 1:1.
- Font systemowy tego hosta renderuje cyfry i odstępy nietypowo (widać na zrzutach).
  To cecha środowiska podglądu, nie decyzja typograficzna; DS nie dostarcza własnego fontu.
- Komunikat konsoli o zablokowanym skrypcie inline (CSP `script-src 'self'`) przy otwieraniu przez
  zewnętrzny podgląd sandboxa nie pochodzi z prototypu: build i serwer na localhost nie zawierają
  skryptów inline. Prototyp działa mimo tego komunikatu; CSP celowo zostaje restrykcyjne.
- Audyt dostępności to axe (WCAG 2.1 A/AA) i testy klawiatury w Chromium.
  Nie testowano czytnikiem ekranu, innymi przeglądarkami ani na urządzeniu dotykowym.

## Sprawdzenie

Z katalogu głównego repozytorium:

```bash
node --test prototypes/konta-i-role/*.test.mts        # model, symulacja, nawigacja, integracja przeglądu
node_modules/.bin/tsc -p prototypes/konta-i-role      # także pliki testów (.mts)
node_modules/.bin/eslint prototypes/konta-i-role/
node prototypes/konta-i-role/verify-stage3.mjs matrix # 48 stanów × 320/1440 × jasny/ciemny, axe, przepełnienie
AB_SESSION=konta-role-stage3-controls node prototypes/konta-i-role/verify-stage3.mjs controls   # 4 warianty + opcje; `options` = same opcje scenariuszy
AB_SESSION=konta-role-stage3-comments node prototypes/konta-i-role/verify-stage3.mjs comments
```

Skrypty `verify-stage3.mjs` wymagają Storybooka na 3000 (sekcja „Uruchomienie”) i `agent-browser`.
Każdy tryb uruchamiaj we własnej sesji przeglądarki (`AB_SESSION`) i tylko raz naraz:
tryby nawigują po tej samej karcie. Test komentarzy dodaje do swojej sesji testowe wątki
z unikalnym znacznikiem przebiegu; nie dotyka przeglądarki recenzenta.
`navigation.test.mts` sprawdza każdy ekran dla gościa i pięciu kont, wadliwe cookie,
awarię weryfikacji i to, że każdy link produktu prowadzi do aktywnego ID z mapy.

Wyniki: `evidence/stage3/*-results.json`, zrzuty i eksporty komentarzy obok. Wcześniejsze
skrypty i dowody etapów 1–2 (`verify-stage1.py`, `verify-stage2*.py`, `evidence/`, `evidence/stage2/`)
zostają jako zapis historii. Raport i wyniki etapu 3: [POSTEP.md](POSTEP.md).

Design: prototypes/konta-i-role/index.html
Source: .ai/specs/2026-10-30-accounts-and-sign-in.md
Verification: etap 3 — patrz POSTEP.md
Acceptance: pending
Next: przegląd i akceptacja przez właściciela produktu
