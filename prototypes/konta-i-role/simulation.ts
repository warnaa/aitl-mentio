/** Deterministic, in-memory interaction model. No requests, real auth, secrets or timers of business state. */
import { ACCOUNTS, DEMO_NOW, DEMO_PASSWORD, SCREENS, startFor, type DemoAccount, type Role, type ScreenId } from './model.ts';
import type { StateId } from './states';

export type Slot = 'A' | 'B';
export type Outcome = 'success' | 'offline' | 'server' | 'credentials' | 'conflict' | 'lost-response' | 'limit' | 'expire-before' | 'expire-after' | 'uncertain';
export type Cookie = 'none' | 'valid' | 'expired' | 'forged' | 'legacy' | 'orphan';
export type RequestKind = 'login' | 'register' | 'enroll' | 'logout';
export type ReadState = 'data' | 'empty' | 'draft' | 'published' | 'loading' | 'error';
export interface RecordAccount extends DemoAccount { version: number }
export interface Session { id: string; roles: Role[]; version: number; revoked: boolean; expires: string }
export interface Snapshot {
  accounts: RecordAccount[]; sessions: Record<string, Record<Slot, Session>>;
  email: string | null; slot: Slot; cookie: Cookie; infrastructure: boolean;
  active: ScreenId; returnTo: string | null; returnInput: string; rejectedTarget: boolean; mentorRegistration: boolean;
  next: Outcome; hold: boolean; pending: RequestKind | null;
  mentorRead: ReadState; adminRead: ReadState; retry: ScreenId;
  formEpoch: number; lostSession: boolean; uncertain: boolean;
  notice: string; handoff: string | null; state: Record<ScreenId, StateId>; trace: StateId[];
  attempts: Record<string, { login: number; register: number }>;
}
export type Result = { ok: true; status: number; data: null } | { ok: false; status: number; error: { code: string; message: string; fieldErrors?: Record<string, string[]> } };
export const EXPIRES = '2026-11-02T10:00:00Z';
export const FRESH_EXPIRES = '2026-11-02T11:00:00Z';
export const EXPIRED = '2026-11-01T10:59:59Z';
const ok = (): Result => ({ ok: true, status: 200, data: null });
const fail = (status: number, code: string, message: string, fieldErrors?: Record<string, string[]>): Result => ({ ok: false, status, error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } });
const generic = 'Nie udało się wykonać operacji. Spróbuj ponownie.';
export const UNCERTAIN = 'Nie możemy potwierdzić wyniku operacji. Sprawdź jej stan przed ponowieniem.';
export function safeReturnTo(raw: string | null): boolean {
  if (raw === null) return false;
  let decoded = raw;
  try {
    // Inspect encoded origin tricks too, while preserving the original safe address for the handoff.
    for (let i = 0; i < 3; i++) {
      if (!decoded.startsWith('/') || decoded.startsWith('//') || /[\\\s\u0000-\u001f\u007f]/u.test(decoded) || decoded.length > 2048) return false;
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    return new URL(decoded, 'http://mentio.invalid').origin === 'http://mentio.invalid';
  } catch { return false; }
}
function sessionsFor(account: RecordAccount, expires = EXPIRES): Record<Slot, Session> {
  const make = (slot: Slot): Session => ({ id: `demo:${account.email}:${slot}`, roles: [...account.roles], version: account.version, revoked: false, expires });
  return { A: make('A'), B: make('B') };
}
function initial(): Snapshot {
  const accounts = structuredClone(ACCOUNTS).map(account => ({ ...account, version: 0 }));
  return {
    accounts, sessions: Object.fromEntries(accounts.filter(account => !account.passwordless).map(account => [account.email, sessionsFor(account)])),
    email: null, slot: 'A', cookie: 'none', infrastructure: false, active: 's04', returnTo: null, returnInput: '', rejectedTarget: false,
    mentorRegistration: false, next: 'success', hold: false, pending: null, mentorRead: 'data', adminRead: 'data', retry: 's04',
    formEpoch: 0, lostSession: false, uncertain: false, notice: 'Etap 2 · wybierz konto lub scenariusz w pasku przeglądu.', handoff: null,
    state: { s01:'s01.01',s02:'s02.01',s03:'s03.01',s04:'s04.01',s06:'s06.02',s07:'s07.01',s08:'s08.01',s11:'s11.01',s12:'s12.01' }, trace: ['s04.01'], attempts: {},
  };
}
export class Simulation {
  private value = initial();
  private listeners = new Set<() => void>();
  private generation = 0;
  private release: (() => void) | null = null;
  readonly getSnapshot = () => this.value;
  readonly subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(fn: (draft: Snapshot) => void) { const draft = structuredClone(this.value); fn(draft); this.value = draft; this.listeners.forEach(fn => fn()); }
  private stamp(draft: Snapshot, id: StateId) { const screen = id.split('.')[0] as ScreenId; draft.state[screen] = id; draft.trace = [...draft.trace, id].slice(-200); }
  mark(id: StateId) { this.update(draft => this.stamp(draft, id)); }
  notify(notice: string) { this.update(draft => { draft.notice = notice; }); }
  private cancelled() { this.generation++; this.release?.(); this.release = null; }
  reset() { this.cancelled(); const epoch = this.value.formEpoch + 1; this.value = initial(); this.value.formEpoch = epoch; this.listeners.forEach(fn => fn()); }
  currentSession(): Session | null { const s = this.value; return s.email ? s.sessions[s.email]?.[s.slot] ?? null : null; }
  currentAccount(): RecordAccount | null {
    const s = this.value, session = this.currentSession();
    const account = s.accounts.find(account => account.email === s.email);
    if (s.cookie !== 'valid' || !session || !account || session.revoked || session.version !== account.version || session.expires <= DEMO_NOW) return null;
    return { ...account, roles: [...session.roles] };
  }
  private destination(account: DemoAccount, consume = true): ScreenId {
    let destination: ScreenId;
    const s = this.value;
    if (s.rejectedTarget || (s.returnTo !== null && !safeReturnTo(s.returnTo))) destination = 's04';
    else if (s.returnTo) {
      const path = new URL(s.returnTo, 'http://mentio.invalid').pathname;
      destination = SCREENS.find(screen => screen.path === path)?.id ?? 's04';
      if (destination === 's03' && account.roles.includes('mentor')) destination = startFor(account);
      if (destination === 's04' && path !== '/') this.update(draft => { draft.handoff = s.returnTo; draft.notice = `Przekazanie do ${s.returnTo} — dalszy przepływ poza zakresem prototypu kont.`; });
    } else destination = startFor(account);
    if (consume) this.update(draft => { draft.returnTo = null; draft.returnInput = ''; draft.rejectedTarget = false; });
    return destination;
  }
  setReturnTo(raw: string | null) {
    this.update(draft => { draft.returnTo = safeReturnTo(raw) ? raw : null; draft.returnInput = raw ?? ''; draft.rejectedTarget = raw !== null && !safeReturnTo(raw); draft.handoff = null; draft.notice = draft.rejectedTarget ? 'Niebezpieczny adres powrotu odrzucony. Wynik logowania: /.' : `Cel powrotu: ${raw ?? 'brak — według ról'}`; });
  }
  setMentorRegistration(value: boolean) { this.update(draft => { draft.mentorRegistration = value; if (value) this.stamp(draft, 's02.12'); }); }
  setOutcome(next: Outcome) { this.update(draft => { draft.next = next; draft.notice = `Wynik następnego żądania: ${next}. Po użyciu wraca do sukcesu.`; }); }
  setHold(hold: boolean) { this.update(draft => { draft.hold = hold; }); }
  finishRequest() { this.release?.(); this.release = null; }
  setRead(screen: 's06' | 's07', mode: ReadState) { this.update(draft => { if (screen === 's06') draft.mentorRead = mode; else draft.adminRead = mode; this.stamp(draft, screen === 's06' ? mode === 'loading' ? 's06.03' : mode === 'error' ? 's06.04' : mode === 'empty' ? 's06.02' : 's06.01' : mode === 'loading' ? 's07.04' : mode === 'error' ? 's07.03' : mode === 'empty' ? 's07.02' : 's07.01'); }); }
  setInfrastructure(failed: boolean) { this.update(draft => { draft.infrastructure = failed; draft.notice = failed ? 'Awaria sprawdzania dostępu. Publiczna strona nadal działa; cookie nie zostało usunięte.' : 'Przywrócono odczyt sesji. Możesz ponowić otwarcie strony.'; if (draft.active === 's04' && failed) this.stamp(draft, 's04.07'); }); }
  selectAccount(email: string | null) {
    this.cancelled();
    this.update(draft => {
      draft.email = email; draft.slot = 'A'; draft.formEpoch++; draft.lostSession = false; draft.uncertain = false;
      const record = draft.accounts.find(account => account.email === email);
      draft.cookie = record ? record.passwordless ? 'legacy' : 'valid' : 'none';
      if (record && !record.passwordless && !draft.sessions[record.email]) draft.sessions[record.email] = sessionsFor(record);
      draft.pending = null; draft.notice = email ? `Wybrano zapisane konto demo: ${email}. Sesje nie zostały odnowione.` : 'Wybrano gościa.';
    });
  }
  selectSlot(slot: Slot) { this.cancelled(); this.update(draft => { draft.slot = slot; draft.cookie = draft.email ? 'valid' : 'none'; draft.formEpoch++; draft.pending = null; draft.notice = `Wybrano istniejącą sesję ${slot}, bez ponownego logowania.`; }); }
  setCookie(cookie: Cookie) {
    this.update(draft => { draft.cookie = cookie; if (cookie === 'expired' && draft.email && draft.sessions[draft.email]) draft.sessions[draft.email][draft.slot].expires = EXPIRED; draft.notice = `Warunek cookie: ${cookie}. To nie jest prawdziwy token.`; });
  }
  operator(action: 'grant' | 'remove' | 'reset') {
    this.update(draft => {
      const account = draft.accounts.find(account => account.email === draft.email);
      if (!account) { draft.notice = 'Najpierw wybierz istniejące konto demo.'; return; }
      if (action === 'grant') { if (!account.roles.includes('mentor')) account.roles.push('mentor'); draft.notice = 'Nadano rolę mentor w danych konta. Stare sesje zachowują poprzednie role do logowania lub dołączenia.'; }
      else if (action === 'reset' || account.roles.includes('mentor')) {
        if (action === 'remove') account.roles = account.roles.filter(role => role !== 'mentor');
        account.version++;
        for (const session of Object.values(draft.sessions[account.email] ?? {})) session.revoked = true;
        draft.notice = `${action === 'reset' ? 'Reset operatora' : 'Odebranie roli mentor'}: unieważniono sesje A i B. Hasło w prototypie pozostaje jawnym hasłem demo.`;
      } else draft.notice = 'Konto nie miało roli mentor. Niczego nie zmieniono ani nie unieważniono.';
    });
  }
  lock(kind: 'login' | 'register', email: string) { this.update(draft => { const key = email.trim().toLowerCase(); draft.attempts[key] ??= {login:0,register:0}; draft.attempts[key][kind] = kind === 'login' ? 5 : 3; draft.notice = `Zablokowano ${kind === 'login' ? 'logowanie do 12:15' : 'rejestrację do 13:00'} dla ${key}. Stały czas Warszawy.`; }); }
  clearLimits() { this.update(draft => { draft.attempts = {}; draft.notice = 'Wyzerowano wyłącznie liczniki symulacji. Zegar nie został przesunięty.'; }); }
  loseSession(returnScreen: ScreenId): ScreenId {
    this.update(draft => {
      if (!draft.returnTo && !draft.rejectedTarget) draft.returnTo = SCREENS.find(screen => screen.id === returnScreen)?.path ?? '/';
      draft.returnInput = draft.returnTo ?? '';
      draft.formEpoch++; draft.lostSession = true; this.stamp(draft, 's01.11');
    });
    return 's01';
  }
  route(id: ScreenId, duringWork = false): ScreenId {
    const s = this.value;
    const guarded = ['s03','s06','s07'].includes(id);
    const needsVerification = guarded || ((id === 's01' || id === 's02') && s.cookie !== 'none');
    let result = id;
    if (needsVerification && s.infrastructure && s.cookie !== 'none') {
      this.update(draft => { draft.retry = id; this.stamp(draft, 's11.01'); }); result = 's11';
    } else {
      const user = this.currentAccount();
      if (guarded && !user) {
        if (!s.returnTo && !s.rejectedTarget) this.setReturnTo(SCREENS.find(screen => screen.id === id)!.path);
        if (id === 's03') this.mark('s03.07');
        result = duringWork ? this.loseSession(id) : 's01';
      } else if ((id === 's06' && !user?.roles.includes('mentor')) || (id === 's07' && !user?.roles.includes('admin'))) {
        this.update(draft => { this.stamp(draft, 's08.01'); draft.notice = `Ta strona wymaga innej roli (${id === 's06' ? 'mentor' : 'admin'}). W produkcie pokazujemy wspólną 404.`; }); result = 's08';
      } else if (user && (id === 's01' || id === 's02')) {
        this.mark(id === 's01' ? 's01.10' : 's02.11');
        result = id === 's02' && s.mentorRegistration && !user.roles.includes('mentor') ? 's03' : this.destination(user);
      } else if (id === 's03' && user?.roles.includes('mentor')) { this.mark('s03.06'); result = this.destination(user); }
    }
    // A validated return target still needs its own role check; auth redirects never grant access.
    if (result !== id && (result === 's06' || result === 's07' || result === 's03')) return this.route(result, duringWork);
    this.update(draft => {
      draft.active = result;
      if (result === 's04') this.stamp(draft, draft.infrastructure ? 's04.07' : draft.cookie === 'none' ? 's04.01' : this.currentAccount() ? 's04.02' : 's04.03');
      else if (result === 's01' && draft.state.s01 === 's01.01') this.stamp(draft, 's01.01');
      else if (result === 's02' && draft.state.s02 === 's02.01') this.stamp(draft, 's02.01');
      else if (result === 's03') this.stamp(draft, 's03.01');
      else if (result === 's06') this.stamp(draft, draft.mentorRead === 'loading' ? 's06.03' : draft.mentorRead === 'error' ? 's06.04' : draft.mentorRead === 'empty' || (!this.currentAccount()?.page && draft.mentorRead === 'data') ? 's06.02' : 's06.01');
      else if (result === 's07') this.stamp(draft, draft.adminRead === 'loading' ? 's07.04' : draft.adminRead === 'error' ? 's07.03' : draft.adminRead === 'empty' ? 's07.02' : 's07.01');
      else if (result === 's12') this.stamp(draft, 's12.01');
      else if (result === 's08') this.stamp(draft, 's08.01');
      else if (result === 's11') this.stamp(draft, 's11.01');
    });
    return result;
  }
  private async begin(kind: RequestKind, email?: string): Promise<{ outcome: Outcome; generation: number } | null> {
    if (this.value.pending) return null;
    const outcome = this.value.next, generation = this.generation, hold = this.value.hold;
    this.update(draft => { draft.next = 'success'; draft.pending = kind; draft.hold = false; this.stamp(draft, kind === 'login' ? 's01.02' : kind === 'register' ? 's02.02' : kind === 'enroll' ? 's03.02' : 's04.04');
      if (email && (kind === 'login' || kind === 'register') && outcome !== 'offline') { draft.attempts[email] ??= {login:0,register:0}; if (outcome === 'limit') draft.attempts[email][kind] = kind === 'login' ? 5 : 3; }
    });
    await new Promise<void>(resolve => { this.release = resolve; if (!hold) setTimeout(() => { if (this.release === resolve) this.release = null; resolve(); }, 450); });
    if (generation !== this.generation) return null;
    this.release = null; this.update(draft => { draft.pending = null; });
    return { outcome, generation };
  }
  private admit(kind: 'login' | 'register', email: string): boolean {
    const count = this.value.attempts[email]?.[kind] ?? 0;
    if (count >= (kind === 'login' ? 5 : 3)) return false;
    this.update(draft => { draft.attempts[email] ??= {login:0,register:0}; draft.attempts[email][kind]++; }); return true;
  }
  private requestError(kind: RequestKind, outcome: Outcome): Result | null {
    const prefix = kind === 'login' ? 's01' : kind === 'register' ? 's02' : kind === 'enroll' ? 's03' : 's04';
    if (outcome === 'limit' && (kind === 'login' || kind === 'register')) { this.mark(`${prefix}.05` as StateId); return fail(429,'too_many_attempts',`Zbyt wiele prób. Spróbuj ponownie za ${kind === 'login' ? 15 : 60} minut.`); }
    if (outcome === 'offline' || outcome === 'server' || this.value.infrastructure || outcome === 'uncertain') {
      this.mark(`${prefix}.${kind === 'login' || kind === 'register' ? outcome === 'offline' ? '06' : '07' : kind === 'enroll' ? '03' : '05'}` as StateId);
      if (outcome === 'uncertain') this.update(draft => { draft.uncertain = true; });
      return fail(outcome === 'offline' ? 0 : 500, outcome === 'offline' ? 'network_error' : 'internal_error', outcome === 'uncertain' ? UNCERTAIN : outcome === 'offline' ? 'Brak połączenia. Sprawdź sieć i spróbuj ponownie.' : generic);
    }
    return null;
  }
  private authenticate(account: RecordAccount, replace = false) {
    this.update(draft => {
      draft.email = account.email; draft.cookie = 'valid'; draft.lostSession = false; draft.uncertain = false; draft.formEpoch++;
      const old = draft.sessions[account.email]?.[draft.slot];
      if (!draft.sessions[account.email]) draft.sessions[account.email] = sessionsFor(account,FRESH_EXPIRES);
      const fresh = sessionsFor(account,FRESH_EXPIRES)[draft.slot];
      draft.sessions[account.email][draft.slot] = replace && old ? { ...old, roles: [...account.roles], version: account.version } : { ...fresh, id: `${fresh.id}:${draft.trace.length}` };
    });
  }
  async login(email: string, password: string): Promise<Result> {
    if (this.value.pending) return fail(409,'busy','Poczekaj na zakończenie żądania.');
    email = email.trim().toLowerCase();
    const beforeVersion = this.value.accounts.find(account => account.email === email)?.version;
    if (this.value.next !== 'offline' && this.value.next !== 'limit' && !this.admit('login', email)) { this.mark('s01.05'); return fail(429,'too_many_attempts','Zbyt wiele prób. Spróbuj ponownie za 15 minut.'); }
    const request = await this.begin('login', email); if (!request) return fail(409,'cancelled','Scenariusz anulowany.');
    const error = this.requestError('login',request.outcome); if (error) return error;
    const account = this.value.accounts.find(account => account.email === email);
    if (!account || account.passwordless || password !== DEMO_PASSWORD || request.outcome === 'credentials' || account.version !== beforeVersion) { this.mark('s01.04'); return fail(401,'invalid_credentials','Nieprawidłowy e-mail lub hasło'); }
    this.mark(this.value.rejectedTarget ? 's01.09' : 's01.08');
    this.authenticate(account); this.route(this.destination(account)); return ok();
  }
  async register(values: {name:string;email:string;password:string}): Promise<Result> {
    if (this.value.pending) return fail(409,'busy','Poczekaj na zakończenie żądania.');
    const email = values.email.trim().toLowerCase();
    const asMentor = this.value.mentorRegistration;
    if (this.value.next !== 'offline' && this.value.next !== 'limit' && !this.admit('register', email)) { this.mark('s02.05'); return fail(429,'too_many_attempts','Zbyt wiele prób. Spróbuj ponownie za 60 minut.'); }
    const request = await this.begin('register',email); if (!request) return fail(409,'cancelled','Scenariusz anulowany.');
    const error = this.requestError('register',request.outcome); if (error) return error;
    if (this.value.accounts.some(account => account.email === email) || request.outcome === 'conflict') {
      this.mark('s02.04'); return fail(409,'email_taken','Jeśli konto zostało już utworzone, zaloguj się ustawionym hasłem.',{email:['Ten adres e-mail jest już zajęty']});
    }
    if (values.password !== DEMO_PASSWORD) return fail(400,'demo_only',`Symulacja nie zapisuje haseł. Użyj wyłącznie jawnego hasła demo: ${DEMO_PASSWORD}`);
    const account: RecordAccount = {name:values.name,email,roles:asMentor ? ['mentee','mentor'] : ['mentee'],version:0};
    this.update(draft => { draft.accounts.push(account); });
    if (request.outcome === 'lost-response') { this.update(draft => { draft.uncertain = true; this.stamp(draft,'s02.08'); }); return fail(0,'response_lost',`${UNCERTAIN} Jeśli konto zostało już utworzone, zaloguj się ustawionym hasłem.`); }
    this.mark(this.value.rejectedTarget ? 's02.10' : 's02.09');
    this.authenticate(account); this.route(this.destination(account)); return ok();
  }
  async enroll(): Promise<Result> {
    const before = this.currentSession();
    const email = this.value.email;
    const version = this.value.accounts.find(account => account.email === email)?.version;
    const request = await this.begin('enroll'); if (!request) return fail(409,'cancelled','Scenariusz anulowany.');
    const error = this.requestError('enroll',request.outcome); if (error) return error;
    const valid = this.currentAccount();
    if (request.outcome === 'expire-before' || !valid || valid.version !== version) {
      this.setCookie('expired'); this.mark('s03.05'); this.route(this.loseSession('s03')); return fail(401,'unauthorized','Sesja zakończyła się.');
    }
    this.update(draft => { const account = draft.accounts.find(account => account.email === email)!; if (!account.roles.includes('mentor')) account.roles.push('mentor'); });
    if (request.outcome === 'expire-after') { this.setCookie('expired'); this.mark('s03.05'); this.route(this.loseSession('s03')); return fail(401,'unauthorized','Sesja zakończyła się.'); }
    const account = this.value.accounts.find(account => account.email === email)!;
    if (!before || before.expires <= DEMO_NOW) { this.mark('s03.05'); this.route(this.loseSession('s03')); return fail(401,'unauthorized','Sesja zakończyła się.'); }
    this.authenticate(account,true); this.mark('s03.04'); this.route(this.destination(account)); return ok();
  }
  async logout(): Promise<Result> {
    const email = this.value.email, slot = this.value.slot, screen = this.value.active;
    const request = await this.begin('logout'); if (!request) return fail(409,'cancelled','Scenariusz anulowany.');
    const error = this.requestError('logout',request.outcome); if (error) return error;
    this.update(draft => { if (email && draft.sessions[email] && draft.cookie === 'valid') draft.sessions[email][slot].revoked = true; draft.cookie = 'none'; draft.formEpoch++; draft.lostSession = false; this.stamp(draft,'s04.06'); });
    if (['s03','s06','s07'].includes(screen)) this.route('s04');
    else this.update(draft => { draft.active = screen; });
    return ok();
  }
}
