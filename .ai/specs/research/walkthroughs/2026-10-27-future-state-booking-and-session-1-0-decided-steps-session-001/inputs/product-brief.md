# DevMentor: wybór sesji z mentorem

- Date: 2026-09-24
- Mode: own
- Status: wejście do demonstracji `om-synthetic-users`, przed uruchomieniem panelu.
- Zakres: wycinek opisu produktu przygotowany na podstawie dołączonych materiałów. Nie zastępuje pełnego briefu ani aktualnego stanu aplikacji.
- Pochodzenie: [SOURCES.md](research/SOURCES.md). Notatki i decyzje są materiałami dostarczonymi. Nie potwierdzono niezależnie opisanych rozmów.

## Product

DevMentor pozwala deweloperowi znaleźć mentora i wybrać termin konsultacji. Mentor publikuje ofertę i dostępne terminy. Użytkownik może przejść z listy mentorów albo przez link do konkretnego profilu. `[DOCUMENT]` [D21](research/decisions/D21-finding-a-mentor.md)

Sesja trwa 25 albo 50 minut. Mentor ustala ceny obu długości w granicach operatora. W tym wycinku nie wskazujemy konkretnej oferty cenowej. `[DOCUMENT]` [D09](research/decisions/D09-pricing.md)

Można wybrać opublikowany termin rozpoczynający się co najmniej dwie godziny po rezerwacji. Nie oznacza to gwarancji wolnego terminu dokładnie za dwie godziny. `[DOCUMENT]` [D22](research/decisions/D22-session-timing.md)

Konsultacja ma formę tekstową i odbywa się w ekranie sesji wewnątrz DevMentora. `[DOCUMENT]` [N01](research/decisions/N01-no-video.md), [D27](research/decisions/D27-session-channel.md)

## Target group

- Deweloper z pilnym problemem przy wydaniu produktu, bez dostępnej pomocy seniora. Podstawą tej perspektywy jest jedna dostarczona notatka. `[INTERVIEW]` [working-dev](research/2026-08-20-interview-working-dev.md)
- Deweloper z niepilnym problemem konfiguracji, dla którego samodzielne rozwiązanie i pomoc wewnątrz zespołu pozostają alternatywą. Podstawą tej perspektywy jest osobna dostarczona notatka. `[INTERVIEW]` [platform-dev](research/2026-09-02-interview-platform-dev-solves-alone.md)

Nie znamy udziałów tych sytuacji w populacji ani częstości korzystania z płatnej pomocy. Dobór panelu demonstracyjnego nie jest próbą reprezentatywną. `[ASSUMPTION]` Brak danych o proporcjach.

## Problems

W notatce working-dev błąd TypeScript pojawia się przed wydaniem produktu, a senior jest nieobecny. Po 40 minutach szukania i dwóch sprzecznych odpowiedziach na Discordzie opisano obejście problemu z TODO. Notatka zawiera potrzebę pomocy „within the hour”; znaczenie tego czasu wymaga doprecyzowania. `[INTERVIEW]` [working-dev](research/2026-08-20-interview-working-dev.md)

W notatce platform-dev opisano problem z konfiguracją reguł linta i samodzielne dojście do rozwiązania. Materiał wskazuje małą pilność tego epizodu. Warunkowe odpowiedzi o innym, trudniejszym problemie nie są obserwacją zakupu. `[INTERVIEW]` [platform-dev](research/2026-09-02-interview-platform-dev-solves-alone.md)

## Goals

Cel demonstracyjnej analizy: poznać możliwe bariery podczas oceny oferty i wyboru sesji. `[ASSUMPTION]` Zakres ćwiczenia, bez zadanej z góry odpowiedzi.

Wynik analizy ma pomóc przygotować pytania do sprawdzenia z ludźmi. Nie określa prognozy sprzedaży ani poziomu popytu. `[ASSUMPTION]` Sposób wykorzystania wyniku ćwiczenia.

## Key flows

### Future state, booking and session (1.0), decided steps

