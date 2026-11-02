# Konta i role — plan i postęp prototypu

Data: 2026-11-01, etap 3: 2026-11-02. Wersja: 003. Etap: **3 zakończony; czeka na przegląd i „dalej”**.
Zgoda na etapy 1 i 2: kolejne „dalej” po ich poprzedzających raportach. Kod i build prototypu istnieją.
Akceptacja wyglądu: oczekuje na przegląd użytkownika. Integracja aplikacji niezweryfikowana — błąd startu runnera opisany niżej.

## Zakres i źródła

- Nadrzędna mapa: `lekcja-07/mapa-ekranow.md`, z zatwierdzonymi 2026-11-01 decyzjami L01–L12 i DS01–DS06.
- Wybrana specyfikacja kont: `.ai/specs/2026-10-30-accounts-and-sign-in.md`.
  W przeszukanym `.ai/specs/` nie ma wskazanej w zadaniu `2026-09-04-accounts-and-roles.md`.
- Kontekst biznesowy: `.ai/specs/product-brief.md`, decyzje D22/D23, pomocniczo E01
  `.ai/specs/2026-10-29-mentor-pages-and-discovery.md` i F2 w specyfikacji platformy.
- Najnowsza znaleziona rewizja szarego prototypu:
  `.ai/prototypes/discovery/mentor-onboarding/revision-001/` — przeczytane README i HTML.
  Nie znaleziono nowszej rewizji w tym katalogu odkrywania.
- Wygląd: `docs/design-system.md`, rzeczywiste komponenty i tokeny `packages/ui/src/`,
  kompozycje `packages/ui/storybook/product/accounts/`, `product/e01/`, dokument What is missing.
- Przegląd: `lekcja-07/silnik-przegladu/README.md`, `prototype.js`, `prototype.css`, `mostek.css`, `comments.js`.
- Zasady pracy: `AGENTS.md`, `.ai/lessons.md`, skill `om-ux-design` i jego referencje,
  konfiguracja `.ai/agentic.config.json`, provider `.ai/browsers/agent-browser.md`.

Mapa rozstrzyga rozbieżną numerację zadania: główna historia to **#24 / E01-S01-T01**;
#14 jest wyłącznie konsumentem kont w punkcie końcowym mentora, #18 kontekstem bezpiecznego powrotu.
Nie zmieniamy numerów historii ani specyfikacji. Istniejąca specyfikacja i zatwierdzona mapa
są podstawą pracy; ten plan dotyczy wyłącznie odrębnego prototypu.

**9 aktywnych powierzchni, 48 pozycji stanów:** s01 (11), s02 (12), s03 (7), s04 (7),
s06 (4), s07 (4), s08 (1), s11 (1), s12 (1). ID s05, s09, s10 pozostają wycofane;
nie pojawią się jako klikalne ekrany. Stany przejściowe będą odnotowane jako przejścia,
bez dopisywania ekranów sukcesu. Zachowamy również ID stanów `sNN.NN` w rejestrze pokrycia.

Ze szarego prototypu przejmujemy sens dołączenia do mentorów: fikcyjne dane,
brak wymaganego zaproszenia i zgody operatora, brak weryfikacji e-maila,
walidację rejestracji, zajęty adres, pending, retry i jawne granice symulacji.
**Nie ma tam działającego logowania ani osobnego kroku zaproszenia:** `signin-boundary`
jest tylko granicą. Pełne logowanie i dołączenie istniejącego konta wynikają z mapy/specyfikacji.
Nie przenosimy kreatora strony, cennika, terminów, publikacji ani szarego wyglądu.
Nie przenosimy również starej fikcyjnej stawki 150 zł; fixtures tej mapy mają pierwszeństwo.

## Technologia i sposób uruchomienia — plan

- Odrębny **React 19 + TypeScript + Vite 8 + Tailwind v4**, z już zainstalowanych zależności.
  Nie tworzymy pakietu workspace, nie instalujemy nowego frameworka, nie zmieniamy lockfile.
- Źródła, lokalna konfiguracja budowania, testy, dokumentacja i kopia silnika wyłącznie w
  `prototypes/konta-i-role/`. Aplikacja nie importuje prototypu. Importujemy rzeczywiste
  eksporty `@mentio/ui`; nie rysujemy ich odpowiedników w HTML.
- Lokalny plik CSS importuje `@mentio/ui/styles.css` i wskazuje źródła prototypu przez
  `@source`. Układy używają tylko istniejących klas, ról typografii i tokenów: m.in.
  `gap-within-group`, `gap-between-groups`, `p-panel`, `gap-section`,
  `--content-max-width`, `--prose-max-width`, semantycznych kolorów i geometrii focusu.
- Planowana komenda budowania z root: `node_modules/.bin/vite build --config prototypes/konta-i-role/vite.config.ts`.
- `base`: `/prototypes/konta-i-role/`; `outDir`:
  `packages/ui/.storybook/public/prototypes/konta-i-role/`.
  Budowanie nie czyści całego katalogu public ani wcześniejszych artefaktów (`emptyOutDir: false`).
- Podgląd użytkownika: **Storybook na porcie 3000**, URL
  **`/prototypes/konta-i-role/index.html`**. Komenda uruchomienia Storybooka z root:
  `npm run storybook -- --port 3000 --host 0.0.0.0 --no-open`.
  Przy proxy stosujemy dokładny dozwolony host sandboxa, bez wyłączenia kontroli hostów.
- Katalog wyniku jest już ignorowany przez zastany `.gitignore`:
  `/packages/ui/.storybook/public/prototypes/`. Nie commitujemy wyniku budowania.
  Nie zmieniono `.gitignore` w tej pracy.
- Obserwacja etapu 0: HTTP GET `localhost:3000/` zwrócił 200 i HTML **Next.js** (`/_next/`),
  nie Storybooka. Niczego nie zatrzymano ani nie uruchomiono. W etapie 1 trzeba ustalić
  właściciela procesu i sposób przełączenia podglądu; nie zabijać cudzego procesu w ciemno.
  Nie obiecujemy jeszcze działającego docelowego URL.
- Wyłącznie lokalny stan demo; bez API, ORM, cookies uwierzytelniania, wysyłki e-maila
  i dostawców zewnętrznych. Sekrety demo nie trafiają do URL, logów ani storage.
  Komentarze silnika są osobnym lokalnym zapisem przeglądu, nie sesją produktu.

