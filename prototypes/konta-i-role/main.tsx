import { useEffect, useId, useLayoutEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { z } from 'zod';
import { AccountNav } from '@mentio/ui/components/auth/AccountNav';
import { AuthPanel } from '@mentio/ui/components/auth/AuthPanel';
import { CrudForm } from '@mentio/ui/backend/forms';
import { ActionButton, Link } from '@mentio/ui/backend/actions';
import { PanelShell } from '@mentio/ui/backend/layout';
import { ErrorMessage, LoadingMessage } from '@mentio/ui/backend/feedback';
import { Button } from '@mentio/ui/components/button';
import { Badge } from '@mentio/ui/components/badge';
import { Label } from '@mentio/ui/components/label';
import { Input } from '@mentio/ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mentio/ui/components/select';
import { Card, CardContent, CardHeader, CardTitle } from '@mentio/ui/components/card';
import { Alert, AlertDescription, AlertTitle } from '@mentio/ui/components/alert';
import { Skeleton } from '@mentio/ui/components/skeleton';
import { MentorPageStatus } from '@mentio/ui/components/mentors/MentorPageStatus';
import { DEMO_PASSWORD, SCREENS, SCREEN_NOTES, isScreen, slugFor, type ScreenId } from './model';
import { Simulation, UNCERTAIN, type Cookie, type Outcome, type ReadState } from './simulation';
import { STATES, labelForState, type StateId } from './states';
import { prepareState } from './scenarios';
import { installReviewHints } from './review-integration';
import './review/comments.js';
import './review/prototype.js';
import './styles.css';

declare global { interface Window { __PROTOTYPE_START__: () => boolean } }
const sim = new Simulation();
// Local schemas preserve production constraints without importing the app or data layer.
const email = z.string({ error: 'Wpisz poprawny adres e-mail demo' }).trim().toLowerCase().pipe(z.email({ error: 'Wpisz poprawny adres e-mail demo' }).max(320, 'Maksymalnie 320 znaków'));
const password = z.string({ error: 'Wpisz hasło demo' }).min(1, 'Wpisz hasło demo').refine(value => new TextEncoder().encode(value).length <= 72, 'Hasło może mieć maksymalnie 72 bajty UTF-8');
const loginSchema = z.object({ email, password });
const registerSchema = z.object({ name: z.string({ error: 'Wpisz imię i nazwisko demo' }).trim().min(1, 'Wpisz imię i nazwisko demo').max(80, 'Maksymalnie 80 znaków'), email, password: password.refine(value => Array.from(value).length >= 10, 'Hasło musi mieć co najmniej 10 znaków') });
const introSchema = z.object({ displayName: z.string(), slug: z.string() });
const success = () => ({ ok: true as const, data: null, status: 200 });
const message = 'Symulacja konta i logowania. Używaj wyłącznie danych demo. Nie wpisuj prawdziwego hasła. Niczego nie wysyłamy.';
function navigate(screen: ScreenId) { const target = sim.route(screen); document.dispatchEvent(new CustomEvent('prototype:navigate', { detail: target })); }

function App() {
  const s = useSyncExternalStore(sim.subscribe, sim.getSnapshot);
  const user = s.infrastructure ? null : sim.currentAccount();
  const [demoEmail, setDemoEmail] = useState('ada@example.test');
  const [fill, setFill] = useState(0);
  const [fillEpoch, setFillEpoch] = useState(-1);
  const [fillEmail, setFillEmail] = useState('ada@example.test');
  const [dark, setDark] = useState(false);
  const [chosenState, setChosenState] = useState<StateId>('s01.01');
  const uid = useId();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    sim.setReturnTo(params.get('returnTo'));
    sim.setMentorRegistration(params.get('jako') === 'mentor');
    let lastURL: string | null = null;
    let fromHistory = false;
    function changed(event: Event) {
      const id: unknown = (event as CustomEvent).detail;
      if (typeof id !== 'string' || !isScreen(id)) return;
      const final = sim.route(id);
      if (final !== id) { queueMicrotask(() => document.dispatchEvent(new CustomEvent('prototype:navigate', { detail: final }))); return; }
      const nextURL = location.href;
      if (lastURL && nextURL !== lastURL && !fromHistory) {
        history.replaceState(null, '', lastURL);
        history.pushState(null, '', nextURL);
      }
      fromHistory = false; lastURL = nextURL;
    }
    function popped() {
      const id = location.hash.slice(1);
      // Native skip-link hashes identify an element, rather than another product screen.
      if (!isScreen(id) && document.getElementById(id)) return;
      fromHistory = true;
      navigate(isScreen(id) ? id : 's08');
    }
    document.addEventListener('prototype:screen-change', changed);
    window.addEventListener('popstate', popped);
    const hash = location.hash.slice(1);
    window.__PROTOTYPE_START__();
    const removeReviewHints = installReviewHints();
    if (hash && !isScreen(hash) && !document.getElementById(hash)) navigate('s08');
    return () => { document.removeEventListener('prototype:screen-change', changed); window.removeEventListener('popstate', popped); removeReviewHints(); };
  }, []);
  useLayoutEffect(() => {
    const current = document.querySelector('.screen.is-current');
    if (current && current.id !== s.active) document.dispatchEvent(new CustomEvent('prototype:navigate', { detail: s.active }));
    const heading = document.querySelector<HTMLElement>(`#${s.active} .frame h1`);
    heading?.setAttribute('tabindex', '-1'); heading?.focus({ preventScroll: true });
  }, [s.active, s.formEpoch]);
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);

  function reset() { sim.reset(); setFill(0); navigate('s04'); }
  function fillDemo(email = demoEmail) { setFillEmail(email === 'guest' ? 'ada@example.test' : email); setFillEpoch(sim.getSnapshot().formEpoch); setFill(value => value + 1); }
  function observeSubmit(event: FormEvent, id: 's01' | 's02') {
    if (!(event.target instanceof HTMLFormElement)) return;
    const values = Object.fromEntries(new FormData(event.target));
    if (!(id === 's01' ? loginSchema : registerSchema).safeParse(values).success) sim.mark(id === 's01' ? 's01.03' : 's02.03');
  }
  function productSubmit(event: FormEvent, id: ScreenId) {
    // Comment mode intercepts pointer clicks in the engine; keyboard submit needs the same boundary.
    if (document.body.classList.contains('proto-comment')) {
      event.preventDefault(); event.stopPropagation();
      sim.notify('Tryb komentarzy: wysyłanie formularza jest wstrzymane. Włącz Clickable, aby wykonać akcję produktu.');
      return;
    }
    if (id === 's01' || id === 's02') observeSubmit(event,id);
  }
  function runState() {
    setFill(0);
    const recipe = prepareState(sim, chosenState);
    if (recipe.fill) fillDemo(recipe.email);
    navigate(recipe.screen);
    if (recipe.submit) requestAnimationFrame(() => requestAnimationFrame(() => {
      const screen = sim.getSnapshot().active;
      if (recipe.submit === 'login' || recipe.submit === 'register') document.querySelector<HTMLFormElement>(`#${screen} form`)?.requestSubmit();
      else document.querySelector<HTMLButtonElement>(`#${screen} ${recipe.submit === 'enroll' ? '.mentio-auth .mentio-action button' : '.mentio-site-header .mentio-action button'}`)?.click();
    }));
  }
  function logout() { return <ActionButton key={`logout-${s.formEpoch}`} label="Wyloguj się" pendingLabel="Wylogowywanie…" variant="ghost" run={() => sim.logout()} />; }
  function publicPage(children: ReactNode) {
    return <><AccountNav brand={{ href:'#s04', label:'Mentio' }} navLabel="Konto" signedIn={s.cookie !== 'none'} signIn={{ href:'#s01', label:'Zaloguj się' }} signUp={{ href:'#s02', label:'Załóż konto' }} signOut={logout()} />{children}</>;
  }
  function panel(id: 's06' | 's07', children: ReactNode) {
    const items = [...(user?.roles.includes('mentor') ? [{href:'#s06',label:'Panel mentora'}] : []), ...(user?.roles.includes('admin') ? [{href:'#s07',label:'Panel operatora'}] : []), {href:'#s04',label:'Strona główna'}];
    return <PanelShell title="Mentio" homeHref="#s04" navLabel="Obszary konta" skipLabel="Przejdź do treści" currentHref={`#${id}`} items={items} actions={logout()}>{children}</PanelShell>;
  }
  function lostNotice() { return s.lostSession ? <Alert><AlertTitle>Twoja sesja zakończyła się. Zaloguj się ponownie, aby kontynuować.</AlertTitle><AlertDescription>Niewysłane dane nie zostały zachowane.</AlertDescription></Alert> : null; }
  function loading(label: string) { return <div className="flex flex-col gap-between-groups"><Skeleton className="prototype-skeleton" /><Skeleton className="prototype-skeleton" /><LoadingMessage label={label} /></div>; }
  function body(id: ScreenId) {
    if (id === 's04') return publicPage(<main className="prototype-public"><h1 className="mentio-public-title">Konto w Mentio</h1>
      <p>Mentio łączy osoby z konkretnym problemem programistycznym z doświadczonymi mentorami.</p>
      <p className="text-muted-foreground">To punkt powrotu przepływu kont. Strona główna nie jest przedmiotem tego projektu.</p>
      <div className="flex flex-wrap gap-between-groups"><Link href={s.cookie !== 'none' ? '#s03' : '#s02'} onClick={() => sim.setMentorRegistration(true)}>Zostań mentorem</Link></div>
      {s.handoff && <Alert><AlertTitle>Dalszy przepływ poza prototypem kont</AlertTitle><AlertDescription>Bezpieczny cel: {s.handoff}. Tu kończymy przekazanie; nie otwieramy rezerwacji ani płatności.</AlertDescription></Alert>}
    </main>);
    if (id === 's01') return publicPage(<AuthPanel title="Zaloguj się" description={message} footer={<div className="flex flex-col gap-between-groups"><Link href="#s02">Nie masz konta? Zarejestruj się</Link><Link href="#s12">Nie pamiętasz hasła?</Link></div>}>
      {lostNotice()}
      <CrudForm key={`login-${fill}-${s.formEpoch}`} schema={loginSchema} submitLabel="Zaloguj się" initialValues={fill && fillEpoch === s.formEpoch ? {email:fillEmail,password:DEMO_PASSWORD} : undefined}
        fields={[{name:'email',label:'Adres e-mail',type:'email',autoComplete:'off'}, {name:'password',label:'Hasło demo',type:'password',autoComplete:'off',description:`Wyłącznie przykładowe hasło: ${DEMO_PASSWORD}`}]}
        onSubmit={values => sim.login(values.email,values.password)} />
    </AuthPanel>);
    if (id === 's02') return publicPage(<AuthPanel title={s.mentorRegistration ? 'Załóż konto mentora' : 'Załóż konto'} description={message} footer={<div className="flex flex-col gap-between-groups"><p>Jeśli konto zostało już utworzone, zaloguj się ustawionym hasłem.</p><Link href="#s01">Masz już konto? Zaloguj się</Link></div>}>
      <p className="mentio-field-description">Nie potrzebujesz zaproszenia. Po rejestracji od razu przejdziesz dalej, bez weryfikacji e-maila.</p>
      {s.uncertain && <Alert><AlertTitle>Wynik operacji jest niepewny</AlertTitle><AlertDescription>{UNCERTAIN}</AlertDescription></Alert>}
      <CrudForm key={`register-${fill}-${s.mentorRegistration}-${s.formEpoch}`} schema={registerSchema} submitLabel="Załóż konto" initialValues={fill && fillEpoch === s.formEpoch ? {name:'Nowa osoba',email:'nowa@example.test',password:DEMO_PASSWORD} : undefined}
        fields={[{name:'name',label:'Imię i nazwisko',autoComplete:'off'}, {name:'email',label:'Adres e-mail',type:'email',autoComplete:'off'}, {name:'password',label:'Hasło demo',type:'password',autoComplete:'off',description:'Co najmniej 10 znaków, maksymalnie 72 bajty UTF-8. Polskie litery mogą zajmować 2 bajty, inne znaki więcej. Nie wpisuj prawdziwego hasła. W symulacji użyj MentioDemo!.'}]}
        onSubmit={values => sim.register(values)} />
    </AuthPanel>);
    if (id === 's03') return publicPage(<AuthPanel title="Zostań mentorem" description="Dodaj rolę mentora do swojego konta. Zachowasz też rolę mentee.">
      <p className="mentio-field-description">Symulacja. Bez zaproszenia, zgody operatora i tworzenia drugiego konta.</p>
      {user && <ActionButton key={`enroll-${s.formEpoch}`} label="Zostań mentorem" pendingLabel="Dołączanie…" run={() => sim.enroll()} />}
      <Link href="#s04">Przejdź do strony głównej</Link>
    </AuthPanel>);
    if (id === 's06') {
      if (!user?.roles.includes('mentor')) return <p className="p-panel">Zaloguj się na konto z rolą mentor, aby otworzyć ten obszar. Nawigacja sprawdzi dostęp.</p>;
      const read = s.mentorRead;
      const page = read === 'empty' ? undefined : read === 'draft' || read === 'published' ? read : user.page;
      return panel('s06', <div className="flex flex-col gap-section"><h1 className="mentio-public-title">Twoja strona mentora</h1>
        <p className="text-muted-foreground">Pierwsze wejście po zalogowaniu. Edycja i publikacja są poza zakresem prototypu kont.</p>
        {read === 'loading' ? loading('Ładowanie strony mentora…') : read === 'error' ? <><ErrorMessage title="Nie udało się pobrać strony" message="Spróbuj ponownie za chwilę." /><Button variant="outline" onClick={() => sim.setRead('s06','data')}>Spróbuj ponownie</Button></>
        : page ? <MentorPageStatus heading={user.name} statusLabel={page === 'published' ? 'Opublikowana' : 'Szkic'} statusTone={page === 'published' ? 'success' : 'neutral'} shareLabel="Fikcyjny adres strony" shareUrl={`https://example.test/mentorzy/${slugFor(user.name)}`} copyLabel="Kopiuj adres demo" copiedLabel="Skopiowano adres demo" copyFailedLabel="Nie udało się skopiować. Możesz zaznaczyć adres." action={<ActionButton label="Edytowanie poza prototypem" disabled disabledReason="Ten przepływ kończy się na pierwszym wejściu. Nie zapisujemy ani nie publikujemy strony." run={async () => success()} />} />
        : <><h2 className="mentio-public-heading">Zacznij swoją stronę</h2><p>Adres podpowiadamy na podstawie imienia i nazwiska.</p><fieldset disabled aria-label="Początek formularza strony — poza zakresem edycji" className="prototype-intro-form"><CrudForm schema={introSchema} initialValues={{displayName:user.name,slug:slugFor(user.name)}} fields={[{name:'displayName',label:'Nazwa wyświetlana'},{name:'slug',label:'Adres strony'}]} submitLabel="Zapis poza zakresem prototypu" onSubmit={async () => success()} /></fieldset><p className="mentio-field-description">Formularz pokazuje punkt przekazania do edytora. W tym prototypie jest nieaktywny.</p></>}
      </div>);
    }
    // DS-GAP: DS04 — proposed shared frame; no app migration.
    if (id === 's07') {
      if (!user?.roles.includes('admin')) return <p className="p-panel">Zaloguj się na konto operatora, aby otworzyć ten obszar. Nawigacja sprawdzi dostęp.</p>;
      return panel('s07', <div className="flex flex-col gap-section"><div><h1 className="mentio-public-title">Panel operatora</h1><p>Podstawowe informacje o Mentio</p></div>
        <p className="text-muted-foreground">Symulacja danych. Liczba wynika wyłącznie z fikcyjnych kont tego prototypu.</p>
        {s.adminRead === 'loading' ? loading('Ładowanie danych panelu…') : s.adminRead === 'error' ? <><ErrorMessage title="Błąd danych panelu" message="Nie udało się pobrać danych panelu. Spróbuj ponownie." /><Button variant="outline" onClick={() => sim.setRead('s07','data')}>Spróbuj ponownie</Button></> : <div className="grid gap-between-groups md:grid-cols-2"><Card><CardHeader><CardTitle>Użytkownicy</CardTitle></CardHeader><CardContent><p className="mentio-public-title tabular-nums">{s.adminRead === 'empty' ? 0 : s.accounts.length}</p></CardContent></Card><Card><CardHeader><CardTitle>Baza danych</CardTitle></CardHeader><CardContent><Badge variant="secondary">Połączono</Badge><p className="mentio-field-description">Wynik symulowany. Prototyp nie łączy się z bazą.</p></CardContent></Card></div>}
        <Link href="#s04">Przejdź do strony głównej</Link>
      </div>);
    }
    // DS-GAP: s12 composition, exactly the approved private-channel instruction.
    if (id === 's12') return publicPage(<main className="prototype-public"><h1 className="mentio-public-title">Nie pamiętasz hasła?</h1><p>Nie pamiętasz hasła? Skontaktuj się z operatorem przez prywatny kanał, którym kontaktowaliście się wcześniej. Bez wcześniej ustalonego kanału nie możemy przywrócić dostępu do konta.</p><p className="mentio-field-description">Prototyp nie wysyła wiadomości ani nie zmienia hasła.</p><Link href="#s01">Wróć do logowania</Link></main>);
    // DS-GAP: DS01 — same content for missing page and valid-session wrong role.
    if (id === 's08') return publicPage(<main className="prototype-public"><h1 className="mentio-public-title">Nie znaleziono strony</h1><p>Ta strona nie istnieje lub jest niedostępna.</p><div className="flex flex-wrap gap-between-groups"><Link href="#s04">Przejdź do strony głównej</Link><Button variant="outline" onClick={() => { if (history.length > 1) history.back(); else navigate('s04'); }}>Wróć do poprzedniej strony</Button></div></main>);
    // DS-GAP: DS02 — read-only retry. Uncertain writes are never replayed here.
    return publicPage(<main className="prototype-public"><h1 className="mentio-public-title">Nie udało się otworzyć strony</h1><ErrorMessage title="Strona jest chwilowo niedostępna" message="Spróbuj ponownie za chwilę. Możesz też wrócić do strony głównej." />{s.uncertain && <p>{UNCERTAIN}</p>}<div className="flex flex-wrap gap-between-groups"><Button variant="outline" onClick={() => navigate(s.retry)}>Spróbuj ponownie</Button><Link href="#s04">Przejdź do strony głównej</Link></div></main>);
  }
  function control(label: string, value: string, options: {value:string;label:string}[], change:(value:string)=>void) {
    const id = `${uid}-${label.replaceAll(' ','-')}`;
    return <div className="prototype-review-control"><Label htmlFor={id}>{label}</Label><Select value={value} onValueChange={change}><SelectTrigger id={id}><SelectValue /></SelectTrigger><SelectContent>{options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>;
  }
  return <>
    <div className="doc-toolbar" aria-label="Pasek przeglądu prototypu">
      <div className="prototype-review-heading"><Badge variant="outline">Prototyp</Badge><strong>Konta i role</strong><span className="mentio-field-description">Do przeglądu · 1.11.2026, 12:00 · Warszawa</span></div>
      <div className="prototype-tools">
        {control('Ekran',s.active,SCREENS.map(screen => ({value:screen.id,label:`${screen.id} · ${screen.title}`})),value => { if (isScreen(value)) navigate(value); })}
        {control('Dane do logowania',demoEmail,[{value:'guest',label:'Gość'},...s.accounts.map(account => ({value:account.email,label:account.name})),...(!s.accounts.some(account => account.email === 'nowa@example.test') ? [{value:'nowa@example.test',label:'Nowa osoba · rejestracja'}] : [])],setDemoEmail)}
        <Button variant="outline" size="sm" disabled={s.active !== 's01' && s.active !== 's02'} onClick={() => fillDemo()}>Wstaw dane demo</Button>
        <Button variant="ghost" size="sm" onClick={reset}>Reset demo</Button>
      </div>
      <p className="mentio-field-description">Wstawianie danych działa na s01/s02. „Back” po przejściu między ekranami. Sesja demo: {sim.currentAccount()?.name ?? 'brak ważnej sesji'} · {s.slot}; cookie: {s.cookie}.</p>
      <details className="prototype-map"><summary>Mapa ekranów i wariant rejestracji</summary><nav className="screen-nav" aria-label="Mapa ekranów">{SCREENS.map(screen => <Link key={screen.id} href={`#${screen.id}`}>{screen.id} · {screen.title}</Link>)}</nav><Button variant="outline" size="sm" disabled={s.pending === 'register'} onClick={() => { sim.setMentorRegistration(!s.mentorRegistration); if (s.active === 's02') navigate('s02'); }}>Rejestracja: {s.mentorRegistration ? 'mentor' : 'mentee'}</Button><p className="mentio-field-description">Wariant zmieniasz przed wysłaniem formularza. Podczas rejestracji przełącznik jest nieaktywny.</p></details>
      <details className="prototype-scenarios"><summary>Scenariusze · konta, sesje i błędy</summary><div className="prototype-scenario-content">
        <p className="mentio-field-description">Kontrolki przeglądu symulują warunki, nie są nawigacją produktu. „Uruchom stan” odtwarza fixtures i formularz; błędy ustawiane poniżej zachowują wpisane dane.</p>
        <div className="prototype-tools"><Button variant="outline" size="sm" onClick={() => { sim.selectAccount(demoEmail === 'guest' ? null : demoEmail); setFill(0); const current = sim.getSnapshot().active; navigate(sim.route(current,true)); }}>Przełącz konto</Button>
          {control('Niezależna sesja',s.slot,[{value:'A',label:'A'},{value:'B',label:'B'}],value => { sim.selectSlot(value as 'A'|'B'); setFill(0); navigate(sim.route(sim.getSnapshot().active,true)); })}
          {control('Warunek cookie',s.cookie,['none','valid','expired','forged','legacy','orphan'].map(value => ({value,label:({none:'Bez cookie',valid:'Prawidłowe',expired:'Wygasłe',forged:'Sfałszowane',legacy:'Stary format',orphan:'Bez sesji'} as Record<string,string>)[value]})),value => { sim.setCookie(value as Cookie); if (['s03','s06','s07'].includes(s.active)) navigate(sim.route(s.active,true)); else navigate(s.active); })}
        </div>
        <div className="prototype-tools">{control('Następne żądanie',s.next,[{value:'success',label:'Sukces'},{value:'offline',label:'Brak sieci'},{value:'server',label:'Błąd usługi 500'},{value:'credentials',label:'Logowanie · błędne dane'},{value:'conflict',label:'Rejestracja · zajęty adres'},{value:'lost-response',label:'Rejestracja · utracona odpowiedź po zapisie'},{value:'limit',label:'Limit prób 429'},{value:'expire-before',label:'Dołączenie · wygaśnięcie przed zapisem'},{value:'expire-after',label:'Dołączenie · wygaśnięcie po zapisie'},{value:'uncertain',label:'Niepewny wynik operacji'}],value => sim.setOutcome(value as Outcome))}
          <Button variant="outline" size="sm" aria-pressed={s.hold} onClick={() => sim.setHold(!s.hold)}>Wstrzymaj następne żądanie: {s.hold ? 'tak' : 'nie'}</Button><Button variant="outline" size="sm" disabled={!s.pending} onClick={() => sim.finishRequest()}>Dokończ żądanie</Button>
        </div><p className="mentio-field-description">„Dokończ żądanie” działa tylko podczas wysyłania. Wynik jest zużywany przez najbliższą akcję; wybieraj wariant opisany dla tej akcji.</p>
        <Label htmlFor={`${uid}-return`}>Cel powrotu (returnTo)</Label><Input id={`${uid}-return`} value={s.returnInput} placeholder="Brak celu — start według ról" onChange={event => sim.setReturnTo(event.target.value || null)} /><p className="mentio-field-description">{s.rejectedTarget ? 'Ten adres został odrzucony. Po logowaniu wrócisz do /.' : 'Pusty adres wybiera start według ról. Bezpieczny cel nie nadaje dostępu.'}</p>
        <div className="prototype-tools"><Button variant="outline" size="sm" onClick={() => { sim.setInfrastructure(!s.infrastructure); navigate(sim.route(s.active,true)); }}>Awaria weryfikacji sesji: {s.infrastructure ? 'tak' : 'nie'}</Button><Button variant="outline" size="sm" onClick={() => navigate(sim.route(s.active,true))}>Sprawdź dostęp ponownie</Button>
          <Button variant="outline" size="sm" onClick={() => sim.operator('grant')}>Nadaj mentor poza sesją</Button><Button variant="outline" size="sm" onClick={() => { sim.operator('remove'); if (['s03','s06','s07'].includes(s.active)) navigate(sim.route(s.active,true)); }}>Odbierz mentor</Button><Button variant="outline" size="sm" onClick={() => { sim.operator('reset'); if (['s03','s06','s07'].includes(s.active)) navigate(sim.route(s.active,true)); }}>Reset operatora</Button>
        </div>
        <div className="prototype-tools">{control('Odczyt mentora',s.mentorRead,[{value:'data',label:'Dane konta'},{value:'empty',label:'Brak strony'},{value:'draft',label:'Szkic'},{value:'published',label:'Opublikowana'},{value:'loading',label:'Ładowanie'},{value:'error',label:'Błąd odczytu'}],value => sim.setRead('s06',value as ReadState))}
          {control('Odczyt operatora',s.adminRead,[{value:'data',label:'Dane'},{value:'empty',label:'Zero użytkowników'},{value:'loading',label:'Ładowanie'},{value:'error',label:'Błąd danych'}],value => sim.setRead('s07',value as ReadState))}
          <Button variant="outline" size="sm" onClick={() => sim.lock('login',demoEmail)}>Limit logowania</Button><Button variant="outline" size="sm" onClick={() => sim.lock('register',demoEmail)}>Limit rejestracji</Button><Button variant="outline" size="sm" onClick={() => sim.clearLimits()}>Wyzeruj limity demo</Button>
        </div>
        <p className="mentio-field-description">Limity dla wybranych danych do logowania: {s.attempts[demoEmail]?.login ?? 0}/5, rejestracja {s.attempts[demoEmail]?.register ?? 0}/3. Sesja wygasa: {sim.currentSession()?.expires ?? 'brak'}. Role sesji: {sim.currentAccount()?.roles.join(', ') ?? 'brak'}; role konta: {s.accounts.find(account => account.email === s.email)?.roles.join(', ') ?? 'brak'}.</p>
        <div className="prototype-tools">{control('Stan z mapy',chosenState,STATES.map(state => ({value:state.id,label:`${state.id} · ${state.label}`})),value => setChosenState(value as StateId))}<Button variant="outline" size="sm" onClick={runState}>Uruchom stan</Button></div>
      </div></details>
      <Button id="theme-toggle" variant="outline" size="sm" aria-pressed={dark} onClick={() => setDark(value => !value)}>Motyw: {dark ? 'ciemny' : 'jasny'}</Button>
      <p className="mentio-field-description" role="status">{s.notice}</p><p className="mentio-field-description">{s.state[s.active]} · {labelForState(s.state[s.active])}</p>
      <p className="mentio-field-description">W trybie Comment: Alt+Enter przypina uwagę do elementu z focusem. Escape zamyka panel komentarzy.</p>
      <details><summary>Ostatnie przejścia stanów</summary><ol data-state-trace>{s.trace.slice(-12).map((state,index) => <li key={`${state}-${index}`}>{state} · {labelForState(state)}</li>)}</ol></details>
    </div>
    <div className="doc">{SCREENS.map(screen => <section className="screen" id={screen.id} key={screen.id} data-prototype-screen={screen.id} data-state={s.state[screen.id]}>
      <div className="screen-meta"><h2>{screen.id} · {screen.title}</h2><p>{screen.path} · {screen.stories} · {s.state[screen.id]}</p></div>
      <div className="frame"><div className="prototype-product" onSubmitCapture={event => productSubmit(event,screen.id)}>{body(screen.id)}</div></div>
      <div className="notes" aria-label={`Notatka przeglądu ${screen.id}`}><p className="note"><strong>{screen.stories}.</strong> Symulacja: {SCREEN_NOTES[screen.id].simulation} Poza rozstrzygnięciem: {SCREEN_NOTES[screen.id].unresolved}</p></div>
    </section>)}</div>
  </>;
}
createRoot(document.getElementById('root')!).render(<App />);