1. Użytkownik loguje się przez GitHub lub używa e-maila i hasła. `[DOCUMENT]` [D07](research/decisions/D07-login.md)
2. Znajduje mentora na liście z filtrem po technologii albo otwiera link do jego profilu. Lista jest uporządkowana według ostatnio opublikowanej dostępności. `[DOCUMENT]` [D21](research/decisions/D21-finding-a-mentor.md)
3. Ocenia ofertę, wybiera długość 25 albo 50 minut i odczytuje cenę ustaloną przez mentora. Konkretna cena nie jest podana w tym materiale. `[DOCUMENT]` [D09](research/decisions/D09-pricing.md)
4. Wybiera spośród opublikowanych terminów. Wybrany start musi przypadać co najmniej dwie godziny po rezerwacji. Dokładny dostępny termin wymaga danych konkretnej oferty. `[DOCUMENT]` [D22](research/decisions/D22-session-timing.md)
5. W umówionym terminie bierze udział w tekstowej konsultacji wewnątrz DevMentora. `[DOCUMENT]` [N01](research/decisions/N01-no-video.md), [D27](research/decisions/D27-session-channel.md)

To narracyjny wycinek wyboru konsultacji. Nie opisuje wyglądu ekranów, obsługi płatności ani rozliczeń po sesji. Pominięcie tych elementów w ćwiczeniu nie oznacza, że produkt ich nie ma. `[ASSUMPTION]` Granice demonstracji.

## Business rules

| ID | Reguła | Źródło |
|---|---|---|
| R01 | Długość konsultacji wynosi 25 albo 50 minut. | `[DOCUMENT]` [D09](research/decisions/D09-pricing.md) |
| R02 | Mentor ustala cenę w granicach operatora. Tu nie ma konkretnego cennika oferty. | `[DOCUMENT]` [D09](research/decisions/D09-pricing.md) |
| R03 | Najwcześniejszy dopuszczalny początek to dwie godziny po rezerwacji; dostępność zależy od opublikowanych slotów. | `[DOCUMENT]` [D22](research/decisions/D22-session-timing.md) |
| R04 | Sesja jest tekstowa i odbywa się w produkcie. | `[DOCUMENT]` [N01](research/decisions/N01-no-video.md), [D27](research/decisions/D27-session-channel.md) |
| R05 | Logowanie: GitHub albo e-mail i hasło. | `[DOCUMENT]` [D07](research/decisions/D07-login.md) |

## Scope

W ćwiczeniu analizujemy perspektywę osoby wybierającej konsultację. Korzystamy z opisu, bez przeglądarki i bez transakcji. Nie podajemy modelowi stanu ekranu, którego nie zaobserwowano. `[ASSUMPTION]` Zakres demonstracji.

## Non-goals

Poza tym wycinkiem są onboarding mentorów, wybór nowych cen, płatności, anulowanie, wypłaty i notatka po konsultacji. Analiza nie sprawdza działania interfejsu ani kodu. `[ASSUMPTION]` Zakres demonstracji.

## Domain glossary

- Mentee: osoba rozważająca konsultację z mentorem.
- Mentor: osoba publikująca ofertę konsultacji i terminy.
- Długość sesji: czas trwania konsultacji.
- Termin: opublikowany moment rozpoczęcia konsultacji.
- Rezerwacja: wybór konkretnego terminu i długości w opisanym procesie.

Definicje porządkują opis ćwiczenia. `[DOCUMENT]` D07, D09, D21, D22 i D27.

## Riskiest assumptions

- A02: oferta płatnej konsultacji pasuje do problemu, z którym przychodzi deweloper. `[ASSUMPTION]` Wymaga obserwacji odpowiednich do decyzji o zakupie.
- A04: dostępny termin pozwala uzyskać pomoc, gdy jest jeszcze użyteczna. `[ASSUMPTION]` Sama decyzja o wyprzedzeniu rezerwacji nie potwierdza dopasowania do sytuacji.

Te założenia określają obszar pytań koordynatora. Nie są opisem cech persony i nie powinny trafiać do jej kontekstu.

## Hypotheses

Na wejściu nie ma hipotez z wcześniejszego panelu. Nowa sesja zapisze własne obserwacje zgodnie z parametrami przebiegu. Przy jednym przebiegu będą miały status `Seen once`.

## Open questions

Znaczenie czasu opisanego w notatce, rzeczywista dostępność konkretnego mentora, cena konkretnej oferty oraz sposób podjęcia decyzji wymagają odpowiednich danych. Nie uzupełniamy ich fikcyjnymi wartościami.