## Kolejność budowy i komponenty dla każdego ekranu

Tabela określa kolejność budowy, nie zmienia ID ani ścieżek produktu.

| Kolejność | ID / ekran | Komponenty i kompozycja DS | Granica zakresu |
|---|---|---|---|
| 1 | s04 / publiczny punkt powrotu `/` | AccountNav, Link, ActionButton w slocie wylogowania, istniejąca typografia publiczna | Skromny punkt wejścia/wyjścia; bez projektu landing page |
| 2 | s01 / logowanie | AccountNav, AuthPanel, CrudForm (Input, Label, Button), Link; Alert przy informacji o utracie sesji | E-mail i hasło **demo**, natychmiastowe przekierowanie po sukcesie |
| 3 | s02 / rejestracja, także `?jako=mentor` | AccountNav, AuthPanel, ten sam CrudForm, Link | Jeden formularz w dwóch wariantach; bez selektora roli operatora |
| 4 | s03 / dołączenie do mentorów | AccountNav, AuthPanel, ActionButton, Link | Jedna akcja dodaje mentor do istniejącego mentee; bez aprobaty operatora |
| 5 | s06 / start mentora | PanelShell, MentorPageStatus, CrudForm, Link, Skeleton + LoadingMessage, ErrorMessage | Pierwsze wejście: status istniejącej strony albo początek formularza ze slugiem z imienia; bez zapisu/edycji/publikacji |
| 6 | s07 / start operatora | PanelShell, Card, Badge, Link, Skeleton + LoadingMessage, ErrorMessage; ActionButton wylogowania | Tylko informacje z mapy; bez listy kont i zarządzania rolami |
| 7 | s12 / instrukcja odzyskania dostępu | AccountNav, publiczna typografia i Link | Statyczna instrukcja prywatnego kontaktu; bez formularza resetu |
| 8 | s08 / wspólna 404 i odmowa roli | Istniejąca typografia publiczna, Link, Button | Identyczna treść dla braku strony i braku roli; bez danych chronionego widoku |
| 9 | s11 / błąd otwarcia strony | ErrorMessage, Button ponowienia odczytu, Link | Retry wyłącznie odczytu; nie ponawia mutacji |

Etap 1 najpierw dopracuje s01 jako reprezentatywną kompozycję na podstawie rzeczywistej
story accounts, potem połączy ścieżki sukcesu s04 → s01/s02 → s03 lub s06/s07 oraz s01 ↔ s12.
W etapie 2 dołączą pozostałe stany i bramki. s06/s07 prezentują przyszłe cele już dostępne
w symulacji; bez celu stosujemy regułę mapy L04: admin > mentor > `/`.
Bezpieczny `returnTo` ma pierwszeństwo, uprawnienia celu sprawdzamy osobno;
niebezpieczny cel zawsze daje `/`, również dla admina.

Każdy link ma rzeczywisty lokalny cel; każda akcja daje wynik. W s06 kontrolki dalszej
edycji, jeżeli wynikają z istniejącej kompozycji, otrzymają widoczne „Poza zakresem prototypu”
i przyczynę wyłączenia. Nie wprowadzamy zapisu szkicu jako nowej funkcji.

## Pasek przeglądu i silnik — plan integracji

- Stała tożsamość: **`prototypeId: konta-i-role`**, taka sama w `comments.js` i
  `html[data-prototype-id]`; start `s04`. Nowy prototyp ma własny log, nie kopiuje wątków discovery.
- Kopiujemy dostarczony `prototype.js` bez zmian. Po pierwszym renderze wszystkich stałych
  sekcji `section.screen#sNN` i `.doc-toolbar` wywołujemy `window.__PROTOTYPE_START__()`.
  Zachowujemy `.screen-meta`, `.frame`, `.notes > .note`, `.screen-nav` i zdarzenia silnika.
- Pasek zawiera „Prototyp”, nawigację/mapę ekranów, wybór ekranu/stanu, jasny/ciemny motyw
  (`html.dark`), kontrolki scenariuszy i przyciski silnika: Clickable/Comment,
  Presentation, hotspoty, wątki, piny i **← Back**. Produkt ma osobną nawigację.
- Mostek lokalny mapuje nazwy silnika na rzeczywiste tokeny DS: primary, foreground,
  muted, destructive, border, fonty, promienie i focus. Nie kopiujemy przykładowych
  zielonych/pomarańczowych fallbacków z mostka ani nowych palet/cieni.
  Ewentualne korekty stylu przeglądu są lokalne, tokenowe; silnik JS pozostaje niezmieniony.
- Mapę wybieramy z 9 aktywnych powierzchni. Selektor stanów pokazuje ich trwałe `sNN.NN`;
  dla przekierowań opisuje wejście i rezultat, zamiast zatrzymywać użytkownika na sztucznym ekranie.
- Role i `returnTo` są kontrolowane także przy bezpośrednim skoku z paska, URL i Back.
  Wybór ekranu nie nadaje uprawnień. Odmowa roli w produkcie pozostaje wspólną polską 404;
  wyjaśnienie „wymaga innej roli” widoczne jest wyłącznie w notatce przeglądu.
- Komentarze: tworzenie, odpowiedzi, rozwiązanie/cofnięcie rozwiązania, re-anchor, usuwanie,
  trwałość po reloadzie, Export for repository i Export Markdown. Eksport potrzebny do
  przekazania uwag; nie ma współpracy na żywo. Reset demo nie usuwa komentarzy.

## Kontrolki scenariuszy — pełny plan etapu 2

