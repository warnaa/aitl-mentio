"""Stage 2 state reachability and failure recovery using the configured agent-browser provider."""
from pathlib import Path
import json, subprocess, time
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
BIN=ROOT/'node_modules/.bin/agent-browser'
SESSION='konta-role-stage2'
URL='http://localhost:3000/prototypes/konta-i-role/index.html'
results=[]
def call(*args):
 p=subprocess.run([str(BIN),'--session',SESSION,*args,'--json'],capture_output=True,text=True,timeout=35)
 d=json.loads(p.stdout)
 assert d.get('success'),(args,d.get('error'))
 return d['data']
def snap():return call('snapshot')
def inspect(js):return call('eval',js)['result']
def ref(name,role):
 d=snap(); hits=[k for k,v in d['refs'].items() if v.get('name')==name and v.get('role')==role]
 assert len(hits)==1,(name,hits,d['snapshot'])
 return '@'+hits[0]
def click(name,role='button'):
 target=ref(name,role);call('scrollintoview',target);call('click',target);time.sleep(.08)
def click_selector(selector):
 call('scrollintoview',selector);call('click',selector);time.sleep(.08)
def choose(label,name,prefix=False):
 click(label,'combobox');d=snap();hits=[k for k,v in d['refs'].items() if v.get('role')=='option' and (v.get('name','').startswith(name) if prefix else v.get('name')==name)]
 assert len(hits)==1,(name,hits,d['snapshot'])
 call('scrollintoview','@'+hits[0]);call('click','@'+hits[0]);time.sleep(.08)
 if inspect('Boolean(document.querySelector("[role=listbox]"))'):
  call('press','Enter');time.sleep(.08)
def scenarios():
 if not inspect('document.querySelector(".prototype-scenarios").open'):call('click','.prototype-scenarios summary')
def assert_screen(id):assert inspect('document.querySelector(".screen.is-current")?.id')==id,snap()['snapshot']
def check(name,id=None,image=None):
 if id:assert_screen(id)
 if image:call('screenshot','--full',str(HERE/'evidence/stage2'/image))
 results.append({'check':name,'result':'passed','screen':id,'screenshot':image});print('PASS '+name,flush=True)
def state(id):
 scenarios();choose('Stan z mapy',id+' ·',True);click('Uruchom stan');time.sleep(.6)
 trace=inspect('document.querySelector("[data-state-trace]").textContent')
 assert id in trace,(id,trace,snap()['snapshot'])
 check('state-'+id,inspect('document.querySelector(".screen.is-current").id'))
def outcome(name):scenarios();choose('Następne żądanie',name)
def values(screen):return inspect('JSON.stringify([...document.querySelectorAll("#'+screen+' form input")].map(x=>[x.name,x.value]))')
def field(name,value):call('fill',ref(name,'textbox'),value)
def submit(screen):click_selector('#'+screen+' button[type="submit"]');time.sleep(.6)
def reset():click('Reset demo')
def login(email):
 click_selector('#s04 .mentio-site-nav a[href="#s01"]');field('Adres e-mail',email);field('Hasło demo','MentioDemo!');submit('s01')
