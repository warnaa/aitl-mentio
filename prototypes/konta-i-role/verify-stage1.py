"""Stage 1 browser walk through the configured agent-browser provider; no real services."""
from pathlib import Path
import json
import subprocess
import time

ROOT = Path(__file__).resolve().parents[2]
BIN = ROOT / 'node_modules/.bin/agent-browser'
HERE = Path(__file__).resolve().parent
SESSION = 'konta-role-stage1'
URL = 'http://localhost:3000/prototypes/konta-i-role/index.html'
results = []

def call(*args):
    process = subprocess.run([str(BIN), '--session', SESSION, *args, '--json'], capture_output=True, text=True, timeout=35)
    answer = json.loads(process.stdout)
    assert answer.get('success'), (args, answer.get('error'))
    return answer['data']

def snapshot():
    return call('snapshot')

def ref(name, role):
    data = snapshot()
    matches = [key for key, item in data['refs'].items() if item.get('name') == name and item.get('role') == role]
    assert len(matches) == 1, (name, matches, data['snapshot'])
    return '@' + matches[0]

def click(name, role='button'):
    call('click', ref(name, role))
    time.sleep(.08)

def inspect(js):
    return call('eval', js)['result']

def check(name, screen=None, text=None, image=None):
    if screen:
        assert inspect('document.querySelector(".screen.is-current")?.id') == screen, (name, snapshot()['snapshot'])
    if text:
        assert text in snapshot()['snapshot'], (name, snapshot()['snapshot'])
    if image:
        call('screenshot', '--full', str(HERE / 'evidence' / image))
    results.append({'check': name, 'screen': screen, 'result': 'passed', 'screenshot': image})
    print('PASS ' + name, flush=True)

def login(email):
    click('Zaloguj się', 'link')
    call('fill', ref('Adres e-mail', 'textbox'), email)
    call('fill', ref('Hasło demo', 'textbox'), 'MentioDemo!')
    click('Zaloguj się')
    time.sleep(.65)

def run():
    call('open', URL)
    call('set', 'viewport', '1440', '1000')
    click('Reset demo')
    check('public-start', 's04', 'Konto w Mentio')
    click('Zaloguj się', 'link')
    check('login-composition', 's01', 'Symulacja konta', 's01-light-1440.png')
    click('Wstaw dane demo')
    check('demo-autofill', 's01', 'ada@example.test')
    click('Nie pamiętasz hasła?', 'link')
    check('recovery-instructions', 's12', 'Bez wcześniej ustalonego kanału')
    click('Wróć do logowania', 'link')
    click('← Back')
    check('engine-back', 's12')
    click('Wróć do logowania', 'link')
    click('Zaloguj się')
    time.sleep(.65)
    check('mentee-login', 's04', 'Ada Przykładowa')
    click('Zostań mentorem', 'link')
    check('enrollment-entry', 's03')
    click('Zostań mentorem')
    time.sleep(.65)
    check('enrollment-success', 's06', 'Zacznij swoją stronę')
    click('Reset demo')
    click('Załóż konto', 'link')
    check('registration-entry', 's02', 'Załóż konto')
    click('Wstaw dane demo')
    click('Załóż konto')
    time.sleep(.65)
    check('mentee-registration', 's04', 'Nowa osoba')
    click('Reset demo')
    click('Zostań mentorem', 'link')
    check('mentor-registration-entry', 's02', 'Załóż konto mentora')
    click('Wstaw dane demo')
    click('Załóż konto')
    time.sleep(.65)
    check('mentor-registration-success', 's06', 'Zacznij swoją stronę', 's06-new-mentor-1440.png')
    click('Reset demo')
    login('tomasz@example.test')
    check('existing-mentor-login', 's06', 'Szkic', 's06-existing-mentor-1440.png')
    click('Wyloguj się')
    time.sleep(.65)
    check('mentor-logout', 's04')
    login('olga@example.test')
    check('operator-login', 's07', 'Panel operatora', 's07-light-1440.png')
    click('Reset demo')
    login('leon@example.test')
    check('all-roles-operator-first', 's07', 'Panel mentora')
    click('Panel mentora', 'link')
    check('all-roles-other-area', 's06', 'Opublikowana')
    assert inspect('(() => { const ids=[...document.querySelectorAll("[id]")].map(x=>x.id); return ids.length===new Set(ids).size; })()')
    check('unique-dom-ids-and-skip-targets', 's06')
    assert inspect('getComputedStyle(document.querySelector("#s06 .mentio-skip-link")).clipPath') == 'inset(100%)'
    call('focus', '#s06 .mentio-panel-title')
    call('press', 'Shift+Tab')
    assert inspect('document.activeElement.matches("#s06 .mentio-skip-link")')
    assert inspect('getComputedStyle(document.querySelector("#s06 .mentio-skip-link")).clipPath') == 'none'
    call('press', 'Enter')
    assert inspect('document.activeElement.matches("#s06 .mentio-panel-main")')
    check('skip-link-hidden-until-focus-and-works', 's06')
    click('Reset demo')
    click('Zaloguj się', 'link')
    click('Motyw: jasny')
    check('dark-theme', 's01', None, 's01-dark-1440.png')
    assert inspect('document.documentElement.classList.contains("dark")')
    call('set', 'viewport', '320', '900')
    assert inspect('document.documentElement.scrollWidth <= innerWidth'), '320px horizontal overflow'
    check('narrow-dark-login', 's01', 'Zaloguj się', 's01-dark-320.png')
    click('Motyw: ciemny')
    check('narrow-light-login', 's01', None, 's01-light-320.png')
    call('set', 'viewport', '1440', '1000')
    click('Presentation')
    assert not inspect('document.body.classList.contains("proto-focus")')
    assert inspect('document.querySelectorAll("section.screen").length') == 9
    check('screen-map-mode')
    click('Presentation')
    check('presentation-mode', 's01')
    click('Show hotspots')
    assert inspect('document.body.classList.contains("proto-hints")')
    click('Hide hotspots')
    click('Comment')
    call('click', '#s01 input[type="email"]')
    call('fill', ref('Your name for review comments', 'textbox'), 'Recenzent demo')
    call('fill', ref('New review comment', 'textbox'), 'Test etapu 1: etykieta adresu e-mail.')
    click('Add comment')
    check('comment-created', 's01', 'Test etapu 1: etykieta')
    assert inspect('JSON.parse(localStorage.getItem("om-prototype-comments:v2:konta-i-role")).operations.length') >= 1
    call('reload')
    click('Threads')
    check('comment-survives-reload', 's01', 'Test etapu 1: etykieta', 'review-comment-1440.png')
    assert inspect('document.querySelectorAll(".anno-pin").length') >= 1
    click('Close')
    call('focus', '#s01 input[type="email"]')
    call('press', 'Tab')
    assert inspect('document.activeElement.matches("#s01 input[type=password]")')
    check('basic-keyboard-form-order', 's01')
    assert not call('errors').get('errors'), call('errors')
    check('no-browser-runtime-errors')

try:
    run()
finally:
    (HERE / 'evidence/stage1-browser-results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2)+'\n')