| Grupa | Kontrolki w pasku przeglądu | Sprawdzane zachowanie |
|---|---|---|
| P01, P12 | Konto/gość, cel: brak / `/admin` / `/mentor/strona` / dozwolony kontekst / niebezpieczny URL; bezpośredni ekran | Cel według ról i L04, ochrona celu po przekierowaniu; niebezpieczny cel nie opuszcza prototypu |
| P02 | Następne logowanie: poprawne / błędne dane; konto nieznane / legacy | Jednakowy ogólny komunikat 401 |
| P03 | Rejestracja zwykła / mentor, wypełnij danymi demo; walidacja przez wpisanie i submit | Imię 1–80, email ≤320, minimum 10 punktów Unicode / maksimum 72 bajty hasła; bez dodatkowej polityki |
| P04 | Zajęty adres / zapis z utraconą odpowiedzią; ponowienie | 409 przy polu, wskazówka zwykłego logowania; brak automatycznej sesji przy konflikcie |
| P05 | Limit logowania / rejestracji; reset scenariusza | 15 / 60 minut oczekiwania przy stałym zegarze; sukces nie zeruje budżetu |
| P06 | Wynik następnego żądania: sukces / brak sieci / 500; awaria weryfikacji sesji | Lokalne błędy zachowują dane; awaria sprawdzania dostępu → s11; s04 pozostaje dostępny |
| P07 | Dołączenie: sukces / błąd / już mentor / wygaśnięcie przed lub po zapisie roli | Idempotencja i brak wydłużenia sesji; po 401 powrót do logowania, bez automatycznej powtórki |
| P08 | Sesja ważna / wygasła / sfałszowana / legacy / samo nieaktualne cookie | Header zależy tylko od obecności cookie; chroniona trasa nie wpuszcza; 401 podczas pracy → s01.11 |
| P09 | Niezależna sesja A/B; błąd następnego wylogowania | Logout odbiera tylko bieżącą sesję, B zostaje; błąd pozwala ponowić |
| P10 | Symuluj odebranie roli / reset operatora / nadanie roli poza bieżącą sesją | Dwa pierwsze zdarzenia unieważniają wszystkie sesje; nadanie staje się widoczne przy właściwym odświeżeniu sesji/logowaniu |
| P11 | Mentor: brak strony / szkic / opublikowana / loading / błąd; operator: dane / zero / loading / błąd | Stany s06.01–04 i s07.01–04; loading nie pokazuje fikcyjnego zera |
| P16 | Przejdź do instrukcji / wróć do logowania (normalne linki, także z zachowanym bezpiecznym celem) | Brak formularza resetu i nowego kanału kontaktu |
| Pomocnicze | Opóźnienie żądania/pause pending, dokończ żądanie, reset wyłącznie demo | Pending osiągalny do przeglądu, blokada duplikatu; reset anuluje oczekujące działania i zachowuje komentarze |

P13–P15 są wycofane: **bez kontrolek OAuth, maila, płatności i pulpitu mentee**.
Przykład płatności z ogólnych zasad zadania nie dotyczy tej mapy.
Bezpieczny cel spoza dziewięciu powierzchni jest tylko opisanym przekazaniem poza zakres,
bez tworzenia ekranu rezerwacji czy otwierania rzeczywistej usługi.
Zwykłe błędy zachowują wpisane dane. Wyjątek zatwierdzony w L07: 401 podczas pracy
usuwa niewysłane dane, zachowuje bezpieczny cel i pokazuje oba ustalone komunikaty.

## Konta demo i stały zegar

Wyłącznie fikcyjne osoby z zatwierdzonej mapy, nie kontakty z badań:

| Nazwa | Adres | Role / scenariusz |
|---|---|---|
| Ada Przykładowa | `ada@example.test` | mentee |
| Tomasz Modelowy | `tomasz@example.test` | mentee, mentor; istniejąca strona |
| Olga Testowa | `olga@example.test` | mentee, admin; operator bez roli mentor |
| Leon Fikcyjny | `leon@example.test` | mentee, mentor, admin |
| Nina Szkicowa | `nina@example.test` | mentee, mentor; brak strony |
| Konto archiwalne | `legacy@example.test` | mentee, bez hasła; logowanie zawsze odrzucone |
| Nowa osoba | `nowa@example.test` | brak konta przed rejestracją; potem mentee albo mentee + mentor |

Gość nie jest dodatkowym kontem. Wybór konta w pasku symuluje sesję bez hasła.
Formularze wyraźnie mówią „symulacja” i „nie wpisuj prawdziwego hasła”; udostępnimy
wypełnienie wyłącznie jawnym tekstem demo, nie zapisujemy go poza pamięcią strony.
Nie sprawdzamy prawdziwych danych uwierzytelniania ani nie wysyłamy ich przez sieć.

Teraz: **`2026-11-01T11:00:00Z`**, czyli 1 listopada 2026, 12:00, Europe/Warsaw.
Sesja ważna: od `2026-11-01T10:00:00Z` do `2026-11-02T10:00:00Z`.
Sesja wygasła kończy się `2026-11-01T10:59:59Z`. Sesja B jest niezależna od A.
Blokada logowania do 12:15, rejestracji do 13:00 czasu Warszawy. Zegar sam nie płynie.

Liczba „Użytkownicy” w s07 będzie **wynikiem policzenia kont w fikcyjnym stanie demo**,
z jawną informacją o symulacji; nie marketingową statystyką. Przed rejestracją są
6 istniejących fixtures (w tym legacy), a „Nowa osoba” jeszcze nie jest kontem.
Scenariusz 0 to odrębny wynik odczytu pustego zbioru demo, nie rzeczywisty stan usługi.
Nie pokazujemy ocen, opinii, płatności, cen ani kalendarza w formularzach kont.

## Luki i ograniczenia DS — plan rozwiązań wyłącznie lokalnych

| Luka | Dowód i rozwiązanie w prototypie |
|---|---|
| DS01 | Brak pełnej strony 404. Prosta kompozycja z tokenów, typografii, Link i Button według L09; oznaczenie `DS-GAP: DS01` w kodzie i raporcie |
| DS02 | Brak error-boundary page. ErrorMessage, retry odczytu i Link według L12; `DS-GAP: DS02` |
| DS03 | Rozstrzygnięta bez nowego komponentu: PanelShell i zwykłe linki tylko do obszarów dostępnych roli; brak switchera ról |
| DS04 | Aktualna aplikacja admina ma inną ramę. W prototypie PanelShell zgodnie z 7B; `DS-GAP: DS04` dokumentuje proponowany przyszły wygląd, bez migracji aplikacji |
| DS05 | Brak polskiego połączonego przepływu; dodatkowo kod CrudForm zawiera literalne `Required`, `Optional`, `Saving…`, `Cancel`, bez propsów tłumaczeń. Polskie treści pól/walidacji przez istniejące propsy; dla zaszytych tekstów planujemy wąski lokalny transform Vite tylko w bundlu prototypu, z kontrolą oczekiwanych literałów i testem. Bez kopii formularza ani edycji źródła DS; `DS-GAP: DS05`. To prowizoryczne tłumaczenie nie jest nowym API DS |
| Instrukcja s12 | Brak gotowej kompozycji odzyskania dostępu. Istniejąca publiczna typografia i Link, dokładna treść L08; komentarz `DS-GAP: s12-composition`, bez nowego komponentu DS |
| PanelShell — wiele instancji | Kod ma stałe `id="panel-main"`; dwa panele w mapie mogą dublować ID. Adapter kompozycji prototypu musi zapewnić unikalny cel skip-linku dla s06/s07 bez zmiany DS; objąć kontrolą DOM i klawiatury. Nie udawać, że `useId` jest już tu stosowane |