def run():
 call('open',URL);call('set','viewport','1440','1000')
 # Every registered ID is observed in the actual transition trace, never merely the selector.
 for screen,count in [('s01',11),('s02',12),('s03',7),('s04',7),('s06',4),('s07',4),('s08',1),('s11',1),('s12',1)]:
  for n in range(1,count+1):
   state(f'{screen}.{n:02d}')
   if inspect('!document.querySelector(".prototype-scenarios button").disabled') and n==2 and screen in ['s01','s02','s03'] or (screen=='s04' and n==4):
    if 'Dokończ żądanie' in snap()['snapshot']:click('Dokończ żądanie')
   if (screen,n) in [('s01',11),('s02',8),('s07',4),('s08',1),('s11',1)]:
    call('screenshot','--full',str(HERE/'evidence/stage2'/f'{screen}-{n:02d}-1440.png'))
 state('s01.01');click('Wstaw dane demo');before=values('s01');outcome('Brak sieci');submit('s01');assert values('s01')==before;check('login-offline-retains-input','s01')
 outcome('Błąd usługi 500');submit('s01');assert values('s01')==before;check('login-server-error-retains-input','s01')
 submit('s01');check('login-retry-success','s04')
 state('s02.01');click('Wstaw dane demo');before=values('s02');outcome('Brak sieci');submit('s02');assert values('s02')==before;check('registration-offline-retains-input','s02')
 outcome('Błąd usługi 500');submit('s02');assert values('s02')==before;check('registration-server-retains-input','s02')
 state('s02.08');before=values('s02');submit('s02');assert values('s02')==before;assert 'Ten adres e-mail jest już zajęty' in snap()['snapshot'];check('lost-response-retry-conflict','s02')
 click('Masz już konto? Zaloguj się','link');field('Adres e-mail','nowa@example.test');field('Hasło demo','MentioDemo!');submit('s01');check('lost-response-ordinary-login','s04')
 state('s01.11');assert inspect('[...document.querySelectorAll("#s01 input")].every(x=>x.value==="")');assert 'Niewysłane dane nie zostały zachowane.' in snap()['snapshot'];check('session-loss-clears-input-and-shows-both-notices','s01')
 state('s07.04');assert not inspect('Boolean(document.querySelector("#s07 .tabular-nums"))');assert inspect('Boolean(document.querySelector("#s07 nav"))');check('loading-retains-navigation-without-fake-zero','s07')
 # Wrong role is a shared 404. Both direct selection and return target enforce the same boundary.
 reset();scenarios();field('Cel powrotu (returnTo)','/admin');login('ada@example.test');check('safe-target-does-not-grant-admin','s08')
 reset();scenarios();field('Cel powrotu (returnTo)','//evil.example.test');login('leon@example.test');check('unsafe-target-always-public-even-admin','s04')
 reset();scenarios();field('Cel powrotu (returnTo)','/admin');click_selector('#s04 a[href="#s01"]');click('Nie pamiętasz hasła?','link');assert inspect('document.querySelector(".prototype-scenarios input").value')=='/admin';click('Wróć do logowania','link');assert inspect('document.querySelector(".prototype-scenarios input").value')=='/admin';check('recovery-keeps-safe-target','s01')
 # Reusing A/B must not magically sign in again after logout.
 state('s06.01');click('Wyloguj się');time.sleep(.6);choose('Niezależna sesja','B');choose('Ekran','s06 · Start mentora');check('logout-A-keeps-B-valid','s06');choose('Niezależna sesja','A');check('return-to-revoked-A-is-login','s01')
 # The operator grant must be visible in stored roles but not in the old session snapshot.
 state('s03.01');click('Nadaj mentor poza sesją');choose('Ekran','s06 · Start mentora');check('grant-not-visible-to-old-session','s08');choose('Ekran','s03 · Dołącz do mentorów');click('Zostań mentorem');time.sleep(.6);check('authorized-enrollment-adopts-grant','s06')
 state('s03.01');outcome('Dołączenie · wygaśnięcie przed zapisem');click('Zostań mentorem');time.sleep(.6);assert 'role konta: mentee.' in snap()['snapshot'] or 'role konta: mentee.' in inspect('document.body.textContent');check('enrollment-expiry-before-commit','s01')
 state('s03.05');assert 'mentee, mentor' in inspect('document.querySelector(".prototype-scenarios").textContent');check('enrollment-expiry-after-commit-retains-role','s01')
 # Native Back on product 404 uses browser history, not the engine stack.
 state('s08.01');click('Przejdź do strony głównej','link');click('Zostań mentorem','link');call('back');time.sleep(.2);check('native-browser-back-restores-product-screen','s04')
 assert not call('errors').get('errors'),call('errors');check('no-runtime-errors')
if __name__ == '__main__':
 try:run()
 finally:(HERE/'evidence/stage2/browser-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
