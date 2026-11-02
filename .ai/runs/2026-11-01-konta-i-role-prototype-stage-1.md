# Konta i role — etap 1

Data: 2026-11-01. Zgoda: użytkownik odpowiedział „dalej” po planie etapu 0.
Zakres: wyłącznie szkielet, silnik przeglądu i ścieżki sukcesu. Wynik: etap 1 zakończony;
cały prototyp pozostaje niekompletny przed etapami 2–3; integracja repo nieprzeprowadzona z powodu błędu startu.

- [x] Odczytać POSTEP.md, instrukcje, komponenty i konfigurację podglądu.
- [x] Zidentyfikować proces preview: Next.js uruchomiony przez workspace-agent-cli według openmercato.toml.
- [x] Zapisać hashe wejść przed implementacją.
- [x] Zbudować niezależny prototyp z DS i niezmienionym silnikiem JS.
- [x] Uruchomić Storybook na 3000 i potwierdzić docelowy adres.
- [x] Sprawdzić build, typy, lint, lokalne testy i ścieżki w przeglądarce.
- [x] Zapisać dowody, luki i ograniczenia; zaktualizować POSTEP.md.
- [x] Zatrzymać się przed etapem 2.

Źródło: .ai/specs/2026-10-30-accounts-and-sign-in.md i lekcja-07/mapa-ekranow.md.
Implementacja tylko w prototypes/konta-i-role/; wynik w ignorowanym public/prototypes/konta-i-role/.
Bez zmian aplikacji, DS, specyfikacji, lockfile i openmercato.toml.

## Wynik i sprawdzenie

Kod, README, testy i dowody: `prototypes/konta-i-role/`. POSTEP.md zawiera pełny rejestr.
Podgląd: `/prototypes/konta-i-role/index.html`; root portu 3000 pokazuje Storybook.
Zatrzymano nadzorowany PM2 `workspace-preview`, bo sam restartował Next; własny Storybook
pozostaje w sesji 80578. Konfiguracji nie zmieniono. README podaje przywrócenie aplikacji.

Vite build, lokalne typy/lint, 4 testy modelu/adaptera oraz 28 checkpointów browser PASS.
Sprawdzono ścieżki sukcesu, oba motywy logowania przy 320/1440, komentarz i reload,
mapę, prezentację, Back, hotspoty, unikalne ID i keyboard skip-link. Porównano z autentyczną story DS.
Hashe 526 wejściowych plików źródeł pozostały takie same; build/typecheck zaktualizowały
ignorowane wygenerowane next-env.d.ts i tsconfig.tsbuildinfo, bez zmian kodu aplikacji.

Repo lint/typecheck/coverage/build/audit PASS; 304 unit testy z 100% każdej metryki.
Integracja po buildzie NIE PRZESZŁA: startup Vite/Vitest `code.charCodeAt is not a function`;
nie uruchomiono testów. Nie ma socketu Docker ani TEST_DATABASE_URL. Nie zmieniono test infrastructure.
To nie jest pełna zielona bramka aplikacji ani końcowa weryfikacja prototypu.

Lokalne luki DS i ograniczenia są opisane w README/POSTEP.md. Regresję skip-linku w pozycjonowanej
ramie skorygowano lokalnym CSS i testem klawiatury, dopisano lekcję do `.ai/lessons.md`.
Etapy 2–3, wszystkie stany i operacje przeglądu oraz zewnętrzny proxy URL pozostają niezweryfikowane.

## Needs from you

„dalej” przed etapem 2; zgodnie z etapowaniem użytkownika nie rozpoczęto dalszej pracy.