DS06 nie dotyczy: OAuth i maile są wycofane. Nie dodajemy Switch, Avatar, Tabs, Toast,
kalendarza, nowych kolorów, odstępów ani wariantów. Motyw przełączamy istniejącym Button/Checkbox.
Każdy pomocniczy adapter będzie lokalnym detalem prototypu, nie nowym komponentem design systemu.
Jeśli te kompozycje okażą się niewystarczające, opisujemy konkretną lukę przed rozszerzaniem zakresu.

## Etapy i warunki zakończenia

- [x] **0 — Plan:** źródła, runtime, ekran–komponent, kontrolki, konta, luki;
  zapis w POSTEP.md. Raport dla użytkownika i pauza na „dalej”.
- [x] **1 — Szkielet i ścieżka sukcesu:** budowanie do public Storybooka,
  działający URL na 3000, rzeczywiste komponenty, oba motywy, pasek i niezmieniony silnik,
  mapa, prezentacja, Back, komentarze; połączone ścieżki sukcesu.
  Sprawdzenie budowania, przejść i reprezentatywnych ekranów w przeglądarce;
  raport, aktualizacja tego pliku i pauza na „dalej”.
- [x] **2 — Stany i role:** wszystkie 48 aktywnych pozycji z mapy, 13 aktywnych grup P01–P12/P16,
  konta, bramki, scenariusze błędów, zachowanie danych i wyjątek L07.
  Rejestr ekran/stan → wejście/kontrolka → oczekiwany wynik → wynik testu;
  raport, aktualizacja tego pliku i pauza na „dalej”.
- [x] **3 — Uczciwość i sprawdzenie:** przy każdym ekranie historie, symulacje i granice;
  README z uruchomieniem, kontami, scenariuszami i „Ograniczeniami symulacji”.
  Testy nawigacji i zabezpieczeń, wszystkie przyciski i kontrolki, reload i Back/Forward,
  320 i 1440 px × jasny/ciemny motyw, klawiatura i focus, brak niedostępnych części
  w tab order, poprawne etykiety. Zrzuty ekranu i rzeczywiste wyniki w lokalnych dowodach.
  Pełny test komentarzy z eksportami i trwałością, brak żądań do prawdziwych usług.
  Raport końcowy i pauza na „dalej”; bez automatycznego wdrożenia lub zmiany specyfikacji.

## Co sprawdzono w etapie 0

- Odczyt mapy i jej decyzji, źródeł kont, ograniczeń discovery, DS i instrukcji silnika.
- Zgodność inwentarza: 9 aktywnych ekranów, 48 pozycji; 3 historyczne ID bez implementacji.
- Obecność zależności React/Vite/Tailwind i eksportów wskazanych komponentów;
  `staticDirs: ['./public']` w Storybooku i reguła ignorowania wyników budowania.
- Rzeczywiste API AccountNav/AuthPanel/PanelShell/CrudForm/ActionButton, angielskie
  literały formularza i stały identyfikator PanelShell jako lokalne ograniczenia integracji.
- Odczyt HTTP na 3000: działa Next.js, nie potwierdzono jeszcze docelowego Storybooka.
- Zastane zmiany `.gitignore`, `eslint.config.mjs`, `.ai/prototypes/`, `lekcja-07/`
  i log mapy nie należą do tego etapu; pozostają nienaruszone.

Nie budowano prototypu, nie uruchamiano serwera ani testów UI/aplikacji.
Zmiana etapu 0 to dokumentacja; nie stanowi dowodu działania ekranów, zgodności wizualnej
ani zabezpieczeń backendu. Przegląd w przeglądarce i testy wykonamy w następnych etapach.

## Pytania i wznowienie

Nie ma nowych pytań produktowych blokujących plan. Zatwierdzonych luk mapy nie otwieramy ponownie.
Trasa s12 pozostaje roboczym `/pomoc-z-logowaniem`; reguła startów i PanelShell admina
są projektem przyszłego wyglądu z mapy, nie dowodem aktualizacji specyfikacji/aplikacji.
Kwestia uruchomienia na 3000: zidentyfikować konfigurację obecnego podglądu w etapie 1,
zachować ostrożność wobec istniejącego procesu.

**Etapy 0–3 są zakończone.** Nowa sesja: przeczytaj ten plik (sekcja „Wynik etapu 3”), README i STANY.md;
nie ponawiaj etapów. Dalsza praca tylko na podstawie uwag z przeglądu. Pozostawiamy komentarze i obecny prototyp pod tym samym originem i ID.

## Wynik etapu 1 — 2026-11-01

Zbudowano niezależny SPA w React/TypeScript/Vite/Tailwind, importujący prawdziwe
komponenty i tokeny DS. Źródła: `index.html`, `main.tsx`, `model.ts`, `styles.css`,
`ds-adapter.ts`, lokalne konfiguracje i `review/`. README zawiera odtwarzalne uruchomienie.
Wynik działa pod **`/prototypes/konta-i-role/index.html`** na Storybooku na **3000**.
HTTP 200 potwierdzono dla prototypu i rootu Storybooka. Build pozostaje ignorowany przez Git.

Połączone ścieżki: rejestracja mentee → s04, rejestracja mentora → s06 bez strony,
Ada → s03 → dołączenie → s06, Tomasz → s06 ze szkicem, Olga → s07,
Leon → s07 → s06 opublikowana. Działa wylogowanie i s01 ↔ s12.
Istnieją minimalne kompozycje s08/s11 oraz podstawowe bramki wejścia; scenariusze
pełnego wygaśnięcia, ról, returnTo i awarii pozostają w etapie 2.

