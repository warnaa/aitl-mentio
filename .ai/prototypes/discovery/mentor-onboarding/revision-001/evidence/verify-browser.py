"""Replay local prototype checks using the configured agent-browser descriptor."""
from pathlib import Path
import json
import subprocess
import time

REVISION = Path(__file__).resolve().parent.parent
ROOT = REVISION.parents[4]
BIN = ROOT / 'node_modules/.bin/agent-browser'
SESSION = 'mentor-onboarding-r001'
URL = (REVISION / 'index.html').as_uri()
EVIDENCE = REVISION / 'evidence'
records = []
sequence = 0


def call(*args):
    result = subprocess.run([str(BIN), '--session', SESSION, *args, '--json'],
                            capture_output=True, text=True, timeout=40)
    payload = json.loads(result.stdout)
    if result.returncode or not payload.get('success'):
        raise AssertionError((args[0], payload.get('error'), result.stderr))
    return payload['data']


def snapshot():
    return call('snapshot')


def ref(name, role=None):
    data = snapshot()
    matches = [key for key, value in data['refs'].items()
               if value['name'] == name and (role is None or value['role'] == role)]
    assert len(matches) == 1, (name, role, matches, data['snapshot'])
    return '@' + matches[0]


def click(name):
    call('click', ref(name))
    return snapshot()


def fill(name, value):
    call('fill', ref(name), value)


def inspect(expression):
    return call('eval', expression)['result']


def check(name, expected, image=None, heading=None):
    global sequence
    data = snapshot()
    for text in expected:
        assert text in data['snapshot'], (name, text, data['snapshot'])
    if heading:
        observed = call('get', 'text', ref(heading, 'heading'))['text']
        assert observed == heading, (name, observed)
        assert inspect('document.activeElement.tagName') == 'H1', name + ': heading focus'
    sequence += 1
    filename = f'{sequence:02d}-{name}.json'
    (EVIDENCE / filename).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    if image:
        call('screenshot', '--full', str(EVIDENCE / image))
        assert (EVIDENCE / image).stat().st_size > 0
    records.append({'check': name, 'result': 'passed', 'expected': expected,
                    'snapshot': filename, 'screenshot': image})
    print('PASS ' + name, flush=True)


def settle():
    time.sleep(1.1)


def submit(name):
    click(name)
    settle()


def samples():
    click('Wstaw dane przykładowe na tym ekranie')


def register():
    samples()
    submit('Załóż konto')
    check('account-created', ['Pokaż, w czym możesz pomóc', 'alicja-przykladowa'], heading='Pokaż, w czym możesz pomóc')
    assert inspect("document.getElementById('password').value === '' && document.getElementById('email').value === ''")


def save_profile():
    samples()
    submit('Zapisz szkic i przejdź dalej')
    check('profile-saved', ['Ustal cenę sesji tekstowej'], heading='Ustal cenę sesji tekstowej')


def reset():
    click('Zacznij od nowa')
    check('reset-cleared', ['Załóż konto mentora', 'Dane, błędy i publikacja zostały usunięte.'], heading='Załóż konto mentora')
    assert inspect("[...document.querySelectorAll('input:not([type=checkbox]), textarea')].every(i => i.value === '') && !document.getElementById('listed').checked && document.getElementById('public-name').textContent === ''")


