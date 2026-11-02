'use strict';
(() => {
  const byId = (id) => document.getElementById(id);
  const screens = [...document.querySelectorAll('[data-screen]')];
  const steps = ['register', 'page', 'price', 'slots', 'review'];
  let state;
  let timer;
  let busy = false;
  let failNext = false;
  let emailTaken = false;
  let active = 'register';
  const say = (message) => { byId('announcement').textContent = message; };
  const testSay = (message) => { byId('test-status').textContent = message; };
  const money = (value) => `${new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 }).format(value)} zł`;
  const hasRate = () => state.rate !== null;

  function clearErrors(form) {
    form.querySelectorAll('.error, .form-error').forEach((p) => { p.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach((input) => input.removeAttribute('aria-invalid'));
  }
  function fieldErrors(form, errors) {
    Object.entries(errors).forEach(([id, message]) => {
      byId(`${id}-error`).textContent = message;
      byId(id).setAttribute('aria-invalid', 'true');
    });
    form.querySelector('.form-error').textContent = 'Sprawdź wskazane pola i spróbuj ponownie.';
    byId(Object.keys(errors)[0]).focus();
  }
  function node(tag, value, parent) {
    const el = document.createElement(tag);
    el.textContent = value;
    if (parent) parent.append(el);
    return el;
  }
  function link(value, destination, parent) {
    const el = node('a', value, parent);
    el.href = destination;
    return el;
  }
  function availabilityText() {
    if (!state.slot) return 'Nie masz terminów do rezerwacji. Możesz je dodać później.';
    if (!hasRate()) return 'Termin jest widoczny po publikacji, ale bez stawki nie można go zarezerwować.';
    return 'Masz stawkę i termin widoczny po publikacji. Rezerwacja jest poza tym prototypem.';
  }
  function pricePreview() {
    const raw = byId('rate').value;
    const rate = Number(raw);
    byId('price-preview').textContent = raw && Number.isInteger(rate) && rate >= 90 && rate <= 600
      ? `25 min — ${money(rate)} · 50 min — ${money(rate * 2)}. Po prowizji Mentio: ${money(rate * 0.8)} / ${money(rate * 1.6)}, przed ewentualnymi opłatami Stripe. W tej wersji nie ma prawdziwych zarobków.`
      : 'Wpisz stawkę od 90 do 600 zł w pełnych złotych, aby zobaczyć obie ceny.';
  }
  function render() {
    document.querySelector('nav').hidden = state.published;
    byId('account-name').textContent = state.name;
    byId('slot-status').textContent = state.slot ? 'Termin dodany do Twojej dostępności.' : 'Nie masz jeszcze dodanych terminów.';
    byId('toggle-slot').textContent = state.slot ? 'Usuń przykładowy termin' : 'Dodaj ten termin';
    byId('slot-eligibility').textContent = availabilityText();
    const summary = byId('review-summary');
    summary.replaceChildren();
    if (state.profile) {
      const dl = document.createElement('dl');
      [
        ['Nazwa', state.profile.name], ['Adres', `/mentorzy/${state.profile.slug}`],
        ['Opis', state.profile.description || 'Brak opisu — uzupełnij przed publikacją.'],
        ['Publiczna praca', state.profile.links.join('\n') || 'Brak linku — dodaj przed publikacją.'],
        ['Ceny', hasRate() ? `25 min — ${money(state.rate)}; 50 min — ${money(state.rate * 2)}` : 'Nie ustawiono stawki — rezerwacja niedostępna.'],
        ['Termin', state.slot ? '3 listopada 2026, 18:00, Warszawa' : 'Nie dodano terminu.']
      ].forEach(([key, value]) => { node('dt', key, dl); node('dd', value, dl); });
      summary.append(dl);
    }
    if (state.published) {
      byId('share-path').textContent = `/mentorzy/${state.profile.slug}`;
      byId('listing-result').textContent = state.listed ? 'Dołączyłeś do publicznej listy mentorów.' : 'Nie dołączyłeś do listy. Twoja strona jest dostępna przez link.';
      byId('readiness-result').textContent = availabilityText();
      byId('public-name').textContent = state.profile.name;
      byId('public-description').textContent = state.profile.description;
      byId('public-price').textContent = hasRate() ? `25 min — ${money(state.rate)} · 50 min — ${money(state.rate * 2)}` : 'Mentor nie ustalił jeszcze stawki — rezerwacja jest niedostępna.';
      byId('public-slot').textContent = state.slot ? '3 listopada 2026, 18:00 · czas polski' : 'Brak terminów do rezerwacji.';
      const links = byId('public-links');
      links.replaceChildren();
      state.profile.links.forEach((url) => {
        const li = document.createElement('li');
        const anchor = link(url, '#work-boundary', li);
        anchor.addEventListener('click', () => { byId('work-address').textContent = url; });
        links.append(li);
      });
      const directory = byId('directory-content');
      directory.replaceChildren();
      if (state.listed) {
        link(state.profile.name, '#public-preview', directory);
        node('p', state.profile.description.slice(0, 200), directory);
        node('p', hasRate() ? `25 min — ${money(state.rate)}` : 'Brak stawki', directory);
        node('p', hasRate() && state.slot ? 'Najbliższy termin: 3 listopada 2026, 18:00' : 'Brak terminów do rezerwacji', directory);
      } else node('p', 'Na liście nie ma jeszcze mentorów. Twoja strona pozostaje dostępna przez link.', directory);
    }
  }
  function route() {
    let requested = location.hash.slice(1) || 'register';
    const protectedScreens = ['account', 'page', 'price', 'slots', 'review'];
    const publicScreens = ['published', 'public-preview', 'directory', 'work-boundary'];
    if (requested === 'register' && state.account) requested = state.published ? 'published' : 'account';
    if (protectedScreens.includes(requested) && !state.account) { requested = 'register'; say('Najpierw załóż konto mentora w symulacji.'); }
    if (['price', 'slots', 'review'].includes(requested) && !state.profile) { requested = state.account ? 'page' : 'register'; say('Najpierw zapisz szkic swojej strony.'); }
    if (state.published && protectedScreens.includes(requested)) requested = 'published';
    if (publicScreens.includes(requested) && !state.published) requested = state.account ? 'page' : 'register';
    if (!screens.some((screen) => screen.id === requested)) requested = 'not-found';
    if (requested !== 'not-found' && location.hash !== `#${requested}`) history.replaceState(null, '', `#${requested}`);
    active = requested;
    render();
    screens.forEach((screen) => { screen.hidden = screen.id !== active; });
    document.querySelectorAll('nav a').forEach((anchor, index) => {
      const current = active === steps[index] || (index === 0 && active === 'account') || (index === 4 && publicScreens.includes(active));
      if (current) anchor.setAttribute('aria-current', 'step');
      else anchor.removeAttribute('aria-current');
    });
    byId('recover-link').href = state.published ? '#published' : state.account ? '#page' : '#register';
    byId(active).querySelector('h1').focus();
    document.title = `Mentio — ${byId(active).querySelector('h1').textContent}`;
  }
  function go(screen) {
    if (location.hash === `#${screen}`) route();
    else location.hash = screen;
  }
  function save(form, onSuccess) {
    busy = true;
    const button = form.querySelector('[type="submit"]');
    const original = button.textContent;
    button.setAttribute('aria-disabled', 'true');
    form.setAttribute('aria-busy', 'true');
    button.textContent = 'Zapisywanie…';
    form.querySelector('.form-error').textContent = 'Trwa zapisywanie w symulacji…';
    timer = setTimeout(() => {
      busy = false;
      button.textContent = original;
      button.removeAttribute('aria-disabled');
      form.removeAttribute('aria-busy');
      const feedback = form.querySelector('.form-error');
      if (failNext) {
        failNext = false;
        feedback.textContent = 'Nie udało się zapisać. Twoje dane pozostały w formularzu. Spróbuj ponownie tym samym przyciskiem.';
        testSay('Jednorazowy błąd został użyty. Następna próba może się powieść.');
        return;
      }
      feedback.textContent = '';
      onSuccess();
    }, 1000);
  }
  function normalizeSlug(name) {
    return name.toLowerCase().replaceAll('ł', 'l').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40).replace(/-$/g, '');
  }
  function reset(announce = true) {
    clearTimeout(timer);
    busy = false;
    failNext = false;
    emailTaken = false;
    state = { account: false, name: '', profile: null, rate: null, slot: false, listed: false, published: false };
    document.querySelectorAll('form').forEach((form) => { form.reset(); clearErrors(form); form.removeAttribute('aria-busy'); });
    const originals = { 'register-form': 'Załóż konto', 'page-form': 'Zapisz szkic i przejdź dalej', 'price-form': 'Zapisz stawkę i przejdź dalej', 'publish-form': 'Opublikuj stronę' };
    Object.entries(originals).forEach(([id, text]) => { const b = byId(id).querySelector('[type="submit"]'); b.textContent = text; b.removeAttribute('aria-disabled'); });
    ['public-name', 'public-description', 'public-price', 'public-slot', 'public-links', 'directory-content', 'share-path', 'listing-result', 'readiness-result', 'work-address'].forEach((id) => byId(id).replaceChildren());
    testSay('');
    pricePreview();
    if (announce) { history.replaceState(null, '', '#register'); say('Symulacja rozpoczęta od nowa. Dane, błędy i publikacja zostały usunięte.'); }
    route();
  }

  document.querySelectorAll('form').forEach((form) => {
    form.addEventListener('submit', (event) => { event.preventDefault(); });
    form.addEventListener('input', (event) => {
      if (busy) return;
      const input = event.target;
      if (byId(`${input.id}-error`)) byId(`${input.id}-error`).textContent = '';
      input.removeAttribute('aria-invalid');
      form.querySelector('.form-error').textContent = '';
    });
  });
  byId('register-form').addEventListener('submit', () => {
    if (busy || state.account) return;
    const form = byId('register-form'); clearErrors(form);
    const name = byId('name').value.trim();
    const email = byId('email').value.trim();
    const password = byId('password').value;
    const errors = {};
    if (!name || name.length > 80) errors.name = 'Wpisz imię i nazwisko, od 1 do 80 znaków.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) errors.email = 'Wpisz poprawny przykładowy adres e-mail.';
    if (Array.from(password).length < 10 || new TextEncoder().encode(password).length > 72) errors.password = 'Hasło musi mieć co najmniej 10 znaków i najwyżej 72 bajty UTF-8.';
    if (Object.keys(errors).length) return fieldErrors(form, errors);
    if (emailTaken) {
      emailTaken = false;
      testSay('Jednorazowy stan zajętego adresu został użyty. To fikcyjne dane.');
      return fieldErrors(form, { email: 'Ten adres e-mail jest już zajęty. Jeśli konto zostało już utworzone, zaloguj się ustawionym hasłem.' });
    }
    save(form, () => {
      state.account = true; state.name = name;
      byId('display-name').value = name;
      byId('slug').value = normalizeSlug(name);
      byId('password').value = ''; byId('email').value = '';
      say('Konto mentora utworzone w symulacji. Przygotuj swój szkic.'); go('page');
    });
  });
  byId('page-form').addEventListener('submit', () => {
    if (busy || state.published) return;
    const form = byId('page-form'); clearErrors(form);
    const name = byId('display-name').value.trim();
    const slug = byId('slug').value.trim();
    const description = byId('description').value.trim();
    const rows = byId('work-links').value.split('\n');
    const links = rows.map((s) => s.trim()).filter(Boolean);
    const errors = {};
    if (!name || name.length > 80) errors['display-name'] = 'Wpisz nazwę od 1 do 80 znaków.';
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 40) errors.slug = 'Użyj od 3 do 40 małych liter, cyfr i pojedynczych myślników.';
    if (slug === 'zajety') errors.slug = 'Ten adres jest już zajęty. Wybierz inny.';
    if (description.length > 2000) errors.description = 'Skróć opis do 2000 znaków.';
    const invalid = [];
    rows.forEach((row, index) => {
      if (!row.trim()) return;
      try { const url = new URL(row.trim()); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) invalid.push(index + 1); }
      catch { invalid.push(index + 1); }
    });
    if (invalid.length) errors['work-links'] = `Wiersze ${invalid.join(', ')}: wpisz pełny adres http lub https, bez danych logowania.`;
    else if (links.length > 10) errors['work-links'] = 'Dodaj najwyżej 10 linków.';
    if (Object.keys(errors).length) return fieldErrors(form, errors);
    save(form, () => { state.profile = { name, slug, description, links }; say('Szkic zapisany w symulacji.'); go('price'); });
  });
  byId('price-form').addEventListener('submit', () => {
    if (busy || state.published) return;
    const form = byId('price-form'); clearErrors(form);
    const rate = Number(byId('rate').value);
    if (!Number.isInteger(rate) || rate < 90 || rate > 600) return fieldErrors(form, { rate: 'Stawka musi wynosić od 90 zł do 600 zł w pełnych złotych.' });
    save(form, () => { state.rate = rate; say('Stawka zapisana w symulacji.'); go('slots'); });
  });
  byId('rate').addEventListener('input', pricePreview);
  byId('skip-rate').addEventListener('click', () => { if (busy) return; state.rate = null; byId('rate').value = ''; clearErrors(byId('price-form')); pricePreview(); say('Stawka pominięta. Rezerwacja będzie niedostępna.'); go('slots'); });
  byId('toggle-slot').addEventListener('click', () => { state.slot = !state.slot; render(); say(state.slot ? 'Przykładowy termin dodany.' : 'Przykładowy termin usunięty.'); });
  byId('publish-form').addEventListener('submit', () => {
    if (busy || state.published) return;
    const form = byId('publish-form'); clearErrors(form);
    const errors = {};
    if (state.profile.description.length < 50) errors.description = 'Przed publikacją napisz co najmniej 50 znaków o swoim doświadczeniu.';
    if (!state.profile.links.length) errors['work-links'] = 'Dodaj co najmniej jeden link do swojej publicznej pracy.';
    if (Object.keys(errors).length) {
      history.replaceState(null, '', '#page'); route();
      fieldErrors(byId('page-form'), errors); say('Strona nie została opublikowana. Uzupełnij wskazane pola i zapisz szkic.'); return;
    }
    const listed = byId('listed').checked;
    save(form, () => { state.listed = listed; state.published = true; say('Strona opublikowana wyłącznie w symulacji.'); go('published'); });
  });
  byId('sample').addEventListener('click', () => {
    if (busy) return;
    if (active === 'register') {
      byId('name').value = 'Alicja Przykładowa'; byId('email').value = 'alicja@example.invalid'; byId('password').value = 'tylko-prototyp-2026'; clearErrors(byId('register-form'));
    } else if (active === 'page') {
      byId('display-name').value = 'Alicja Przykładowa'; byId('slug').value = 'alicja-przykladowa';
      byId('description').value = 'Tworzę aplikacje w TypeScript i React. Pomagam przeanalizować konkretny błąd, zaplanować migrację i zrozumieć decyzje w kodzie.';
      byId('work-links').value = 'https://example.invalid/alicja/projekt'; clearErrors(byId('page-form'));
    } else if (active === 'price') { byId('rate').value = '150'; clearErrors(byId('price-form')); pricePreview(); }
    else { testSay('Dane przykładowe możesz wstawić na ekranie konta, strony lub stawki.'); return; }
    testSay('Wstawiono fikcyjne dane. Sprawdź formularz i zapisz go, aby przejść dalej.');
  });
  byId('fail-next').addEventListener('click', () => { failNext = true; testSay('Następny poprawny zapis zakończy się jednorazowym błędem. Potem możesz ponowić próbę.'); });
  byId('taken-email').addEventListener('click', () => { emailTaken = true; testSay('Następna poprawna rejestracja pokaże zajęty adres. Stan nie tworzy konta.'); });
  byId('deny-access').addEventListener('click', () => { if (busy) return; go('denied'); });
  byId('restore-access').addEventListener('click', () => { go(state.published ? 'published' : state.account ? 'page' : 'register'); });
  byId('reset').addEventListener('click', () => reset());
  document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a');
    if (!anchor) return;
    if (busy) { event.preventDefault(); say('Poczekaj na zakończenie zapisu lub zacznij od nowa.'); }
    else if (anchor.hash === '#main') { event.preventDefault(); byId('main').focus(); }
  });
  window.addEventListener('hashchange', route);
  reset(false);
  window.addEventListener('load', () => { setTimeout(route, 0); }, { once: true });
})();
