# Mentio — zatwierdzone tokeny design systemu

Data: 2026-10-31. Wynik: done.

## Zadanie

Przełożyć przyjęte referencje na propozycję tokenów w trzech warstwach, z mapowaniem na istniejące nazwy, kontrastami obu motywów i listą decyzji niebędących tokenami. Nie zapisywać plików przed zatwierdzeniem. Po odpowiedzi „zatwierdzam” zapisać tabelę i obie listy do `lekcja-06/tokeny.md`.

## Checklist

- [x] Odczytać `lekcja-06/referencje.md` oraz istniejące tokeny i użycia w komponentach.
- [x] Ustalić właściwe źródło: brak `packages/ui/src/tokens.css`; użyto `packages/ui/src/styles/globals.css` i importowanego motywu Tailwinda.
- [x] Policzyć kontrasty tekstu, elementów interfejsu i sprawdzanych stanów przezroczystych dla obu motywów; wskazać problemy dotychczasowych par i poprawki.
- [x] Przedstawić całą propozycję bez zapisywania plików; uzyskać zatwierdzenie użytkowniczki.
- [x] Zapisać zatwierdzoną tabelę i obie listy w `lekcja-06/tokeny.md`, bez zmiany wartości.
- [x] Sprawdzić strukturę, odwołania i kontrasty zapisanych wartości.

## Zakres

- Źródła: `lekcja-06/referencje.md`, `packages/ui/src/styles/globals.css`, `node_modules/tailwindcss/theme.css`, odczytane komponenty UI oraz oficjalne objaśnienia WCAG wskazane w dokumencie.
- Utworzono `lekcja-06/tokeny.md` oraz ten log. Nie zmieniono referencji, specyfikacji, CSS ani kodu komponentów; zadanie dotyczy dokumentu zatwierdzonych decyzji.
- Nie dodawano nowych tokenów komponentowych; zachowano istniejące nazwy nawigacji jako aliasy do wspólnej semantyki.
- Użytkowniczka nie zmieniła wartości pomiędzy przedstawieniem propozycji a zatwierdzeniem.

## Weryfikacja

Sprawdzono 53 unikalne wiersze tokenów, po sześć wypełnionych kolumn, pochodzenie tokenów znaczeniowych, lokalne odnośniki i obecność obu wymaganych list. Paleta zapisana w tabeli odpowiada zatwierdzonym wartościom. Ponownie obliczono kontrasty z wartości odczytanych z dokumentu, rozwiązując aliasy dla obu motywów i sprawdzając także hover, podbarwienie błędu oraz mieszanki teł neutralnych; wszystkie zatwierdzone pary osiągają odpowiedni próg. Minimalny kontrast sprawdzonych obramowań wynosi 3,1618 : 1 w ciemnym motywie. `git diff --check` nie zgłosił błędów; nowe nieśledzone dokumenty sprawdzono osobno skryptem. Testów aplikacji nie uruchamiano: zmiana dotyczy wyłącznie Markdown.

## Needs from you

none