Pasek zawiera wybór ekranu, mapę, jasny/ciemny motyw, badge „Prototyp”, dane demo,
reset i oryginalne narzędzia silnika: komentarze, prezentację, hotspoty, piny, wątki i Back.
`prototypeId` = `konta-i-role`; `review/prototype.js` jest identyczny z wejściem.
Konto z paska wybiera wyłącznie dane do formularza; przełączanie sesji jest do wykonania w etapie 2.

### Podgląd i jego przywrócenie

Next był nadzorowany przez PM2 `workspace-preview`; samo zakończenie dziecka uruchomiło go ponownie,
a pierwszy Storybook wybrał 3001. Zatrzymano dokładnie `workspace-preview`, zakończono własny
Storybook z 3001 i uruchomiono własny Storybook z `--port 3000 --exact-port`.
Sesja narzędzia serwera: `80578`. Nie zmieniono `openmercato.toml` ani źródeł aplikacji.
Po restarcie sandboxa konfiguracja nadal uruchomi Next; README opisuje powtórne uruchomienie
prototypu i przywrócenie aplikacji (`pm2 restart workspace-preview` po zatrzymaniu Storybooka).
Nie testowano zewnętrznego, uwierzytelnionego URL proxy sandboxa; sprawdzono lokalne serwowanie.

### Rzeczywista weryfikacja etapu 1

- Vite build: **PASS**, wynik we właściwym katalogu public; bez instalowania zależności.
- Lokalny TypeScript i ESLint: **PASS**.
- `node --test prototypes/konta-i-role/model.test.mts`: **4/4 PASS** — trwałe ID,
  starty według ról, slugi, transform rzeczywistych źródeł DS i jego odmowa przy zmianie kontraktu,
  identyczność silnika i osobna tożsamość komentarzy.
- `verify-stage1.py`: **28 checkpointów PASS**, provider agent-browser w osobnej sesji.
  Przejścia wymienione wyżej, pomoc i Back, unikalne ID, keyboard skip-link,
  prezentacja/mapa/hotspoty, dodanie komentarza na polu i jego przeżycie reloadu,
  obecność pina, kolejność Tab w formularzu, brak runtime errors.
- Obejrzano zrzuty logowania w obu motywach przy 320 i 1440 px; przy 320 brak poziomego
  przepełnienia dokumentu. Obejrzano start operatora i panel komentarzy. Porównano logowanie
  z rzeczywistą story DS `product-platform-and-accounts-screens--sign-in-form`.
- Bramka repo: `npm run lint`, `npm run typecheck`, `npm run test:coverage`,
  `npm run build`, `npm run audit`: **PASS**. Unit: **304 testy, 45 plików**, 100% każdej
  metryki coverage (zakres produkcyjny repo; nie deklaracja 100% pokrycia SPA prototypu).
- `npm run test:integration` po buildzie: **NIE PRZESZŁO — STARTUP ERROR**.
  Runner Vite/Vitest kończy się `TypeError: code.charCodeAt is not a function` w
  `extractInlineSourceMap`, dodatkowo wypisuje „No test files found”, mimo istniejących
  plików testów. Nie wykonano testów integracyjnych. Brak socketu Dockera i ustawionego
  `TEST_DATABASE_URL` również uniemożliwia obecnej konfiguracji przygotowanie testowej bazy.
  Nie zmieniano infrastruktury testowej aplikacji w tym zadaniu. Log: `evidence/repository-integration.log`.
- Hashe **526 plików wejściowych źródeł** są bez zmian. Bramka odświeżyła wyłącznie ignorowane
  wyniki `packages/app/next-env.d.ts` i `packages/app/tsconfig.tsbuildinfo`;
  nie są zmianą źródeł ani nowym kodem aplikacji. Dowód: `evidence/preservation.json`.
- `git diff --check`: PASS; zastane zmiany użytkownika pozostają.

Dowody przeglądarkowe: `evidence/stage1-browser-results.json`, zrzuty w tym samym katalogu.
Weryfikacja etapu 1 nie zastępuje końcowego audytu etapu 3: nie sprawdzono jeszcze każdej
kontrolki i wszystkich stanów/role combinations, pełnej obsługi historii przeglądarki,
wszystkich operacji komentarzy/eksportów ani całości WCAG. Nie potwierdzono bezpieczeństwa backendu.

### Luki i korekty wykonane w etapie 1

Zrealizowano lokalnie oznaczone kompozycje DS01, DS02, DS04, DS05 i s12. Wąski transform
budowania tłumaczy zaszyte teksty CrudForm i zmienia stałe ID PanelShell na `useId` wyłącznie
w bundlu prototypu. Nie zmieniono źródeł DS ani specyfikacji.

Przegląd wykrył, że `.frame { position: relative }` silnika powoduje wyświetlanie
przesuniętego skip-linku PanelShell nad paskiem przeglądu. Lokalny `clip-path` ukrywa go
do `:focus-visible`; regresyjnie sprawdzono Shift+Tab i Enter. Zapisano lekcję w `.ai/lessons.md`.
Zachowano zatwierdzony systemowy font stack; znany nietypowy wygląd cyfr nie jest nową decyzją.

Nie powstały nowe pytania produktowe. Do etapu 2 przechodzimy dopiero po „dalej”.

## Wynik etapu 2 — 2026-11-01

Zrealizowano **48 aktywnych stanów**, bez ponownego używania s05/s09/s10.
Rejestr i dowody dla każdego ID: [STANY.md](STANY.md), źródło rejestru `states.ts`.
`scenarios.ts` przygotowuje deterministyczne warunki, po czym prawdziwy CrudForm/ActionButton
wykonuje lokalną akcję. Stan przejściowy trafia do rejestru przejść zamiast nowego ekranu.

Model interakcji (`simulation.ts`) rozdziela konto i jego wersję, role w istniejących sesjach,
sesje A/B, obecność i poprawność cookie, awarię weryfikacji oraz odczyty paneli. Nie używa
API, ORM, prawdziwych tokenów ani storage produktu. `main.tsx` subskrybuje ten model i
składa istniejące komponenty DS; kod aplikacji oraz źródła DS pozostały bez zmian.

### Co działa