def run():
    call('open', URL)
    check('entry', ['Załóż konto mentora', 'Nie potrzebujesz zaproszenia'], '01-entry.png', 'Załóż konto mentora')
    click('Załóż konto')
    check('empty-registration', ['Wpisz imię i nazwisko', 'Wpisz poprawny przykładowy adres', 'Hasło musi mieć'], '02-registration-errors.png')
    assert inspect("document.activeElement.id === 'name' && document.getElementById('name').getAttribute('aria-invalid') === 'true'")
    # Summary is exposed by Chrome as DisclosureTriangle without a CLI ref.
    # Reach it from the observed last link using the provider's keyboard commands.
    call('focus', ref('Zaloguj się — poza tym prototypem'))
    call('press', 'Tab')
    assert inspect("document.activeElement.tagName === 'SUMMARY'")
    call('press', 'Enter')
    check('test-controls-keyboard', ['Wstaw dane przykładowe na tym ekranie'])
    samples()
    fill('Hasło przykładowe', 'ż' * 5)
    click('Załóż konto')
    check('password-codepoints', ['Hasło musi mieć co najmniej 10 znaków'])
    fill('Hasło przykładowe', 'ż' * 37)
    click('Załóż konto')
    check('password-byte-limit', ['Hasło musi mieć co najmniej 10 znaków i najwyżej 72 bajty'])
    samples()
    click('Zajęty e-mail przy następnej rejestracji')
    click('Załóż konto')
    check('occupied-email', ['Ten adres e-mail jest już zajęty', 'Jeśli konto zostało już utworzone'], '03-occupied-email.png')
    click('Zaloguj się — poza tym prototypem')
    check('signin-boundary', ['Logowanie — poza prototypem', 'wcześniej ustalonego prywatnego kanału'], heading='Logowanie — poza prototypem')
    click('Wróć do rejestracji')
    check('registration-recovery', ['Załóż konto mentora'], heading='Załóż konto mentora')
    click('Załóż konto')
    check('registration-pending', ['Zapisywanie…', 'Trwa zapisywanie w symulacji'])
    click('Zapisywanie…')  # A second submit must not duplicate account creation.
    settle()
    check('registered', ['Pokaż, w czym możesz pomóc', 'alicja-przykladowa'], '04-page-editor.png', 'Pokaż, w czym możesz pomóc')
    click('Wróć do konta')
    check('account-back', ['Konto mentora utworzone', 'Alicja Przykładowa'], heading='Konto mentora utworzone')
    click('Wróć do tworzenia strony')
    call('back')
    check('browser-back', ['Konto mentora utworzone'], heading='Konto mentora utworzone')
    call('forward')
    check('browser-forward', ['Pokaż, w czym możesz pomóc'], heading='Pokaż, w czym możesz pomóc')
    fill('Adres strony', 'zajety')
    fill('Linki do publicznej pracy', '\njavascript:alert(1)\nnot-a-url')
    click('Zapisz szkic i przejdź dalej')
    check('profile-validation', ['Ten adres jest już zajęty', 'Wiersze 2, 3'], '05-profile-errors.png')
    fill('Adres strony', 'alicja-przykladowa')
    fill('Linki do publicznej pracy', '')
    # Save an intentionally incomplete draft, then attempt publication.
    submit('Zapisz szkic i przejdź dalej')
    click('Pomiń stawkę na razie')
    check('no-slots', ['Nie masz jeszcze dodanych terminów', 'Dodaj pierwszy termin'], heading='Dodaj pierwszy termin')
    click('Przejdź do publikacji')
    check('incomplete-review', ['Brak opisu', 'Brak linku'], heading='Sprawdź swoją stronę')
    click('Opublikuj stronę')
    check('publication-refused', ['Przed publikacją napisz co najmniej 50 znaków', 'Dodaj co najmniej jeden link'], '06-publication-refused.png')
    assert inspect("document.activeElement.id === 'description'")
    samples()
    click('Niepowodzenie następnego zapisu')
    submit('Zapisz szkic i przejdź dalej')
    check('save-failure', ['Nie udało się zapisać', 'Twoje dane pozostały w formularzu'], '07-save-failure.png')
    assert inspect("document.getElementById('description').value.startsWith('Tworzę aplikacje')")
    submit('Zapisz szkic i przejdź dalej')
    check('save-retry', ['Ustal cenę sesji tekstowej'], heading='Ustal cenę sesji tekstowej')
    for value in ['89', '601', '150.5']:
        fill('Stawka za 25 minut, w zł', value)
        click('Zapisz stawkę i przejdź dalej')
        check('rate-invalid-' + value.replace('.', '-'), ['od 90 zł do 600 zł w pełnych złotych'])
    fill('Stawka za 25 minut, w zł', '90')
    check('rate-minimum-preview', ['25 min — 90 zł', '50 min — 180 zł'])
    fill('Stawka za 25 minut, w zł', '600')
    check('rate-maximum-preview', ['25 min — 600 zł', '50 min — 1200 zł'])
    samples()
    submit('Zapisz stawkę i przejdź dalej')
    check('rate-saved', ['Dodaj pierwszy termin'], heading='Dodaj pierwszy termin')
    click('Dodaj ten termin')
    check('slot-added', ['Termin dodany do Twojej dostępności'], '08-slot-added.png')
    click('Usuń przykładowy termin')
    check('slot-removed', ['Nie masz jeszcze dodanych terminów'])
    click('Dodaj ten termin')
    click('Przejdź do publikacji')
    check('ready-to-publish', ['25 min — 150 zł; 50 min — 300 zł', '3 listopada 2026, 18:00'], '09-review.png', 'Sprawdź swoją stronę')
    assert not call('is', 'checked', ref('Pokaż mnie na publicznej liście mentorów'))['checked']
    submit('Opublikuj stronę')
    check('published-unlisted', ['Twoja strona jest gotowa', 'Nie dołączyłeś do listy'], '10-published.png', 'Twoja strona jest gotowa')
    assert inspect("document.querySelector('nav').hidden"), 'Completed flow must not offer excluded editor destinations'
    click('Otwórz swój link w prototypie')
    check('public-preview-unlisted', ['Alicja Przykładowa', '25 min — 150 zł', '50 min — 300 zł', '3 listopada 2026, 18:00', 'wyłącznie tekstowo'], '11-public-preview.png', 'Alicja Przykładowa')
    click('https://example.invalid/alicja/projekt')
    check('public-work-boundary', ['Publiczna praca — poza prototypem', 'https://example.invalid/alicja/projekt'], heading='Publiczna praca — poza prototypem')
    click('Wróć do strony mentora')
    click('Lista mentorów')
    check('unlisted-directory', ['Na liście nie ma jeszcze mentorów', 'dostępna przez link'], '12-unlisted-directory.png', 'Mentorzy')
    call('open', URL + '#unknown-screen')
    check('unknown-fragment', ['Nie ma takiego ekranu'], heading='Nie ma takiego ekranu')
    click('Wróć do dostępnego etapu')
    check('unknown-recovery', ['Twoja strona jest gotowa'], heading='Twoja strona jest gotowa')
    click('Pokaż brak uprawnień')
    check('permission-denied', ['Brak dostępu do edycji', 'Nie zmieniłeś szkicu ani publikacji'], '13-permission-denied.png', 'Brak dostępu do edycji')
    click('Wróć do własnego szkicu w symulacji')
    check('permission-recovery', ['Twoja strona jest gotowa'], heading='Twoja strona jest gotowa')
    reset()
    register()
    save_profile()
    click('Pomiń stawkę na razie')
    click('Przejdź do publikacji')
    call('check', ref('Pokaż mnie na publicznej liście mentorów'))
    submit('Opublikuj stronę')
    check('published-listed-no-rate', ['Dołączyłeś do publicznej listy', 'Nie masz terminów'], heading='Twoja strona jest gotowa')
    click('Otwórz swój link w prototypie')
    check('public-no-rate-no-slot', ['Mentor nie ustalił jeszcze stawki', 'Brak terminów do rezerwacji'], '14-unpriced-preview.png', 'Alicja Przykładowa')
    click('Lista mentorów')
    check('listed-directory', ['Alicja Przykładowa', 'Brak stawki', 'Brak terminów do rezerwacji'], '15-listed-directory.png', 'Mentorzy')
    click('Alicja Przykładowa')
    check('directory-link', ['Alicja Przykładowa', 'Mentor nie ustalił jeszcze stawki'], heading='Alicja Przykładowa')
    reset()
    register()
    save_profile()
    samples()
    submit('Zapisz stawkę i przejdź dalej')
    click('Dodaj ten termin')
    click('Przejdź do publikacji')
    call('check', ref('Pokaż mnie na publicznej liście mentorów'))
    submit('Opublikuj stronę')
    click('Zobacz symulację listy mentorów')
    check('listed-priced-slot', ['Alicja Przykładowa', '25 min — 150 zł', 'Najbliższy termin: 3 listopada 2026, 18:00'], '16-listed-priced-slot.png', 'Mentorzy')
    click('Alicja Przykładowa')
    call('set', 'viewport', '320', '800')
    call('focus', ref('Alicja Przykładowa', 'heading'))
    call('press', 'Tab')
    focus = inspect("({tag:document.activeElement.tagName, text:document.activeElement.textContent, outline:getComputedStyle(document.activeElement).outlineWidth, visible:document.activeElement.matches(':focus-visible'), overflow:document.documentElement.scrollWidth > innerWidth})")
    assert focus['tag'] == 'A' and focus['visible'] and focus['outline'] == '3px' and not focus['overflow'], focus
    check('narrow-keyboard-public', ['Alicja Przykładowa', '25 min — 150 zł'], '17-narrow-public-focus.png')
    reset()
    check('narrow-registration', ['Załóż konto mentora', 'Załóż konto'], '18-narrow-registration.png')
    assert not inspect('document.documentElement.scrollWidth > innerWidth')
    register()
    check('narrow-editor', ['Pokaż, w czym możesz pomóc', 'Linki do publicznej pracy'], '19-narrow-editor.png')
    assert not inspect('document.documentElement.scrollWidth > innerWidth')
    call('set', 'offline', 'on')
    save_profile()
    samples()
    submit('Zapisz stawkę i przejdź dalej')
    click('Przejdź do publikacji')
    submit('Opublikuj stronę')
    check('offline-publication', ['Twoja strona jest gotowa'], heading='Twoja strona jest gotowa')
    reset()
    samples()
    click('Załóż konto')
    click('Zacznij od nowa')
    settle()
    check('reset-cancels-pending', ['Załóż konto mentora', 'Dane, błędy i publikacja zostały usunięte.'], heading='Załóż konto mentora')
    assert inspect("document.getElementById('name').value === '' && !document.querySelector('[aria-busy]')")
    call('open', URL + '#public-preview')
    check('reload-guard', ['Załóż konto mentora'], heading='Załóż konto mentora')
    errors = call('errors')
    assert not errors.get('errors'), errors
    records.append({'check': 'page-errors', 'result': 'passed', 'observed': errors})


outcome = 'incomplete'
try:
    run()
    outcome = 'passed'
except Exception as error:
    records.append({'check': 'interrupted', 'result': 'failed', 'error': str(error)})
    print('FAIL ' + str(error), flush=True)
finally:
    try:
        call('close')
        records.append({'check': 'session-closed', 'result': 'passed'})
    except Exception as error:
        outcome = 'incomplete'
        records.append({'check': 'session-closed', 'result': 'failed', 'error': str(error)})
    (EVIDENCE / 'browser-results.json').write_text(json.dumps({'verification': outcome, 'provider': 'agent-browser', 'session': SESSION, 'checks': records}, ensure_ascii=False, indent=2) + '\n')
    print('Verification: ' + outcome, flush=True)
    if outcome != 'passed':
        raise SystemExit(1)
