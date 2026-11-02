"""Targeted Stage 2 checks: pending guards, role invalidation, review-anchor preservation, narrow notice."""
from pathlib import Path
import runpy,json,time
HERE=Path(__file__).resolve().parent
helpers=runpy.run_path(str(HERE/'verify-stage2.py'))
call,inspect,click,choose,state,check,field,submit=[helpers[k] for k in ('call','inspect','click','choose','state','check','field','submit')]
try:
 state('s01.02')
 assert inspect('document.querySelector("#s01 button[type=submit]").disabled')
 before=inspect('document.querySelector(".prototype-scenarios").textContent')
 call('eval','document.querySelector("#s01 form").requestSubmit()')
 assert inspect('document.querySelector(".prototype-scenarios").textContent')==before
 check('pending-login-disabled-and-double-submit-blocked','s01')
 click('Dokończ żądanie')
 state('s02.02')
 assert inspect('document.querySelector("#s02 button[type=submit]").disabled')
 assert inspect('document.querySelector(".prototype-map button").disabled')
 check('pending-registration-locks-submitted-variant','s02')
 click('Dokończ żądanie')
 state('s06.01');click('Reset operatora');check('operator-reset-invalidates-A','s01');choose('Niezależna sesja','B');choose('Ekran','s06 · Start mentora');check('operator-reset-invalidates-B','s01')
 state('s01.01');field('Adres e-mail','legacy@example.test');field('Hasło demo','MentioDemo!');submit('s01');assert 'Nieprawidłowy e-mail lub hasło' in helpers['snap']()['snapshot'];check('legacy-login-generic-error','s01')
 state('s02.01');click('Wstaw dane demo');field('Adres e-mail','  ADA@EXAMPLE.TEST  ');submit('s02');assert 'Ten adres e-mail jest już zajęty' in helpers['snap']()['snapshot'];check('padded-uppercase-email-conflict','s02')
 state('s01.01')
 call('click','.prototype-scenarios summary')
 click('Comment')
 call('scrollintoview','#s01 input[type=email]');call('click','#s01 input[type=email]')
 field('Your name for review comments','Recenzent demo');field('New review comment','Etap 2: zachowanie przypięcia do e-maila.');click('Add comment');click('Clickable');click('Close')
 click('Wstaw dane demo')
 call('reload')
 click('Threads');assert 'Etap 2: zachowanie przypięcia do e-maila.' in helpers['snap']()['snapshot']
 assert inspect('(() => {const log=JSON.parse(localStorage.getItem("om-prototype-comments:v2:konta-i-role")); const op=log.operations.filter(x=>x.type==="create").at(-1); let node=document.getElementById(op.payload.screen); for(const part of op.payload.anchor.split(">")){const [tag,n]=part.split(":");node=[...node.children].filter(x=>x.tagName.toLowerCase()===tag)[Number(n||1)-1];if(!node)return false;}return node.matches("#s01 input[name=email]");})()')
 assert inspect('(window.__prototypeOrphans||[]).length')==0
 check('review-comment-keeps-correct-email-anchor-and-reloads','s01','comment-preserved-1440.png');click('Close')
 state('s01.11');call('click','.prototype-scenarios summary')
 call('set','viewport','320','900')
 assert inspect('document.documentElement.scrollWidth<=innerWidth')
 check('narrow-session-loss-light','s01','session-loss-light-320.png')
 click('Motyw: jasny');assert inspect('document.documentElement.scrollWidth<=innerWidth')
 check('narrow-session-loss-dark','s01','session-loss-dark-320.png')
 call('set','viewport','1440','1000');click('Motyw: ciemny')
 assert not call('errors').get('errors');check('extra-no-runtime-errors')
finally:
 (HERE/'evidence/stage2/extra-browser-results.json').write_text(json.dumps(helpers['results'],ensure_ascii=False,indent=2)+'\n')