- Wszystkie stany s01/s02: walidacja, pending, 401, 409, limity 429, brak sieci i 500,
  sukces i przekierowania, wariant mentora, istniejąca sesja i utrata sesji.
- Utracona odpowiedź rejestracji zapisuje jedno konto, bez automatycznej sesji.
  Ponowienie daje 409 i zwykłe logowanie; hasło nie jest przechowywane w modelu.
- Zwykłe błędy zachowują wpisane dane. L07 jest osobnym wyjątkiem: po utracie sesji
  oba komunikaty są widoczne, niewysłane dane znikają, bezpieczny cel zostaje,
  a poprzednia mutacja nie jest automatycznie ponawiana.
- Mentee/mentor/admin/wszystkie role oraz Nina bez strony i konto legacy są osiągalne
  przez dane demo i kontrolkę „Przełącz konto”. Wybór A/B nie tworzy nowej sesji:
  zwykły logout unieważnia tylko bieżącą, reset i rzeczywiste odebranie roli obie.
  Nadanie roli poza sesją nie zmienia istniejących claims; login lub dołączenie pobiera świeże role.
- Dołączenie zachowuje ID i deadline sesji. Wygaśnięcie przed zapisem nie dodaje roli;
  po zapisie rola pozostaje, ale w obu przypadkach trzeba zalogować się ponownie.
- Brak celu daje admin > mentor > `/`. Niebezpieczny cel zawsze daje `/`, także adminowi.
  Bezpieczny cel jest sprawdzany ponownie przy użyciu i nie nadaje roli. Kontekst przechodzi
  przez s01 ↔ s02 oraz s01 ↔ s12. Cel spoza mapy kończy się oznaczonym przekazaniem w s04.
- Chroniona trasa bez sesji prowadzi do logowania, ważna sesja bez roli do wspólnej 404,
  awaria weryfikacji do s11. Publiczny nagłówek używa tylko obecności cookie;
  wadliwe cookie może pokazać wylogowanie obok formularza logowania.
- Start mentora ma brak strony/szkic/opublikowaną/loading/błąd. Operator ma dane/0/loading/błąd;
  loading nie pokazuje zera, nawigacja zostaje. 0 to odrębny wynik demo, nie usunięcie fixtures.
- Liczniki prób są stałe w czasie i uwzględniają sukces. Nie resetują się po wylogowaniu.
  Kontrolki awarii, odczytów, pauzy żądania, unieważnienia i limitów pozostają w pasku przeglądu.
- Przycisk 404 używa historii przeglądarki; mostek zachowuje przejścia Back/Forward,
  a oryginalny przycisk „Back” nadal korzysta z historii silnika.

### Faktyczna weryfikacja

- **22/22 lokalne testy PASS:** 4 wcześniejsze i 18 modelu/scenariuszy. Pokrywają m.in.
  rolę/wersję sesji, A/B, deadline, utraconą odpowiedź, normalizację maila, limity,
  anulowanie, mutację wariantu podczas pending oraz wszystkie recepty stanów.
- **95 checkpointów browser PASS** w izolowanej sesji agent-browser `konta-role-stage2`:
  78 w głównym przebiegu i 17 dodatkowych; potwierdzono **48 unikalnych ID** w rzeczywistym
  rejestrze przejść, a nie tylko w etykiecie selektora. Pozostałe wejścia to ponowienia
  stanów i 30 dodatkowych sprawdzeń zachowania. Dowody:
  `evidence/stage2/browser-results.json`, `extra-browser-results.json` i zrzuty obok.
- Sprawdzono zachowanie dokładnych wartości po offline/500, konflikt po utraconej odpowiedzi
  i zwykłe logowanie, czyszczenie po 401, brak pozornego zera w loading,
  role i bezpieczny cel, A/B po logout, grant bez zmiany starej sesji, oba warianty wygaśnięcia
  dołączenia, reset obu sesji, login legacy i konflikt po normalizacji maila.
- Pending w prawdziwym formularzu blokuje duplikat; wysłany wariant rejestracji jest zablokowany.
  Porównano istniejący pin komentarza z faktycznym polem e-mail po zmianie stanu/reloadzie;
  treść przetrwała i nie było osieroconego wątku. Źródłowego comments.js nie zmieniono.
- Obejrzano nowe zrzuty utraty sesji i loading operatora przy 1440 px oraz komunikat utraty
  sesji przy 320 px w obu motywach. W tej kontroli 320 px dokument nie przewijał się poziomo.
  Nie jest to końcowy sweep wszystkich stanów i kontrolek z etapu 3.
- Vite build, lokalny TypeScript i ESLint: **PASS**.
- Bramka repo lint/typecheck/test:coverage/build/audit: **PASS**, 304 unit testy i 100%
  czterech metryk coverage w zakresie produkcyjnych plików repo. Nie deklarujemy 100%
  pokrycia całego SPA prototypu na podstawie tej liczby.
- Integracja aplikacji po buildzie: **ponownie STARTUP ERROR**, `code.charCodeAt is not a function`
  w Vite/Vitest. Nie wykonano integracji. Nadal brak Docker socket i TEST_DATABASE_URL;
  infrastruktury aplikacji nie zmieniano. Log: `evidence/stage2/repository-integration.log`.
- Zachowano hashe **526 plików wejściowych źródeł**. Build odświeżył ignorowany
  `packages/app/next-env.d.ts`. Silnik JS i źródłowy plik komentarzy identyczne z wejściem;
  dowód `evidence/stage2/preservation.json`. Wynik budowania nadal poza Gitem.

Niezależny przegląd w osobnym worktree był statyczny. Wychwycił i potwierdził poprawki
pełnych 24 godzin przy świeżym logowaniu/rejestracji oraz zamrożenia wysłanego wariantu
rejestracji. Zastane A/B mają termin 10:00 UTC następnego dnia; świeża sesja przy demo-now
11:00 UTC ma termin 11:00 UTC następnego dnia. Dołączenie zachowuje zastany deadline.
Opisano te pułapki w `.ai/lessons.md`.

### Pozostałe ograniczenia i wznowienie

Brak nowych luk wymagających komponentów DS i brak nowych pytań produktowych.
Obowiązują lokalne oznaczenia DS-GAP z etapu 1. Hasło `MentioDemo!` jest jawnym
ograniczeniem symulacji, nie zmianą produkcyjnej polityki; prawdziwych haseł nie przechowujemy.
Płatność i zachowanie terminu po płatności nie dotyczą zatwierdzonej mapy tego przepływu.

