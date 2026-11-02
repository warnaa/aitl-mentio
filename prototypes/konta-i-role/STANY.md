# Konta i role — pokrycie stanów (etapy 2 i 3)

Źródło: `lekcja-07/mapa-ekranow.md`. Wszystkie 48 aktywnych pozycji zachowuje ID.
W pasku wybierz „Stan z mapy”, potem „Uruchom stan”. To odtwarza fixtures;
formularze i akcje DS wykonują rzeczywiste lokalne przejścia, a nie tylko zmieniają etykietę.
Sukcesy i przekierowania są widoczne w rejestrze przejść; nie dodajemy ekranów.

Dowody: [główny przebieg](evidence/stage2/browser-results.json),
[dodatkowe sprawdzenia](evidence/stage2/extra-browser-results.json).
Etap 3 ([macierz](evidence/stage3/matrix-results.json)) uruchomił każdy stan ponownie przy 320 i 1440 px,
w jasnym i ciemnym motywie: axe WCAG 2.1 A/AA bez naruszeń, brak poziomego przewijania, widoczna notatka ekranu.

| ID | Stan | Wejście | Etap 2 | Etap 3 (320/1440 × jasny/ciemny) |
|---|---|---|---|---|
| s01.01 | Pusty formularz | Pasek → s01.01 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s01.02 | Wysyłanie | Pasek → s01.02 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s01.03 | Walidacja pól | Pasek → s01.03 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s01.04 | Nieprawidłowe dane · 401 | Pasek → s01.04 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s01.05 | Limit prób · 429 | Pasek → s01.05 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s01.06 | Brak sieci | Pasek → s01.06 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s01.07 | Błąd usługi · 500 | Pasek → s01.07 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s01.08 | Sukces → cel | Pasek → s01.08 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s01.09 | Niebezpieczny cel → / | Pasek → s01.09 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s01.10 | Już zalogowano → cel | Pasek → s01.10 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s01.11 | Powrót po utracie sesji | Pasek → s01.11 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s02.01 | Pusty formularz | Pasek → s02.01 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s02.02 | Wysyłanie | Pasek → s02.02 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s02.03 | Walidacja pól | Pasek → s02.03 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s02.04 | Zajęty adres · 409 | Pasek → s02.04 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s02.05 | Limit prób · 429 | Pasek → s02.05 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s02.06 | Brak sieci | Pasek → s02.06 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s02.07 | Błąd usługi · 500 | Pasek → s02.07 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s02.08 | Zapisano, utracono odpowiedź | Pasek → s02.08 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s02.09 | Sukces → cel | Pasek → s02.09 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s02.10 | Niebezpieczny cel → / | Pasek → s02.10 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s02.11 | Już zalogowano → cel | Pasek → s02.11 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s02.12 | Wariant mentora | Pasek → s02.12 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s03.01 | Dołączenie | Pasek → s03.01 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s03.02 | Wysyłanie | Pasek → s03.02 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s03.03 | Błąd akcji | Pasek → s03.03 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s03.04 | Dodano rolę → cel | Pasek → s03.04 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s03.05 | Utrata sesji | Pasek → s03.05 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s03.06 | Już mentor → cel | Pasek → s03.06 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s03.07 | Gość → logowanie | Pasek → s03.07 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s04.01 | Bez cookie | Pasek → s04.01 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s04.02 | Cookie obecne | Pasek → s04.02 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s04.03 | Nieaktualne cookie | Pasek → s04.03 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s04.04 | Wylogowywanie | Pasek → s04.04 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s04.05 | Błąd wylogowania | Pasek → s04.05 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s04.06 | Wylogowano | Pasek → s04.06 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s04.07 | Publiczny widok przy awarii | Pasek → s04.07 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s06.01 | Istniejąca strona | Pasek → s06.01 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s06.02 | Brak strony | Pasek → s06.02 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s06.03 | Ładowanie | Pasek → s06.03 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s06.04 | Błąd odczytu | Pasek → s06.04 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s07.01 | Dane | Pasek → s07.01 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s07.02 | Zero użytkowników | Pasek → s07.02 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s07.03 | Błąd danych | Pasek → s07.03 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s07.04 | Ładowanie | Pasek → s07.04 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s08.01 | Wspólna 404 / odmowa | Pasek → s08.01 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s11.01 | Awaria sprawdzania dostępu | Pasek → s11.01 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |
| s12.01 | Instrukcja odzyskania dostępu | Pasek → s12.01 → Uruchom stan | PASS — przejście w przeglądarce | PASS ×4 |

s05/s09/s10 i 13 historycznych stanów pozostają wycofane. Nie ma kontrolek płatności, OAuth ani maili.

Etap 2: 95 checkpointów przeglądarkowych; 48 unikalnych ID. Etap 3: 192 przebiegi stanów (48 × 4) w macierzy 197 checkpointów.
Szczegóły kont, reguł zachowania danych i ograniczeń symulacji: [README](README.md).