Podgląd nadal działa na Storybooku na 3000 pod tym samym adresem i prototypeId;
nie zmieniono konfiguracji podglądu. Zewnętrznego uwierzytelnionego proxy nie sprawdzano.
Nie przeprowadzono pełnego testu każdej kontrolki/klawisza, wszystkich kombinacji viewportów
i motywów ani wszystkich operacji komentarzy i eksportów. To zakres **etapu 3**.
Przed nim trzeba uzupełnić notatki każdego ekranu o symulacje i nierozstrzygnięte elementy,
wykonać końcowy audyt i raport. Nie oznaczać prototypu jako zaakceptowanego ani gotowego do implementacji.

## Wynik etapu 3 — 2026-11-02

Wznowiono po „kontynuuj prace” (traktowane jako „dalej” po raporcie etapu 2). Poprzednia sesja
zostawiła skrypt `verify-stage3.mjs` i pierwszą poprawkę panelu, ale bez wyników.

### Co zrobiono

- **Notatki przy ekranach:** każda z 9 sekcji ma notatkę (historie #24 Dm… / #14 E01-S01,
  symulacja, poza rozstrzygnięciem), widoczną także w trybie prezentacji. Treść porównana z mapą.
- **README:** uruchomienie, konta demo, scenariusze, nowa sekcja „Bramki dostępu”,
  „Notatki przy ekranach”, rozszerzone „Ograniczenia symulacji” i komendy sprawdzenia.
- **Testy nawigacji** `navigation.test.mts`: 9 ekranów × gość + 5 kont zgodnie z L04/F2,
  cel powrotu z chronionego ekranu, wadliwe cookie, awaria weryfikacji → s11 przy działających
  s04/s08/s12, oraz statyczna kontrola, że każdy link produktu prowadzi do aktywnego ID (bez s05/s09/s10).
- `tsconfig` sprawdza teraz także testy `.mts` (lokalny `jsdom.d.ts`, bez nowych zależności).

### Defekty znalezione i naprawione w etapie 3

1. **Przepełnienie 320 px w pasku przeglądu** — „Wstrzymaj następne żądanie: nie” wystawał o 1,2 px.
   Lokalny CSS powtarza geometrię zawijania DS z `.mentio-action > .mentio-button-sm` (same tokeny).
2. **Lista wątków komentarzy niedostępna z klawiatury** — dostarczony silnik wybiera wątek tylko
   kliknięciem myszy w `div`; przy wielu wątkach i 320 px axe zgłosił `scrollable-region-focusable`.
   `review-integration.ts` nadaje nagłówkom `role=button`, `tabindex=0`, `aria-pressed` i obsługę
   Enter/Spacji (jak klik; silnik przenosi wtedy focus do pola odpowiedzi, Shift+Tab wraca).
   Nazwa dostępna = widoczny tekst nagłówka (pierwsza wersja z własnym `aria-label` łamała WCAG 2.5.3
   i została cofnięta). Silnik `prototype.js` nadal identyczny z dostarczonym; test jednostkowy i przeglądarkowy.
3. Wcześniej (poprzednia sesja, potwierdzone teraz): pusty komentarz był wysyłalny; Enter w trybie
   Comment wysyłał formularz produktu. Oba zablokowane z widoczną podpowiedzią/komunikatem.

Fałszywe alarmy samego audytu (pomiar w trakcie animacji Radix, nieskończony puls Skeleton,
fokus mierzony o klatkę za wcześnie, powtórzone treści komentarzy między przebiegami) poprawiono
w skrypcie, nie w produkcie. Lekcja w `.ai/lessons.md`.

### Faktyczna weryfikacja (finalny build)

- **Testy lokalne: 29/29 PASS** — model 4, symulacja 18, nawigacja 4, integracja przeglądu 3.
  TypeScript (z testami) i ESLint katalogu: PASS. Vite build: PASS.
- **Macierz: 197/197 PASS** (`evidence/stage3/matrix-results.json`) — 48 stanów × 320/1440 px ×
  jasny/ciemny: axe WCAG 2.1 A/AA bez naruszeń, brak poziomego przewijania i elementów poza ekranem,
  widoczna notatka; rozwinięte kontrolki przy każdej szerokości; 0 błędów runtime;
  wyłącznie żądania GET do localhost. 52 zrzuty 13 kluczowych stanów × 4 warianty (`evidence/stage3/<wariant>-<stan>.png`; `screenshot-probe*` to sondy poprzedniej sesji).
- **Kontrolki: 109/109 PASS** — 64 w 4 wariantach (`evidence/stage3/controls-viewports-results.json`)
  i 45 opcji scenariuszy (`options-results.json`) — w 4 wariantach:
  s01 → s12 → s01 i natywne Back/Forward, Tab/Shift+Tab, walidacja z klawiatury z fokusem na
  pierwszym błędzie, logowanie Ctrl+Enter z fokusem na nagłówku celu, dołączenie Enterem,
  skip-link PanelShell, kopiowanie adresu i nieaktywny edytor, ponowienie odczytu s06/s07,
  s11 ponawia tylko odczyt, Escape w Select zwraca fokus, Presentation i hotspoty, blokada
  wysyłki w trybie Comment. Tryb `options`: każda opcja — 8 kont, 6 warunków cookie, 6 + 4 odczyty paneli,
  10 wyników „Następnego żądania” (każdy zużyty jednorazowo), wstrzymanie/dokończenie,
  oba limity z resetem, 3 akcje operatora, wpisany `returnTo=/admin`, wariant rejestracji,
  rejestr przejść, nieznany adres `#s99` → s08 → s04.
- **Komentarze: 13/13 PASS** (`comments-results.json`, eksporty w `evidence/stage3/exports/`) —
  dodanie Alt+Enter i Ctrl+Enter, blokada pustych, odpowiedź, Resolve/Reopen, Re-anchor i anulowanie,
  ukryj/pokaż piny, komentarz na przycisku, wybór wątku z klawiatury, oba eksporty (bez hasła demo),
  usunięcie z anulowaniem i potwierdzeniem + tombstone po reloadzie, izolacja innego prototypeId,
  Escape zwraca fokus, panel 320 px w ciemnym motywie z axe.
- **Bramka repo:** lint, typecheck, test:coverage (304 testy / 45 plików, 100% wszystkich metryk),
  build, audit — **PASS**. Audit informuje, że wpis `braces` w `scripts/audit-allowlist.json`
  nie jest już zgłaszany; nie zmieniano go (poza zakresem prototypu).
- **Zachowanie źródeł:** 528 plików aplikacji/DS bez zmian; zmienił się tylko ignorowany,
  generowany `packages/app/next-env.d.ts`. Silnik przeglądu identyczny z wejściem
  (`evidence/stage3/preservation.json`). Wynik budowania nadal poza Gitem.

### Poprawka po przeglądzie — 2026-11-02

Uwaga użytkownika: błąd „Wpisz hasło demo” zasłaniał podpowiedź z hasłem. CrudForm ukrywa opis pola,
gdy pole ma błąd (`showDescription = description && !errors`), więc dotyczyło to każdego błędu hasła.
Schematy przeniesiono do `forms.ts`; każdy komunikat błędu hasła (puste, >72 bajty, <10 znaków przy
rejestracji) zawiera `MentioDemo!`. Test `forms.test.mts` (2 testy; łącznie lokalnie 31/31).
W przeglądarce przy 320 px: komunikat w `aria-describedby`, axe bez naruszeń, brak przewijania.
Pełnej macierzy i audytu kontrolek nie powtarzano — zmiana dotyczy tylko treści błędów hasła.
Obserwacja DS (nie nowa luka): CrudForm nie potrafi pokazać jednocześnie opisu i błędu pola.

### Poprawka paska przeglądu — 2026-11-02

Uwaga użytkownika: kontrolki nierówno, `<summary>` w różnych rozmiarach (14 i 16 px).
Wszystkie `<summary>` mają rolę etykiety DS (`--text-label`, `--line-label`, `--font-weight-medium`),
jak etykiety pól. Przyciski stoją na linii pól wyboru (`align-items: flex-end`), kontrolki nie ściskają
się poniżej etykiety, odstęp między nimi `--space-between-groups`. Narzędzia silnika i „Motyw” dzielą
jeden wiersz (CSS). `#theme-toggle` musi zostać bezpośrednim dzieckiem `.doc-toolbar` — silnik wstawia
przed nim swoje narzędzia; pierwsza próba przeniesienia go wywracała aplikację (lekcja w `.ai/lessons.md`).
Wszystkie kontrolki paska (przyciski DS, listy, narzędzia silnika) mają jedną wysokość `--control-height`
(36 px): przyciski w rozmiarze domyślnym zamiast `sm`, lokalne zawijanie z `padding-block: var(--spacing)`.
Zmierzono: przy 1440 px 30/30 kontrolek = 36 px; przy 320 px dwie zawinięte do dwóch linii stoją we własnych wierszach.
**s03 — decyzja użytkownika:** zamiast AuthPanel (448 px, jak w mapie) ta sama publiczna kompozycja i szerokość
co s04/s08/s12 (`prototype-public`, typografia publiczna, ActionButton, Link). s01/s02 nadal w AuthPanel (formularze).
Pole `returnTo` ograniczone do `--prose-max-width` (65ch; na tym hoście ok. 1150 px przez szerokie cyfry
fontu systemowego, normalnie ok. 600 px). Po zmianach (pasek, wysokości, s03): macierz 197/197, komentarze 13/13, testy lokalne 31/31;
audyt kontrolek (`controls`) w toku w chwili commitu — wynik w następnym wpisie.

### Czego nie sprawdzono

- `npm run test:integration` — nie uruchamiano ponownie; w etapach 1–2 runner nie startował
  (`code.charCodeAt is not a function`), brak Dockera i `TEST_DATABASE_URL`. Prototyp go nie dotyczy.
- Czytnik ekranu, Firefox/Safari, urządzenia dotykowe, zewnętrzny URL proxy sandboxa.
- Bezpieczeństwo backendu, kody HTTP, wyścigi transakcji — z definicji poza prototypem.

### Incydent podglądu

W trakcie audytu Storybook na 3000 przestał odpowiadać (przyczyny nie ustalono; brak dostępu do
`dmesg`, pamięci było dość). Uruchomiono go ponownie komendą z README. Omyłkowy drugi start macierzy
jednorazowo przeładował wspólną kartę trwającego przebiegu; każdy stan i tak resetuje demo,
a przeładowanie mogłoby test tylko wywrócić, nie zaliczyć. Przebieg zakończył się 197/197.

### Luki w design systemie (bez zmian względem etapów 1–2)

DS01 pełna strona 404; DS02 strona błędu; DS04 wspólna rama admina (PanelShell jako przyszły wygląd);
DS05 zaszyte angielskie teksty CrudForm (Required/Optional/Saving…/Cancel) — tłumaczone transformem
tylko w bundlu; stałe `id="panel-main"` w PanelShell; brak kompozycji instrukcji s12.
Nowa obserwacja (nie luka DS): dostarczony silnik przeglądu nie obsługuje klawiatury w liście wątków
i przy 320 px panel zakrywa pasek — warto poprawić w samym silniku przeglądu.

### Pytania do specyfikacji, które wyszły przy budowie

Brak otwartych. Pięć kandydatów z pierwszej wersji raportu po sprawdzeniu okazało się
rozstrzygniętych w `.ai/specs/2026-10-30-accounts-and-sign-in.md` i mapie; prototyp jest z nimi zgodny:

1. Brak roli po zalogowaniu z celem → 404: spec l. 304–307, mapa L09 i P01.
2. Nadanie roli widoczne przy następnym logowaniu/dołączeniu: spec l. 33.
3. Tekst pomocy hasła (10 znaków / 72 bajty): spec l. 157; dopisek o haśle demo jest tylko symulacją.
4. Każda dopuszczona próba, także udana, liczy się do limitu: spec l. 215, mapa Dm08.
5. „Wyloguj się” przy wadliwym cookie obok formularza: spec l. 166 („harmless”, ścieżka odzyskania).

Design: prototypes/konta-i-role/index.html
Source: .ai/specs/2026-10-30-accounts-and-sign-in.md
Verification: etap 3 zakończony — szczegóły wyżej
Acceptance: pending
Next: przegląd prototypu przez właściciela produktu i decyzja o „dalej”
