/*
 * Eiddie website: interactions and scroll animations.
 * Everything here is progressive enhancement: without GSAP / Lenis (CDN blocked)
 * the page stays fully readable and every button still works.
 */
(() => {
  'use strict';

  const C = window.EIDDIE_CONFIG || {};
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  const anim = !!(gsap && ST) && !reduced;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };

  if (gsap && ST) gsap.registerPlugin(ST);
  if (anim) root.classList.add('js-anim');

  /* ------------------------------------------------------------------ */
  /* Strings used from JS                                                */
  /* ------------------------------------------------------------------ */
  const T = {
    cs: {
      // Visitors see these; hints for the site owner go to the browser console (see ownerHint).
      checkoutMissing: 'Prodej ještě nezačal. Zatím si můžeš Eiddie stáhnout a&nbsp;vyzkoušet zdarma.',
      checkoutThanks: 'Děkuju za nákup! Za chvíli tě přesměruju…',
      copied: 'E-mailová adresa je zkopírovaná do schránky.',
      todo: 'Tuhle stránku právě připravuju.',
      installerMissing: 'Instalátor teď není k&nbsp;dispozici. Zkus to prosím za chvíli, nebo mi napiš.',
      formInvalid: 'Vyplň prosím jméno, platný e-mail a zprávu.',
      formSending: 'Odesílám…',
      formOk: 'Díky! Zpráva je na cestě, ozvu se co nejdřív.',
      formErr: 'Něco se pokazilo. Napiš mi prosím rovnou na e-mail.',
      formMailto: 'Otevírám tvůj e-mailový program…',
      videoError: 'Video se nepodařilo načíst. Zkus to prosím později.',
      // Discount code (koupit.html?code=…): text around the code, which is inserted as text, never as HTML
      discount: ['Slevový kód ', ' se použije v pokladně.'],
      discountPilot: ['Slevový kód ', ' si schovej. Použiješ ho v pokladně, až prodej začne.'],
      discountRemove: 'Nepoužít',
      discountRemoved: 'Slevový kód se nepoužije.',
      codeCopy: 'Zkopírovat',
      codeCopied: 'Slevový kód je zkopírovaný do schránky.',
      years: { 1: '1 rok', 3: '3 roky', 5: '5 let' },
      subFor: (y) => `Předplatné za ${y}`,
      save: 'Ušetříš',
      payback: 'Eiddie se ti zaplatí za',
      months: (n) => `${n} ${n === 1 ? 'měsíc' : n < 5 ? 'měsíce' : 'měsíců'}`,
      currency: (n) => `${n.toLocaleString('cs-CZ')} Kč`,
      locale: 'cs-CZ',
    },
    en: {
      checkoutMissing: 'Sales haven’t started yet. For now you can download Eiddie and try it for free.',
      checkoutThanks: 'Thank you for your purchase! Redirecting you in a moment…',
      copied: 'E-mail address copied to the clipboard.',
      todo: 'I’m still preparing this page.',
      installerMissing: 'The installer isn’t available right now. Please try again in a moment, or write to me.',
      formInvalid: 'Please fill in your name, a valid e-mail and a message.',
      formSending: 'Sending…',
      formOk: 'Thanks! Your message is on its way, I’ll reply soon.',
      formErr: 'Something went wrong. Please e-mail me directly.',
      formMailto: 'Opening your e-mail app…',
      videoError: 'The video couldn’t be loaded. Please try again later.',
      discount: ['Discount code ', ' will be applied at checkout.'],
      discountPilot: ['Keep your discount code ', '. You’ll use it at checkout once sales start.'],
      discountRemove: 'Don’t use',
      discountRemoved: 'The discount code won’t be used.',
      codeCopy: 'Copy',
      codeCopied: 'Discount code copied to the clipboard.',
      years: { 1: '1 year', 3: '3 years', 5: '5 years' },
      subFor: (y) => `Subscriptions over ${y}`,
      save: 'You save',
      payback: 'Eiddie pays for itself in',
      months: (n) => `${n} month${n === 1 ? '' : 's'}`,
      currency: (n) => `${n.toLocaleString('en-US')} CZK`,
      locale: 'en-US',
    },
  };
  let lang = root.dataset.lang === 'en' ? 'en' : 'cs';
  try { if (new URLSearchParams(location.search).has('lang')) store.set('eiddie-lang', lang); } catch (e) { /* old browser */ }
  const t = (k) => T[lang][k];

  /* ------------------------------------------------------------------ */
  /* Marquees: duplicate content for a seamless loop (before i18n cache) */
  /* ------------------------------------------------------------------ */
  $$('[data-marquee]').forEach((track) => {
    Array.from(track.children).forEach((child) => {
      const clone = child.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
  });

  /* ------------------------------------------------------------------ */
  /* i18n: Czech lives in the HTML, English in data-en attributes        */
  /* ------------------------------------------------------------------ */
  const ATTRS = ['placeholder', 'aria-label', 'content', 'title', 'alt'];
  const cache = new Map();
  $$('[data-en]').forEach((el) => cache.set(el, { html: el.innerHTML }));
  ATTRS.forEach((a) => $$(`[data-en-${a}]`).forEach((el) => {
    const c = cache.get(el) || {};
    c[a] = el.getAttribute(a);
    cache.set(el, c);
  }));
  const langHooks = [];

  function applyLang() {
    cache.forEach((c, el) => {
      if ('html' in c) el.innerHTML = lang === 'en' ? el.getAttribute('data-en') : c.html;
      ATTRS.forEach((a) => { if (a in c) el.setAttribute(a, lang === 'en' ? el.getAttribute(`data-en-${a}`) : c[a]); });
    });
    root.lang = lang;
    root.dataset.lang = lang;
    $$('[data-lang-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.langBtn === lang)));
    fillConfig();
    langHooks.forEach((fn) => fn());
    root.classList.remove('i18n-pending');
  }

  function setLang(next) {
    if (next === lang) return;
    lang = next;
    store.set('eiddie-lang', lang);
    applyLang();
    if (ST) requestAnimationFrame(() => ST.refresh());
  }
  $$('[data-lang-btn]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.langBtn)));

  /* Values from config.js */
  function fillConfig() {
    const pick = (v) => (v && typeof v === 'object' ? v[lang] : v);
    $$('[data-cfg]').forEach((el) => {
      const key = el.dataset.cfg;
      const v = pick(C[key]);
      if (v == null) return;
      el.textContent = v;
      if (key === 'email' && el.tagName === 'A') el.href = `mailto:${v}`;
    });
    // "What's new in version X" (download page) → that version's section of novinky.html, also after the GitHub API answered;
    // the top of the page when the API failed (no version known then, see versionUnknown()).
    $$('[data-cfg-news]').forEach((a) => {
      if (root.dataset.version === 'unknown') a.href = 'novinky.html';
      else if (C.version) a.href = `novinky.html#v${String(C.version).replace(/\./g, '-')}`;
    });
    // Mail templates. The tester reads the installed version in the app: Settings → Updates.
    const mails = {
      cs: {
        feedback: ['Eiddie pilot: zpětná vazba', 'Ahoj,\n\nco mě potěšilo:\n\n\nco drhne nebo nefunguje:\n\n\nco mi chybí:\n\n\nverze Eiddie (Nastavení → Updates): \nWindows 10, nebo 11: \n'],
        bug: ['Eiddie: chyba', 'Co se stalo:\n\n\nJak se k tomu dostat:\n\n\n(Snímek obrazovky pomůže nejvíc.)\nverze Eiddie (Nastavení → Updates): \nWindows 10, nebo 11: \n'],
        team: ['Eiddie: licence pro tým', ''],
        // the same subject as the app's "Klíč mi nepřišel" button, so these e-mails land together
        testerKey: ['Eiddie: klíč pro testery', ''],
      },
      en: {
        feedback: ['Eiddie pilot: feedback', 'Hi,\n\nwhat I liked:\n\n\nwhat got in my way or didn’t work:\n\n\nwhat I’m missing:\n\n\nEiddie version (Settings → Updates): \nWindows 10 or 11: \n'],
        bug: ['Eiddie: bug report', 'What happened:\n\n\nHow to get there:\n\n\n(A screenshot helps the most.)\nEiddie version (Settings → Updates): \nWindows 10 or 11: \n'],
        team: ['Eiddie: team licence', ''],
        testerKey: ['Eiddie: tester key', ''],
      },
    }[lang];
    $$('[data-cfg-mail]').forEach((el) => {
      if (!C.email) return;
      const [subject, body] = mails[el.dataset.cfgMail] || ['Eiddie', ''];
      el.href = `mailto:${C.email}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ''}`;
    });
  }

  /* ------------------------------------------------------------------ */
  /* Toast                                                               */
  /* ------------------------------------------------------------------ */
  const toastEl = $('[data-toast]');
  let toastTimer;
  function toast(html, ms = 4200) {
    if (!toastEl) return;
    $('[data-toast-text]', toastEl).innerHTML = html;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), ms);
  }

  /* ------------------------------------------------------------------ */
  /* Smooth scrolling (Lenis) + anchors                                  */
  /* ------------------------------------------------------------------ */
  let lenis = null;
  if (window.Lenis && !reduced) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
    if (gsap && ST) {
      lenis.on('scroll', ST.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  function scrollToY(y) {
    if (lenis) lenis.scrollTo(y, { duration: 1.2 });
    else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }
  function scrollToEl(el) {
    if (lenis) lenis.scrollTo(el, { duration: 1.3 }); // Lenis applies html scroll-padding-top (nav height)
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-buy') || a.hasAttribute('data-todo')) return;
    const id = a.getAttribute('href');
    if (id === '#') return;
    const target = id === '#top' ? document.body : $(id);
    if (!target) return;
    e.preventDefault();
    closeDrawer();
    if (id === '#top') scrollToY(0); else scrollToEl(target);
    history.replaceState(null, '', id === '#top' ? location.pathname + location.search : id);
  });
  // What's new page: a link to an older version (novinky.html#v0-1-1) opens its collapsed entry.
  function openLinkedRelease() {
    const el = location.hash.length > 1 ? document.getElementById(location.hash.slice(1)) : null;
    const fold = el && el.classList.contains('release') ? $('details', el) : null;
    if (fold) fold.open = true;
  }
  openLinkedRelease();
  addEventListener('hashchange', openLinkedRelease);

  /* ------------------------------------------------------------------ */
  /* Nav, drawer, progress bar                                           */
  /* ------------------------------------------------------------------ */
  const nav = $('[data-nav]');
  const progress = $('.progress');
  const burger = $('[data-burger]');
  const drawer = $('[data-drawer]');
  function onScroll() {
    const y = window.scrollY;
    if (nav) nav.classList.toggle('is-scrolled', y > 12);
    if (progress && !anim) {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
    }
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  function closeDrawer() {
    if (!drawer || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    lenis && lenis.start();
  }
  if (burger && drawer) {
    burger.addEventListener('click', () => {
      const open = !drawer.classList.contains('is-open');
      drawer.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      if (lenis) open ? lenis.stop() : lenis.start();
    });
    drawer.addEventListener('click', (e) => { if (e.target.closest('a')) closeDrawer(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
  }

  /* ------------------------------------------------------------------ */
  /* Discount code: koupit.html?code=EIDDIE50K7Q2MX (or ?sleva=)         */
  /* ------------------------------------------------------------------ */
  // The app's "Buy with this code" and shared giveaway links bring a code in the URL, and anyone can craft that URL:
  // uppercase it, keep it only if it is 3–64 letters/digits, show it with textContent only and hand it to the checkout
  // through URLSearchParams. Remembered for this tab (sessionStorage), so the Buy buttons on every page use it.
  // The website never checks whether a code exists: the checkout (Lemon Squeezy) does.
  const session = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { if (v) sessionStorage.setItem(k, v); else sessionStorage.removeItem(k); } catch (e) { /* storage blocked */ } },
  };
  const cleanCode = (v) => {
    const code = typeof v === 'string' ? v.trim().toUpperCase() : '';
    return /^[A-Z0-9]{3,64}$/.test(code) ? code : null;
  };
  let discountCode = null;
  {
    let fromUrl = null;
    try { const q = new URLSearchParams(location.search); fromUrl = q.get('code') ?? q.get('sleva'); } catch (e) { /* old browser */ }
    // The thank-you page forgets it: a single-use code must not ride along to the next purchase in this tab.
    discountCode = $('[data-clear-code]') ? null : cleanCode(fromUrl) || cleanCode(session.get('eiddie-code'));
    session.set('eiddie-code', discountCode);
  }
  function renderDiscount() {
    $$('[data-discount]').forEach((el) => {
      el.hidden = !discountCode;
      if (!discountCode) return;
      const pilotCopy = el.dataset.discount === 'pilot';
      const [before, after] = t(pilotCopy ? 'discountPilot' : 'discount');
      const code = document.createElement('b');
      code.textContent = discountCode;
      $('[data-discount-text]', el).replaceChildren(before, code, after);
      $('[data-discount-btn]', el).textContent = t(pilotCopy ? 'codeCopy' : 'discountRemove');
    });
  }
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-discount-btn]');
    if (!btn || !discountCode) return;
    if (btn.closest('[data-discount]').dataset.discount === 'pilot') {
      // Sales haven't started: the visitor keeps the code. Without clipboard access, select it for Ctrl+C.
      const code = $('[data-discount-text] b', btn.parentElement);
      Promise.resolve().then(() => navigator.clipboard.writeText(discountCode)).then(() => toast(t('codeCopied'))).catch(() => {
        const r = document.createRange();
        r.selectNodeContents(code);
        getSelection().removeAllRanges();
        getSelection().addRange(r);
      });
      return;
    }
    discountCode = null;
    session.set('eiddie-code', null);
    try {
      // A reload must not bring the code back from the address bar.
      const u = new URL(location.href);
      u.searchParams.delete('code');
      u.searchParams.delete('sleva');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (err) { /* old browser */ }
    renderDiscount();
    toast(t('discountRemoved'));
  });
  langHooks.push(renderDiscount);

  /* ------------------------------------------------------------------ */
  /* Checkout (Lemon Squeezy overlay)                                    */
  /* ------------------------------------------------------------------ */
  const checkoutUrl = C.checkoutUrl || '';
  const checkoutReady = /^https:\/\//.test(checkoutUrl) && !/YOUR-STORE|YOUR-VARIANT/.test(checkoutUrl);
  let lemonLoading = null;
  let purchased = false;
  function loadLemon() {
    if (window.LemonSqueezy) return Promise.resolve();
    if (lemonLoading) return lemonLoading;
    lemonLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://assets.lemonsqueezy.com/lemon.js';
      s.async = true;
      s.onload = () => { window.createLemonSqueezy && window.createLemonSqueezy(); setupLemon(); resolve(); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return lemonLoading;
  }
  function setupLemon() {
    if (!window.LemonSqueezy) return;
    window.LemonSqueezy.Setup({
      eventHandler: (data) => {
        if (data && data.event === 'Checkout.Success') {
          purchased = true;
          toast(t('checkoutThanks'));
          setTimeout(() => { location.href = 'thanks.html'; }, 4000);
        }
        if (data === 'close' && purchased) location.href = 'thanks.html';
      },
    });
  }
  if (checkoutReady) {
    // Warm up the script when the browser is idle so the overlay opens instantly. (requestIdleCallback takes an options
    // object, not a delay: requestIdleCallback(fn, 2500) throws in Chrome and stopped this whole script once a real
    // checkoutUrl was set.)
    const warm = () => loadLemon().catch(() => {});
    setTimeout(() => (window.requestIdleCallback ? window.requestIdleCallback(warm, { timeout: 3000 }) : warm()), 2500);
  }
  /** The checkout link: the overlay keeps embed=1, the plain page fallback drops it; plus the remembered discount code. */
  function checkoutHref(embed) {
    try {
      const u = new URL(checkoutUrl);
      if (!embed) u.searchParams.delete('embed');
      if (discountCode) u.searchParams.set('checkout[discount_code]', discountCode); // Lemon Squeezy's prefill
      return u.href;
    } catch (e) {
      return checkoutUrl;
    }
  }
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-buy]');
    if (!btn) return;
    e.preventDefault();
    if (!checkoutReady) {
      console.warn('[Eiddie] Checkout not connected: set checkoutUrl in assets/js/config.js.');
      toast(t('checkoutMissing'), 6500);
      return;
    }
    loadLemon()
      .then(() => window.LemonSqueezy.Url.Open(checkoutHref(true)))
      .catch(() => { location.href = checkoutHref(false); });
  });
  $$('[data-todo]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); toast(t('todo')); }));

  /* Trial: either a direct installer link (download page) or a free Lemon Squeezy product */
  const trialUrl = C.trialUrl || '';
  const trialViaLemon = /lemonsqueezy\.com\/(buy|checkout)\//.test(trialUrl);
  if (trialViaLemon) {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-trial]');
      if (!btn) return;
      e.preventDefault();
      loadLemon().then(() => window.LemonSqueezy.Url.Open(trialUrl)).catch(() => { location.href = trialUrl; });
    });
  }
  const fileLinks = $$('[data-trial-file]');
  fileLinks.forEach((a) => { if (trialUrl && !trialViaLemon) a.href = trialUrl; });

  /* Download page: check the installer exists, then download it automatically (Windows only, once per tab) */
  const auto = $('[data-autodownload]');
  if (auto && trialUrl && !trialViaLemon) {
    const start = () => {
      const a = document.createElement('a');
      a.href = trialUrl;
      a.download = '';
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
    const missing = () => {
      console.warn('[Eiddie] Installer not found at trialUrl (' + trialUrl + '): publish the release/file or fix trialUrl in assets/js/config.js.');
      toast(t('installerMissing'), 8000);
      fileLinks.forEach((a) => { a.removeAttribute('href'); a.setAttribute('aria-disabled', 'true'); a.classList.add('is-disabled'); });
    };
    // A GitHub "latest release" link is checked through the GitHub API (CORS-enabled): without a release the
    // download would navigate away to GitHub's 404 page. The answer also brings the real version and size.
    // Rate limits (60 requests/hour per IP) or network errors never block the download: fail open. The page then says
    // "the latest version" instead of the fallback number from config.js, which may name an older release.
    const versionUnknown = () => { root.dataset.version = 'unknown'; fillConfig(); };
    const gh = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/latest\/download\/([^/?#]+)$/.exec(trialUrl);
    const check = () => {
      if (gh) {
        return fetch(`https://api.github.com/repos/${gh[1]}/${gh[2]}/releases/latest`)
          .then((r) => {
            if (r.status === 404) return false;
            if (!r.ok) { versionUnknown(); return true; }
            return r.json().then((rel) => {
              const asset = (rel.assets || []).find((x) => x.name === decodeURIComponent(gh[3]) && x.state === 'uploaded');
              if (!asset) return false;
              if (rel.tag_name) C.version = rel.tag_name.replace(/^v/i, '');
              if (asset.size) C.installerSize = `≈ ${Math.round(asset.size / 1048576)} MB`;
              fillConfig();
              return true;
            });
          })
          .catch(() => { versionUnknown(); return true; });
      }
      if (new URL(trialUrl, location.href).origin !== location.origin) return Promise.resolve(true);
      return fetch(trialUrl, { method: 'HEAD' }).then((r) => r.ok).catch(() => true);
    };
    check().then((ok) => {
      if (!ok) { missing(); return; }
      // Phones and Macs get the "Windows only" copy (download.html head script sets data-platform) and no 95 MB .exe.
      if (root.dataset.platform !== 'windows') return;
      // Once per tab: a reload or Back must not save a second copy as "Eiddie-Setup (1).exe".
      try {
        if (Number(sessionStorage.getItem('eiddie-dl')) > Date.now() - 10 * 60 * 1000) return;
        sessionStorage.setItem('eiddie-dl', String(Date.now()));
      } catch (e) { /* storage blocked: download anyway */ }
      setTimeout(start, 600);
    });
  }
  // "Send me the link" on phones: an e-mail to yourself with this page's address.
  $$('[data-send-link]').forEach((a) => {
    a.href = `mailto:?subject=${encodeURIComponent('Eiddie')}&body=${encodeURIComponent(location.origin + location.pathname)}`;
  });

  /* ------------------------------------------------------------------ */
  /* Intro video: one file per language (config.video), click to play   */
  /* ------------------------------------------------------------------ */
  const reelSec = $('[data-video]');
  const reelVideo = $('[data-video-el]');
  if (reelSec && reelVideo) {
    const V = C.video || {};
    const playBtn = $('[data-video-play]', reelSec);
    const endCard = $('[data-video-end]', reelSec);
    const openBtns = $$('[data-video-open]');
    const file = (tpl) => (tpl || '').replace('{lang}', lang);
    let near = false; // the poster is fetched only once the section gets close to the viewport
    // Pilot: stop before the end card burned into the video (price, 14-day trial) and show the HTML end card instead.
    const cut = C.pilot && V.pilotEnd > 0 ? V.pilotEnd : 0;
    const shownDuration = cut ? `${Math.floor(cut / 60)}:${String(Math.floor(cut % 60)).padStart(2, '0')}` : V.duration;

    const reset = () => {
      playBtn.hidden = false;
      endCard.hidden = true;
      reelVideo.controls = false;
    };
    const setSource = () => {
      const ready = !!(V.ready && V.ready[lang] && V.src);
      reelSec.hidden = !ready;
      openBtns.forEach((b) => { b.hidden = !ready; });
      if (shownDuration) $$('[data-video-duration]').forEach((el) => { el.textContent = shownDuration; });
      if (!ready) {
        if (reelVideo.getAttribute('src')) { reelVideo.pause(); reelVideo.removeAttribute('src'); reelVideo.removeAttribute('poster'); reelVideo.load(); }
        return;
      }
      if (reelVideo.getAttribute('src') !== file(V.src)) {
        reelVideo.pause();
        reelVideo.src = file(V.src); // preload="none": nothing is downloaded until Play
        reset();
      }
      if (near && V.poster) reelVideo.poster = file(V.poster);
    };
    const play = () => {
      if (reelSec.hidden) return;
      const hadFocus = reelSec.contains(document.activeElement);
      playBtn.hidden = true;
      endCard.hidden = true;
      reelVideo.controls = true;
      if (reelVideo.error) reelVideo.load(); // retry after a failed load
      else if (reelVideo.ended || (cut && reelVideo.currentTime >= cut - 0.1)) reelVideo.currentTime = 0;
      const p = reelVideo.play();
      if (p && p.catch) p.catch((err) => { if (err && err.name !== 'AbortError') reset(); });
      if (hadFocus) reelVideo.focus({ preventScroll: true });
    };

    playBtn.addEventListener('click', play);
    $('[data-video-replay]', reelSec).addEventListener('click', () => { reelVideo.currentTime = 0; play(); });
    // Hero button: bring the player itself into view (centred, below the nav) and start right away,
    // still inside the click so sound is allowed. Handled here instead of by the generic #anchor scroll.
    openBtns.forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      near = true;
      setSource();
      const frame = reelVideo.parentElement.getBoundingClientRect();
      const navH = nav ? nav.offsetHeight : 0;
      scrollToY(window.scrollY + frame.top - Math.max(navH + 16, (innerHeight + navH - frame.height) / 2));
      history.replaceState(null, '', '#video');
      play();
    }));
    const showEnd = () => {
      if (document.fullscreenElement === reelVideo && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      const hadFocus = reelSec.contains(document.activeElement);
      reelVideo.controls = false;
      endCard.hidden = false;
      if (hadFocus) $('[data-video-replay]', reelSec).focus({ preventScroll: true });
    };
    reelVideo.addEventListener('ended', showEnd);
    if (cut) {
      reelVideo.addEventListener('timeupdate', () => {
        if (reelVideo.currentTime >= cut && !reelVideo.paused) { reelVideo.pause(); showEnd(); }
      });
    }
    reelVideo.addEventListener('error', () => {
      if (!reelVideo.getAttribute('src') || !playBtn.hidden) return; // only report failures after Play
      reset();
      toast(t('videoError'));
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !near) { near = true; setSource(); }
      }, { rootMargin: '800px 0px' }).observe(reelSec);
      // Pause once the player is scrolled (mostly) out of view; starting it while it scrolls in is fine
      let inView = false;
      new IntersectionObserver(([e]) => {
        const visible = e.intersectionRatio >= 0.25;
        if (inView && !visible && !reelVideo.paused && document.fullscreenElement !== reelVideo) reelVideo.pause();
        inView = visible;
      }, { threshold: [0, 0.25] }).observe(reelVideo);
    } else {
      near = true;
    }
    langHooks.push(setSource);
  }

  /* Thank-you page confetti (brand colours) */
  const confettiHost = $('[data-confetti]');
  if (confettiHost && !reduced) {
    const cv = document.createElement('canvas');
    cv.className = 'confetti';
    document.body.appendChild(cv);
    const cx = cv.getContext('2d');
    const DPR = Math.min(2, devicePixelRatio || 1);
    const resize = () => { cv.width = innerWidth * DPR; cv.height = innerHeight * DPR; };
    resize();
    addEventListener('resize', resize);
    const COLS = ['#6c5cff', '#8b7dff', '#4f46e5', '#12a594', '#5fd4c6', '#e93d97', '#f76b15', '#e8a317'];
    const parts = Array.from({ length: 180 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 160,
      y: innerHeight * 0.32,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 15 - 5,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      w: 6 + Math.random() * 7,
      h: 8 + Math.random() * 10,
      c: COLS[(Math.random() * COLS.length) | 0],
    }));
    const t0 = performance.now();
    const frame = (now) => {
      const age = (now - t0) / 1000;
      cx.setTransform(DPR, 0, 0, DPR, 0, 0);
      cx.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach((p) => {
        p.vy += 0.38; p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx; p.y += p.vy; p.r += p.vr;
        cx.save();
        cx.globalAlpha = clamp(3.6 - age, 0, 1);
        cx.translate(p.x, p.y);
        cx.rotate(p.r);
        cx.fillStyle = p.c;
        cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 2);
        cx.restore();
      });
      if (age < 3.8) requestAnimationFrame(frame); else cv.remove();
    };
    setTimeout(() => requestAnimationFrame(frame), 350);
  }

  /* ------------------------------------------------------------------ */
  /* Copy e-mail                                                         */
  /* ------------------------------------------------------------------ */
  $$('[data-copy-email]').forEach((b) => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(C.email); toast(t('copied')); }
    catch (e) { location.href = `mailto:${C.email}`; }
  }));

  /* ------------------------------------------------------------------ */
  /* Contact form                                                        */
  /* ------------------------------------------------------------------ */
  const form = $('[data-form]');
  if (form) {
    // iOS Safari ignores display:none on <option>, so drop the topics of the other mode instead of hiding them.
    $$(root.hasAttribute('data-pilot') ? 'option[data-pilot-hide]' : 'option[data-pilot-only]', form).forEach((o) => o.remove());
    const status = $('[data-form-status]', form);
    const setStatus = (msg, cls) => { status.textContent = msg; status.className = `form__status ${cls || ''}`; };
    form.addEventListener('input', (e) => { const f = e.target.closest('.field'); if (f) f.classList.remove('is-invalid'); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      if (fd.get('_gotcha')) return; // bot
      const name = String(fd.get('name') || '').trim();
      const email = String(fd.get('email') || '').trim();
      const message = String(fd.get('message') || '').trim();
      const topic = form.querySelector('#f-topic').selectedOptions[0].textContent.trim();
      const bad = [];
      if (!name) bad.push('#f-name');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) bad.push('#f-email');
      if (!message) bad.push('#f-msg');
      bad.forEach((s) => $(s, form).closest('.field').classList.add('is-invalid'));
      if (bad.length) { setStatus(t('formInvalid'), 'err'); $(bad[0], form).focus(); return; }

      if (C.formEndpoint) {
        setStatus(t('formSending'));
        try {
          const res = await fetch(C.formEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ name, email, topic, message, lang }),
          });
          if (!res.ok) throw new Error(String(res.status));
          form.reset();
          setStatus(t('formOk'), 'ok');
        } catch (err) { setStatus(t('formErr'), 'err'); }
        return;
      }
      const body = `${message}\n\n${name} <${email}>`;
      location.href = `mailto:${C.email}?subject=${encodeURIComponent(`Eiddie: ${topic}`)}&body=${encodeURIComponent(body)}`;
      setStatus(t('formMailto'), 'ok');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Savings calculator                                                  */
  /* ------------------------------------------------------------------ */
  const calc = $('[data-calc]');
  if (calc) {
    const range = $('[data-calc-month]', calc);
    let years = 3;
    const PRICE = 999;
    const render = () => {
      const m = Number(range.value);
      const sub = m * 12 * years;
      const save = sub - PRICE;
      range.style.setProperty('--fill', `${(m - range.min) / (range.max - range.min) * 100}%`);
      $('[data-calc-month-out]', calc).textContent = t('currency')(m);
      $('[data-calc-sub-label]', calc).textContent = t('subFor')(t('years')[years]);
      $('[data-calc-sub]', calc).textContent = t('currency')(sub);
      if (save > 0) {
        $('[data-calc-save-label]', calc).textContent = t('save');
        $('[data-calc-save]', calc).textContent = t('currency')(save);
      } else {
        $('[data-calc-save-label]', calc).textContent = t('payback');
        $('[data-calc-save]', calc).textContent = m > 0 ? t('months')(Math.ceil(PRICE / m)) : '∞';
      }
    };
    range.min = 50;
    range.addEventListener('input', render);
    $$('[data-years]', calc).forEach((b) => b.addEventListener('click', () => {
      years = Number(b.dataset.years);
      $$('[data-years]', calc).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      render();
    }));
    langHooks.push(render);
    render();
  }

  /* ------------------------------------------------------------------ */
  /* Use-case tabs                                                       */
  /* ------------------------------------------------------------------ */
  const tabs = $$('[role="tab"]');
  function selectTab(tab, focus) {
    tabs.forEach((x) => {
      const on = x === tab;
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(x.getAttribute('aria-controls'));
      if (!panel) return;
      if (on) {
        panel.hidden = false;
        if (gsap && !reduced) gsap.fromTo(panel, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', clearProps: 'transform' });
      } else panel.hidden = true;
    });
    if (focus) tab.focus();
    if (ST) ST.refresh();
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); selectTab(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });

  /* ------------------------------------------------------------------ */
  /* FAQ accordion with height animation                                 */
  /* ------------------------------------------------------------------ */
  $$('.faq details').forEach((d) => {
    const s = $('summary', d);
    const a = $('.faq__a', d);
    s.addEventListener('click', (e) => {
      if (reduced || !a.animate) return;
      e.preventDefault();
      const ease = 'cubic-bezier(.2,.7,.2,1)';
      if (d.open) {
        const h = a.offsetHeight;
        a.animate([{ height: `${h}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 280, easing: ease })
          .onfinish = () => { d.open = false; ST && ST.refresh(); };
      } else {
        d.open = true;
        const h = a.offsetHeight;
        a.animate([{ height: '0px', opacity: 0 }, { height: `${h}px`, opacity: 1 }], { duration: 380, easing: ease })
          .onfinish = () => ST && ST.refresh();
      }
    });
  });

  /* ------------------------------------------------------------------ */
  /* Typers (hero outline row, diacritics search tile)                   */
  /* ------------------------------------------------------------------ */
  function heroTyper() {
    const el = $('[data-typer]');
    if (!el) return;
    const pill = $('[data-typer-pill]');
    let timer;
    let run = 0;
    const start = () => {
      clearTimeout(timer);
      const id = ++run;
      const text = el.dataset[lang === 'en' ? 'typeEn' : 'typeCs'];
      if (reduced) { el.textContent = text; pill.classList.remove('is-hidden'); return; }
      let i = 0;
      el.textContent = '';
      pill.classList.add('is-hidden');
      const type = () => {
        if (id !== run) return;
        if (i <= text.length) { el.textContent = text.slice(0, i++); timer = setTimeout(type, 45 + Math.random() * 55); }
        else timer = setTimeout(() => { pill.classList.remove('is-hidden'); timer = setTimeout(erase, 3200); }, 350);
      };
      const erase = () => {
        if (id !== run) return;
        pill.classList.add('is-hidden');
        const del = () => {
          if (id !== run) return;
          if (i > 0) { el.textContent = text.slice(0, --i); timer = setTimeout(del, 18); }
          else timer = setTimeout(type, 600);
        };
        timer = setTimeout(del, 300);
      };
      timer = setTimeout(type, 1400);
    };
    langHooks.push(start);
    start();
  }
  heroTyper();

  function diaTyper() {
    const box = $('[data-dia]');
    if (!box) return;
    const out = $('[data-dia-text]', box);
    let timer;
    let run = 0;
    let visible = false;
    const start = () => {
      clearTimeout(timer);
      const id = ++run;
      const q = box.dataset[lang === 'en' ? 'qEn' : 'qCs'];
      if (reduced) { out.textContent = q; box.classList.add('is-found'); return; }
      let i = 0;
      out.textContent = '';
      box.classList.remove('is-found');
      const step = () => {
        if (id !== run) return;
        if (!visible) { timer = setTimeout(step, 400); return; }
        if (i <= q.length) { out.textContent = q.slice(0, i++); timer = setTimeout(step, 110); }
        else {
          box.classList.add('is-found');
          timer = setTimeout(() => { if (id === run) { i = 0; out.textContent = ''; box.classList.remove('is-found'); timer = setTimeout(step, 700); } }, 3000);
        }
      };
      timer = setTimeout(step, 500);
    };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(box);
    langHooks.push(start);
    start();
  }
  diaTyper();

  /* ------------------------------------------------------------------ */
  /* Bento tiles: spotlight + start CSS loops only while visible         */
  /* ------------------------------------------------------------------ */
  const tileIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.classList.toggle('is-in', e.isIntersecting));
  }, { rootMargin: '0px 0px -10% 0px' });
  $$('[data-tile]').forEach((tile) => {
    tileIO.observe(tile);
    if (!finePointer) return;
    tile.addEventListener('pointermove', (e) => {
      const r = tile.getBoundingClientRect();
      tile.style.setProperty('--mx', `${e.clientX - r.left}px`);
      tile.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  /* ------------------------------------------------------------------ */
  /* Little joys (#radosti): talking mascots and small live demos        */
  /* Lines and rules follow the app (src/renderer/features/mascots and   */
  /* delight). Czech: informal "ty", gender-neutral about the visitor.   */
  /* ------------------------------------------------------------------ */
  const joy = $('[data-joy]');
  if (joy) {
    const L = (cs, en) => (lang === 'en' ? en : cs);
    const pick = (a) => a[(Math.random() * a.length) | 0];
    const czPl = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);

    /* Confetti from a point (viewport coordinates), brand colours */
    const COLS = ['#6c5cff', '#8b7dff', '#4f46e5', '#12a594', '#5fd4c6', '#e93d97', '#f76b15', '#e8a317'];
    function burstAt(x, y, n = 70) {
      if (reduced) return;
      const cv = document.createElement('canvas');
      cv.className = 'confetti';
      document.body.appendChild(cv);
      const cx = cv.getContext('2d');
      const DPR = Math.min(2, devicePixelRatio || 1);
      cv.width = innerWidth * DPR; cv.height = innerHeight * DPR;
      const parts = Array.from({ length: n }, () => ({
        x, y, vx: (Math.random() - 0.5) * 13, vy: -Math.random() * 11 - 4, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
        w: 5 + Math.random() * 6, h: 7 + Math.random() * 8, c: COLS[(Math.random() * COLS.length) | 0],
      }));
      const t0 = performance.now();
      const frame = (now) => {
        const age = (now - t0) / 1000;
        cx.setTransform(DPR, 0, 0, DPR, 0, 0);
        cx.clearRect(0, 0, innerWidth, innerHeight);
        parts.forEach((p) => {
          p.vy += 0.36; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
          cx.save(); cx.globalAlpha = clamp(2.6 - age, 0, 1); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c;
          cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 2); cx.restore();
        });
        if (age < 2.8) requestAnimationFrame(frame); else cv.remove();
      };
      requestAnimationFrame(frame);
    }
    const burstFrom = (el, n) => { const r = el.getBoundingClientRect(); burstAt(r.left + r.width / 2, r.top + r.height / 2, n); };

    /* A happy hop: the app's data-mood="happy" (eyes "^ ^", two hops) */
    const timers = new WeakMap();
    function happy(svg, ms = 1500) {
      if (!svg) return;
      svg.setAttribute('data-mood', 'idle');
      void svg.getBoundingClientRect();
      svg.setAttribute('data-mood', 'happy');
      clearTimeout(timers.get(svg));
      timers.set(svg, setTimeout(() => svg.setAttribute('data-mood', 'idle'), ms));
    }

    /* Small mascots inside the demos */
    function miniSay(id, cs, en, ms = 4200) {
      const m = $(`[data-joy-mini="${id}"]`, joy);
      if (!m) return;
      $('[data-joy-mini-text]', m).textContent = L(cs, en);
      m.classList.add('is-saying');
      happy($('.mc-fig', m));
      clearTimeout(timers.get(m));
      timers.set(m, setTimeout(() => m.classList.remove('is-saying'), ms));
    }

    /* The small mascots say hello once when their demo comes into view, and answer a click */
    const HELLO = {
      nitka: ['Nevíš, čím začít? Hoď kostkou a vybírat nebudeš muset.', 'Don’t know where to start? Roll the dice and you won’t have to choose.'],
      drobek: ['Pět minut zvládne každý. I já, a to spím šestnáct hodin denně.', 'Anyone can do five minutes. Even me, and I sleep sixteen hours a day.'],
      dalibor: ['Dobrý den. Kmeny srovnané, tagy taky. Odškrtni první.', 'Good day. Logs stacked, tags too. Tick the first one.'],
      inka: ['Ahoj! Zkus jiný svátek. Mám na každý jednu ruku.', 'Hi! Try another holiday. I’ve got an arm for each.'],
    };
    $$('[data-joy-mini]', joy).forEach((m) => {
      const id = m.dataset.joyMini;
      m.style.cursor = 'pointer';
      m.addEventListener('click', () => { const p = GANG[id].poke; miniSay(id, p[0], p[1], 2600); });
      const io = new IntersectionObserver((es) => {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        setTimeout(() => { if (!m.classList.contains('is-saying')) miniSay(id, HELLO[id][0], HELLO[id][1]); }, 900);
      }, { threshold: 1 });
      io.observe(m);
    });

    /* ---------- the gang: talks on its own while in view, answers a click ---------- */
    const GANG = {
      ema: {
        cs: ['Dobrý den. Čárky nabroušené, nadpisy vyleštěné.', 'Krátké věty jsou jako krátké procházky. Nikdo se z nich nevrací unavený.', 'Dnes 3 hotové úkoly. Tohle si zaslouží nadpis první úrovně.', 'Dnešní denní poznámka je zatím prázdná. Jedna věta stačí, klidně blbá. Nikomu to neřeknu.'],
        en: ['Good day. Commas sharpened, headings polished.', 'Short sentences are like short walks. Nobody comes back tired.', '3 tasks done today. That deserves a level one heading.', 'Today’s daily note is still empty. One sentence will do, even a silly one. I won’t tell anyone.'],
        poke: ['Hú? Pozor na brýle.', 'Hoo? Mind the glasses.'],
      },
      iskra: {
        cs: ['Mám nápad! … Zapomněla jsem ho. Proto si nápady zapisuj.', 'Každý velký nápad začal jako hloupá poznámka na okraji.', 'Bzz! Našla jsem starý nápad: Zalévač. Mám ho rozsvítit?', 'Žádné termíny! Ideální den na nápad, který ještě nikdo neměl.'],
        en: ['I have an idea! … I forgot it. That’s why you write ideas down.', 'Every big idea started as a silly note in the margin.', 'Bzz! I found an old idea: Plant waterer. Shall I light it up?', 'No due dates! A perfect day for an idea nobody has had yet.'],
        poke: ['Hihi, to lechtá!', 'Hehe, that tickles!'],
      },
      drobek: {
        cs: ['Dnes toho moc nepadlo? V pohodě. Já dneska spal šestnáct hodin a jsem na sebe hrdý.', 'Já mám na dnešek jeden úkol: sluníčko na parapetu. Zvládnu to.', 'Pauza je taky práce. Říkám to každý den a nikdo mi nevěří.', 'Všechno na dnešek hotovo. Oficiálně vyhlašuju šlofík.'],
        en: ['Not much done today? That’s fine. I slept sixteen hours today and I’m proud of myself.', 'I have one task today: the sunny spot on the windowsill. I’ll manage.', 'A break is work too. I say it every day and nobody believes me.', 'Everything for today is done. I officially declare nap time.'],
        poke: ['Mňau. Drbání za ušima je v ceně.', 'Meow. Ear scratches are included.'],
      },
      dalibor: {
        cs: ['Dobrý den. Kmeny srovnané, tagy taky.', 'Pořádek není nuda. Pořádek je hráz proti chaosu.', '2 úkoly jsou po termínu. Termíny se dají posunout, hráze taky. Nikdo se nezlobí.'],
        en: ['Good day. Logs stacked, tags too.', 'Order isn’t boring. Order is a dam against chaos.', '2 tasks are past due. Due dates can be moved, so can dams. Nobody’s cross.'],
        poke: ['Opatrně, držím šuplík.', 'Careful, I’m holding a drawer.'],
      },
      inka: {
        cs: ['Ahoj! Osm rukou připraveno, tabule čeká.', 'Když se věci nevejdou do řádku, nakresli je.', 'Tabuli Produktová mapa nikdo neviděl 12 dní. Já bych ji vzala na procházku.'],
        en: ['Hi! Eight arms ready, the board is waiting.', 'When things don’t fit in a line, draw them.', 'Nobody has seen the board Product map for 12 days. I’d take it for a walk.'],
        poke: ['Ahoj ahoj ahoj ahoj ahoj ahoj ahoj ahoj. Za každou ruku jedno.', 'Hi hi hi hi hi hi hi hi. One for every arm.'],
      },
      emil: {
        cs: ['Všechno je doma. Já taky. Já jsem vždycky doma.', 'Tvoje poznámky jsou obyčejné soubory. Přežijí i mě, a želvy žijou dlouho.', '214 poznámek, nula cloudů. Tak to mám rád.'],
        en: ['Everything is at home. Me too. I’m always at home.', 'Your notes are plain files. They’ll outlive me, and turtles live long.', '214 notes, zero clouds. Just how I like it.'],
        poke: ['Ťuk ťuk. Jo, jsem doma.', 'Knock knock. Yes, I’m home.'],
      },
      nitka: {
        cs: ['Ahoj, já jsem Nitka. Spojuju partu dohromady.', 'Všechno souvisí se vším. Hlavně poznámky.', 'Nevíš, čím začít? Hoď kostkou „Co teď?“ a vybírat nebudeš muset.', 'Pár úkolů přetáhlo. To se stává i nitím. Klidně jim dej nový termín.'],
        en: ['Hi, I’m Nitka. I tie the gang together.', 'Everything is connected to everything. Notes most of all.', 'Don’t know where to start? Roll the “What now?” dice and you won’t have to choose.', 'A few tasks ran over. Happens to threads too. Feel free to give them a new date.'],
        poke: ['Nezamotej mě!', 'Don’t tangle me up!'],
      },
    };
    const gang = $('[data-joy-gang]', joy);
    const say = $('.joy-say', joy);
    const chars = $$('.joy-char', joy);
    let talking = null; // { id, line index or 'poke' }
    let pokes = {};
    function renderSay() {
      if (!talking) return;
      const c = chars.find((b) => b.dataset.char === talking.id);
      const g = GANG[talking.id];
      const text = talking.i === 'poke' ? g.poke[lang === 'en' ? 1 : 0] : g[lang][talking.i % g[lang].length];
      $('[data-joy-who]', say).innerHTML = `${c.dataset.name} <small>${c.dataset[lang === 'en' ? 'subEn' : 'subCs']}</small>`;
      $('[data-joy-text]', say).textContent = text;
    }
    function speak(id, i) {
      const c = chars.find((b) => b.dataset.char === id);
      if (!c) return;
      say.classList.add('is-swap');
      setTimeout(() => {
        talking = { id, i };
        renderSay();
        const sr = say.getBoundingClientRect();
        const cr = c.getBoundingClientRect();
        say.style.setProperty('--x', `${cr.left + cr.width / 2 - sr.left}px`);
        say.classList.remove('is-swap');
      }, reduced ? 0 : 180);
      chars.forEach((b) => b.classList.toggle('is-talking', b === c));
      happy($('.mc-fig', c));
    }
    let order = [];
    let lastAuto = 'nitka';
    function autoTalk() {
      if (!order.length) order = Object.keys(GANG).filter((k) => k !== lastAuto).sort(() => Math.random() - 0.5);
      lastAuto = order.shift();
      speak(lastAuto, (Math.random() * 4) | 0);
    }
    let gangVisible = false;
    let holdUntil = 0;
    let gangTimer = null;
    const tick = () => {
      if (gangVisible && !document.hidden && Date.now() > holdUntil) autoTalk();
    };
    new IntersectionObserver((es) => {
      gangVisible = es[0].isIntersecting;
      if (gangVisible && !gangTimer) {
        setTimeout(() => speak('nitka', 0), 500);
        gangTimer = setInterval(tick, 5200);
      }
    }, { threshold: 0.35 }).observe(gang);
    chars.forEach((c) => c.addEventListener('click', () => {
      const id = c.dataset.char;
      pokes[id] = (pokes[id] || 0) + 1;
      speak(id, pokes[id] === 1 ? 'poke' : pokes[id] - 2);
      holdUntil = Date.now() + 9000;
    }));
    talking = { id: 'nitka', i: 0 };
    renderSay();
    langHooks.push(renderSay);

    /* ---------- "What now?" dice: one task, 3 rerolls, then it insists ---------- */
    const TASKS = [
      { cs: 'Odepsat účetní na e-mail', en: 'Reply to the accountant’s e-mail', tag: ['Práce', 'Work'], pill: ['po termínu', 'overdue', 'red'] },
      { cs: 'Vybrat dárek pro mámu', en: 'Pick a present for Mum', tag: ['Osobní', 'Personal'], pill: ['High', 'High', 'red'] },
      { cs: 'Přečíst kapitolu z Jak si dělat chytré poznámky', en: 'Read a chapter of How to Take Smart Notes', tag: ['Čtení', 'Reading'], pill: ['Low', 'Low', 'teal'] },
      { cs: 'Zavolat do tiskárny kvůli samolepkám', en: 'Call the printer about the stickers', tag: ['Eiddie launch', 'Eiddie launch'], pill: ['zítra', 'tomorrow', 'blue'] },
      { cs: 'Naplánovat víkend na horách', en: 'Plan the mountain weekend', tag: ['Osobní', 'Personal'], pill: ['Medium', 'Medium', 'yellow'] },
      { cs: 'Uklidit plochu počítače', en: 'Tidy up the desktop', tag: ['Domácnost', 'Home'], pill: ['Low', 'Low', 'teal'] },
    ];
    const dice = $('[data-joy-dice]', joy);
    const die = $('[data-joy-die]', dice);
    const rollBtn = $('[data-joy-roll]', dice);
    const taskBox = $('[data-joy-task]', dice);
    const dz = { task: -1, left: 3, rolling: false };
    function renderDice() {
      const t = TASKS[dz.task];
      $('[data-joy-task-title]', dice).textContent = dz.rolling ? L('Házím…', 'Rolling…') : t ? t[lang] : L('Hoď kostkou, vybere za tebe', 'Roll the dice, it picks for you');
      $('[data-joy-task-meta]', dice).innerHTML = t && !dz.rolling
        ? `<span class="pill pill--gray">${L(t.tag[0], t.tag[1])}</span><span class="pill pill--${t.pill[2]}">${L(t.pill[0], t.pill[1])}</span>` : '';
      $('[data-joy-dice-hint]', dice).textContent = dz.task >= 0 && dz.left === 0 ? L('Vezmi tenhle 🙂', 'Take this one 🙂') : L('Jen tenhle jeden. Všechno ostatní počká.', 'Just this one. Everything else can wait.');
      $('[data-joy-roll-label]', dice).textContent = dz.task < 0 ? L('Hodit', 'Roll') : dz.left > 0 ? L('Jiný', 'Another one') : L('Jdu na to', 'Let’s do it');
      $('[data-joy-left]', dice).textContent = dz.task >= 0 && dz.left > 0 ? L(`ještě ${dz.left}×`, `${dz.left} left`) : '';
      rollBtn.classList.toggle('joy-btn--primary', dz.task < 0 || dz.left === 0);
      rollBtn.disabled = dz.rolling;
    }
    rollBtn.addEventListener('click', () => {
      if (dz.task >= 0 && dz.left === 0) {
        miniSay('nitka', 'Jedna fajfka. Z toho se dá uplést celý den.', 'One tick. You can knit a whole day from that.');
        burstFrom(rollBtn, 40);
        Object.assign(dz, { task: -1, left: 3 });
        renderDice();
        return;
      }
      if (dz.task >= 0) dz.left -= 1;
      dz.rolling = true;
      die.classList.add('is-rolling');
      renderDice();
      const letters = 'EIDDIE';
      let k = 0;
      const spin = setInterval(() => { die.textContent = letters[k++ % 6]; }, 90);
      setTimeout(() => {
        clearInterval(spin);
        die.classList.remove('is-rolling');
        let next;
        do next = (Math.random() * TASKS.length) | 0; while (next === dz.task);
        dz.task = next;
        dz.rolling = false;
        die.textContent = letters[(Math.random() * 6) | 0];
        taskBox.classList.remove('is-pop'); void taskBox.offsetWidth; taskBox.classList.add('is-pop');
        renderDice();
        if (dz.left === 0) miniSay('nitka', 'Tři hody stačily. Teď už jen tenhle jeden.', 'Three rolls is plenty. Now just this one.');
      }, reduced ? 0 : 750);
    });
    renderDice();
    langHooks.push(renderDice);

    /* ---------- writing lantern: 10 words a step, 5 steps, never dims ---------- */
    const GLOW = '#ffcf5c';
    const halo = (lv) => `<circle class="dl-lt-halo" cx="16" cy="17" r="17" fill="url(#joy-lt-glow)" opacity="${lv / 5}"/>`;
    const MOTIF = {
      lantern: (lv) => `${halo(lv)}<path d="M12.5 7 Q16 1.5 19.5 7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><rect x="10.5" y="6.5" width="11" height="3" rx="1.2" fill="currentColor"/><rect x="9.5" y="9.5" width="13" height="16" rx="3" fill="${GLOW}" fill-opacity="${0.12 + 0.6 * lv / 5}" stroke="currentColor" stroke-width="1.3"/><path d="M13.5 9.5 V25.5 M18.5 9.5 V25.5" stroke="currentColor" stroke-width="0.9" opacity="0.55"/>${lv ? `<path class="dl-lt-flame" d="M16 13.2 C17.9 15.6 18.1 18.4 16 20.4 C13.9 18.4 14.1 15.6 16 13.2 Z" fill="#ff9f2e" transform="translate(16 17) scale(${0.7 + 0.06 * lv}) translate(-16 -17)"/>` : ''}<rect x="10.5" y="25.5" width="11" height="3" rx="1.2" fill="currentColor"/>`,
      pumpkin: (lv) => `${halo(lv)}<path d="M16 9.5 C16 7.5 16.6 5.6 18.4 4.6" fill="none" stroke="#3f7d33" stroke-width="2" stroke-linecap="round"/><ellipse cx="11" cy="18.5" rx="7" ry="9" fill="#e07a1f"/><ellipse cx="21" cy="18.5" rx="7" ry="9" fill="#e07a1f"/><ellipse cx="16" cy="18.5" rx="7.5" ry="9.5" fill="#f08c2e"/><g fill="${lv ? GLOW : '#4a250c'}" fill-opacity="${lv ? 0.45 + 0.55 * lv / 5 : 1}"><path d="M10.5 16.5 L13.2 13.6 L14.6 17 Z"/><path d="M21.5 16.5 L18.8 13.6 L17.4 17 Z"/><path d="M10.2 20.4 L12.3 21.2 L13.6 20.2 L15 21.5 L16.4 20.2 L17.8 21.5 L19.2 20.2 L20.5 21.2 L21.8 20.4 C20.6 24.6 11.4 24.6 10.2 20.4 Z"/></g>`,
      candle: (lv) => { const h = 2.5 + lv * 1.3; return `${halo(lv)}<rect x="12" y="14.5" width="8" height="14" rx="1.6" fill="#f6f0e4" stroke="currentColor" stroke-width="1.1"/><path d="M17.5 14.5 V18.2 C17.5 19.4 19 19.4 19 18.2 V14.5" fill="#ebe3d2"/><path d="M16 14.5 V12.4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>${lv ? `<path class="dl-lt-flame" d="M16 ${12.6 - h} C17.8 ${12.6 - h * 0.45} 17.6 12.4 16 12.6 C14.4 12.4 14.2 ${12.6 - h * 0.45} 16 ${12.6 - h} Z" fill="#ff9f2e"/>` : ''}<rect x="10" y="28" width="12" height="1.8" rx="0.9" fill="currentColor" opacity="0.6"/>`; },
      flower: (lv) => `${halo(lv)}<path d="M16 30 V15" stroke="#3f8f45" stroke-width="1.6" stroke-linecap="round"/><path d="M16 24 C12.5 23.6 11 21.6 10.6 19.6 C13.6 19.8 15.4 21.4 16 24 Z" fill="#4fae55"/>${lv === 0 ? '<ellipse cx="16" cy="12.5" rx="2.6" ry="3.8" fill="#f28db2"/>' : `<g>${[0, 72, 144, 216, 288].map((d, i) => `<ellipse class="dl-lt-petal" cx="16" cy="7.6" rx="2.9" ry="4.4" fill="#f28db2" transform="rotate(${d} 16 12.5)" opacity="${i < lv ? 1 : 0}"/>`).join('')}<circle cx="16" cy="12.5" r="2.6" fill="#ffc93d"/></g>`}`,
    };
    const m0 = new Date().getMonth() + 1;
    const lt = { motif: m0 === 10 ? 'pumpkin' : m0 === 12 ? 'candle' : m0 >= 3 && m0 <= 8 ? 'flower' : 'lantern', words: 0, lit: false };
    const lantern = $('[data-joy-lantern]', joy);
    const area = $('[data-joy-words]', lantern);
    const lamp = $('[data-joy-lamp]', lantern);
    const litBubble = $('[data-joy-lit]', lantern);
    function renderLantern() {
      const lv = Math.min(5, Math.floor(lt.words / 10));
      lamp.innerHTML = `<svg viewBox="0 0 32 32" aria-hidden="true"><defs><radialGradient id="joy-lt-glow"><stop offset="0" stop-color="${GLOW}" stop-opacity="0.85"/><stop offset="0.55" stop-color="${GLOW}" stop-opacity="0.25"/><stop offset="1" stop-color="${GLOW}" stop-opacity="0"/></radialGradient></defs>${MOTIF[lt.motif](lv)}</svg>`;
      lamp.classList.toggle('is-lit', lv === 5);
      lamp.setAttribute('aria-label', L(`Lucerna: ${lt.words} ${czPl(lt.words, 'slovo', 'slova', 'slov')}`, `Lantern: ${lt.words} ${lt.words === 1 ? 'word' : 'words'}`));
      $('[data-joy-count]', lantern).textContent = L(`${lt.words} ${czPl(lt.words, 'slovo', 'slova', 'slov')} · světlo ${lv}/5`, `${lt.words} ${lt.words === 1 ? 'word' : 'words'} · light ${lv}/5`);
      $$('[data-motif]', lantern).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.motif === lt.motif)));
      if (lv === 5 && !lt.lit) {
        lt.lit = true;
        litBubble.classList.add('is-on');
        setTimeout(() => litBubble.classList.remove('is-on'), 4500);
      }
    }
    const countWords = () => { lt.words = (area.value.trim().match(/\S+/g) || []).length; if (lt.words < 50) lt.lit = false; renderLantern(); };
    area.addEventListener('input', countWords);
    $$('[data-motif]', lantern).forEach((b) => b.addEventListener('click', () => { lt.motif = b.dataset.motif; renderLantern(); }));
    const SAMPLE = {
      cs: 'Ráno s kafem na balkoně a seznam na dnešek: tři schůzky, jedna prezentace a večer trénink. Nejvíc mě láká nápad s novým webem. Jednoduchá stránka, velký nadpis, pár obrázků a hodně vzduchu. Zítra ho načrtnu na tabuli a pošlu Janě. Teď ještě dva maily, zalít bazalku a hurá do práce. Den může začít.',
      en: 'Morning coffee on the balcony and today’s list: three meetings, one presentation and a run in the evening. The idea I like most is the new website. A simple page, a big headline, a few pictures and lots of air. Tomorrow I’ll sketch it on the board and send it to Jana. Now two e-mails, water the basil and off to work. The day can start.',
    };
    let typing = null;
    $('[data-joy-autowrite]', lantern).addEventListener('click', () => {
      clearInterval(typing);
      const text = SAMPLE[lang];
      if (reduced) { area.value = text; countWords(); return; }
      area.value = '';
      let i = 0;
      typing = setInterval(() => {
        i += 3;
        area.value = text.slice(0, i);
        area.scrollTop = area.scrollHeight;
        countWords();
        if (i >= text.length) clearInterval(typing);
      }, 28);
    });
    renderLantern();
    langHooks.push(renderLantern);

    /* ---------- just 5 minutes (the demo runs 5 minutes in 5 seconds) ---------- */
    const five = $('[data-joy-five]', joy);
    const fv = { run: false, min: 0, left: 5 };
    const fStart = $('[data-joy-five-start]', five);
    const fCount = $('[data-joy-five-count]', five);
    const fCard = $('[data-joy-five-card]', five);
    const fBar = $('[data-joy-bar]', five);
    let fTimer = null;
    function renderFive() {
      fCount.textContent = `⏳ ${fv.left} min`;
      $('[data-joy-five-title]', five).textContent = L(`${fv.min} minut hotovo 🙂`, `${fv.min} minutes done 🙂`);
    }
    function round() {
      fv.run = true; fv.left = 5;
      fStart.hidden = true; fCount.hidden = false; fCard.hidden = true;
      fBar.style.transition = 'none'; fBar.style.width = '0';
      void fBar.offsetWidth;
      fBar.style.transition = 'width 5s linear'; fBar.style.width = '100%';
      renderFive();
      clearInterval(fTimer);
      fTimer = setInterval(() => {
        fv.left -= 1;
        if (fv.left > 0) { renderFive(); return; }
        clearInterval(fTimer);
        fv.run = false; fv.min += 5;
        fCount.hidden = true; fCard.hidden = false;
        renderFive();
      }, 1000);
    }
    fStart.addEventListener('click', () => {
      fv.min = 0;
      round();
      miniSay('drobek', 'Stačí jeden malý úkol. Klidně ten nejmenší.', 'One small task is enough. The smallest one will do.');
    });
    $('[data-joy-five-more]', five).addEventListener('click', () => {
      round();
      miniSay('drobek', 'Ještě kolo? Já bych si dal šlofíka. Jen říkám.', 'Another round? I’d take a nap. Just saying.');
    });
    $('[data-joy-five-enough]', five).addEventListener('click', () => {
      fCard.hidden = true; fStart.hidden = false;
      fBar.style.transition = 'width 0.4s'; fBar.style.width = '0';
      miniSay('drobek', 'Pauza je taky práce. Říkám to každý den a nikdo mi nevěří.', 'A break is work too. I say it every day and nobody believes me.');
    });
    renderFive();
    langHooks.push(renderFive);

    /* ---------- confetti: the first task of the day, then every fifth ---------- */
    const doneTile = $('[data-joy-done]', joy);
    const checks = $$('[data-joy-check]', doneTile);
    const doneCount = $('[data-joy-done-count]', doneTile);
    let done = 0;
    const renderDone = () => { doneCount.textContent = L(`Dnes hotovo: ${done}`, `Done today: ${done}`); };
    checks.forEach((c) => c.addEventListener('change', () => {
      done += c.checked ? 1 : -1;
      renderDone();
      if (!c.checked) return;
      if (done === 1 || done % 5 === 0) burstFrom(c, done === 5 ? 90 : 55);
      const left = checks.length - done;
      if (done === 1) miniSay('dalibor', 'Jeden kmen na hrázi. Pokračujem.', 'One log on the dam. Keep going.');
      else if (left > 0) miniSay('dalibor', `Ještě ${left} ${czPl(left, 'kmen', 'kmeny', 'kmenů')} a hráz je hotová.`, `${left} more ${left === 1 ? 'log' : 'logs'} and the dam is finished.`);
      else miniSay('dalibor', `${done} hotových úkolů. Hráz stojí, voda teče, kudy má.`, `${done} tasks done. The dam holds, the water flows where it should.`);
    }));
    renderDone();
    langHooks.push(renderDone);

    /* ---------- seasons and name days ---------- */
    const NAMEDAYS = '01-02=Karina|01-03=Radmila|01-04=Diana|01-05=Dalimil|01-07=Vilma|01-08=Čestmír|01-09=Vladan|01-10=Břetislav|01-11=Bohdana|01-12=Pravoslav|01-13=Edita|01-14=Radovan|01-15=Alice|01-16=Ctirad|01-17=Drahoslav|01-18=Vladislav|01-19=Doubravka|01-20=Ilona|01-21=Běla|01-22=Slavomír|01-23=Zdeněk|01-24=Milena|01-25=Miloš|01-26=Zora|01-27=Ingrid|01-28=Otýlie|01-29=Zdislava|01-30=Robin|01-31=Marika|02-01=Hynek|02-02=Nela|02-03=Blažej|02-04=Jarmila|02-05=Dobromila|02-06=Vanda|02-07=Veronika|02-08=Milada|02-09=Apolena|02-10=Mojmír|02-11=Božena|02-12=Slavěna|02-13=Věnceslav|02-14=Valentin|02-15=Jiřina|02-16=Ljuba|02-17=Miloslava|02-18=Gizela|02-19=Patrik|02-20=Oldřich|02-21=Lenka|02-22=Petr|02-23=Svatopluk|02-24=Matěj|02-25=Liliana|02-26=Dorota|02-27=Alexandr|02-28=Lumír|02-29=Horymír|03-01=Bedřich|03-02=Anežka|03-03=Kamil|03-04=Stella|03-05=Kazimír|03-06=Miroslav|03-07=Tomáš|03-08=Gabriela|03-09=Františka|03-10=Viktorie|03-11=Anděla|03-12=Řehoř|03-13=Růžena|03-14=Rut|03-15=Ida|03-16=Elena|03-17=Vlastimil|03-18=Eduard|03-19=Josef|03-20=Světlana|03-21=Radek|03-22=Leona|03-23=Ivona|03-24=Gabriel|03-25=Marian|03-26=Emanuel|03-27=Dita|03-28=Soňa|03-29=Taťána|03-30=Arnošt|03-31=Kvido|04-01=Hugo|04-02=Erika|04-03=Richard|04-04=Ivana|04-05=Miroslava|04-06=Vendula|04-07=Heřman|04-08=Ema|04-09=Dušan|04-10=Darja|04-11=Izabela|04-12=Julius|04-13=Aleš|04-14=Vincent|04-15=Anastázie|04-16=Irena|04-17=Rudolf|04-18=Valérie|04-19=Rostislav|04-20=Marcela|04-21=Alexandra|04-22=Evženie|04-23=Vojtěch|04-24=Jiří|04-25=Marek|04-26=Oto|04-27=Jaroslav|04-28=Vlastislav|04-29=Robert|04-30=Blahoslav|05-02=Zikmund|05-03=Alexej|05-04=Květoslav|05-05=Klaudie|05-06=Radoslav|05-07=Stanislav|05-09=Ctibor|05-10=Blažena|05-11=Svatava|05-12=Pankrác|05-13=Servác|05-14=Bonifác|05-15=Žofie|05-16=Přemysl|05-17=Aneta|05-18=Nataša|05-19=Ivo|05-20=Zbyšek|05-21=Monika|05-22=Emil|05-23=Vladimír|05-24=Jana|05-25=Viola|05-26=Filip|05-27=Valdemar|05-28=Vilém|05-29=Maxmilián|05-30=Ferdinand|05-31=Kamila|06-01=Laura|06-02=Jarmil|06-03=Tamara|06-04=Dalibor|06-05=Dobroslav|06-06=Norbert|06-07=Iveta|06-08=Medard|06-09=Stanislava|06-10=Gita|06-11=Bruno|06-12=Antonie|06-13=Antonín|06-14=Roland|06-15=Vít|06-16=Zbyněk|06-17=Adolf|06-18=Milan|06-19=Leoš|06-20=Květa|06-21=Alois|06-22=Pavla|06-23=Zdeňka|06-24=Jan|06-25=Ivan|06-26=Adrian|06-27=Ladislav|06-28=Lubomír|06-29=Petr|06-30=Šárka|07-01=Jaroslava|07-02=Patricie|07-03=Radomír|07-04=Prokop|07-05=Cyril a Metoděj|07-07=Bohuslava|07-08=Nora|07-09=Drahoslava|07-10=Libuše|07-11=Olga|07-12=Bořek|07-13=Markéta|07-14=Karolína|07-15=Jindřich|07-16=Luboš|07-17=Martina|07-18=Drahomíra|07-19=Čeněk|07-20=Eliáš|07-21=Vítězslav|07-22=Magdalena|07-23=Libor|07-24=Kristýna|07-25=Jakub|07-26=Anna|07-27=Věroslav|07-28=Viktor|07-29=Marta|07-30=Bořivoj|07-31=Ignác|08-01=Oskar|08-02=Gustav|08-03=Miluše|08-04=Dominik|08-05=Kristián|08-06=Oldřiška|08-07=Lada|08-08=Soběslav|08-09=Roman|08-10=Vavřinec|08-11=Zuzana|08-12=Klára|08-13=Alena|08-14=Alan|08-15=Hana|08-16=Jáchym|08-17=Petra|08-18=Helena|08-19=Ludvík|08-20=Bernard|08-21=Johana|08-22=Bohuslav|08-23=Sandra|08-24=Bartoloměj|08-25=Radim|08-26=Luděk|08-27=Otakar|08-28=Augustin|08-29=Evelína|08-30=Vladěna|08-31=Pavlína|09-01=Linda|09-02=Adéla|09-03=Bronislav|09-04=Jindřiška|09-05=Boris|09-06=Boleslav|09-07=Regína|09-08=Mariana|09-09=Daniela|09-10=Irma|09-11=Denisa|09-12=Marie|09-13=Lubor|09-14=Radka|09-15=Jolana|09-16=Ludmila|09-17=Naděžda|09-18=Kryštof|09-19=Zita|09-20=Oleg|09-21=Matouš|09-22=Darina|09-23=Berta|09-24=Jaromír|09-25=Zlata|09-26=Andrea|09-27=Jonáš|09-28=Václav|09-29=Michal|09-30=Jeroným|10-01=Igor|10-02=Olivie|10-03=Bohumil|10-04=František|10-05=Eliška|10-06=Hanuš|10-07=Justina|10-08=Věra|10-09=Sára|10-10=Marina|10-11=Andrej|10-12=Marcel|10-13=Renáta|10-14=Agáta|10-15=Tereza|10-16=Havel|10-17=Hedvika|10-18=Lukáš|10-19=Michaela|10-20=Vendelín|10-21=Brigita|10-22=Sabina|10-23=Theodor|10-24=Nina|10-25=Beáta|10-26=Erik|10-27=Šarlota|10-28=Jidáš|10-29=Silvie|10-30=Tadeáš|10-31=Štěpánka|11-01=Felix|11-02=Tobiáš|11-03=Hubert|11-04=Karel|11-05=Miriam|11-06=Liběna|11-07=Saskie|11-08=Bohumír|11-09=Bohdan|11-10=Evžen|11-11=Martin|11-12=Benedikt|11-13=Tibor|11-14=Sáva|11-15=Leopold|11-16=Otmar|11-17=Mahulena|11-18=Romana|11-19=Alžběta|11-20=Nikola|11-21=Albert|11-22=Cecilie|11-23=Klement|11-24=Emilie|11-25=Kateřina|11-26=Artur|11-27=Xenie|11-28=René|11-29=Zina|11-30=Ondřej|12-01=Iva|12-02=Blanka|12-03=Svatoslav|12-04=Barbora|12-05=Jitka|12-06=Mikuláš|12-07=Benjamín|12-08=Květoslava|12-09=Vratislav|12-10=Julie|12-11=Dana|12-12=Simona|12-13=Lucie|12-14=Lydie|12-15=Radana|12-16=Albína|12-17=Daniel|12-18=Miloslav|12-19=Ester|12-20=Dagmar|12-21=Natálie|12-22=Šimon|12-23=Vlasta|12-24=Adam|12-26=Štěpán|12-27=Žaneta|12-28=Bohumila|12-29=Judita|12-30=David|12-31=Silvestr|06-29=Petr a Pavel|12-24=Adam a Eva';
    const stage = $('[data-joy-stage]', joy);
    const occChip = $('[data-joy-occ]', stage);
    const ndChip = $('[data-joy-nameday]', stage);
    const now = new Date();
    const md = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayName = (NAMEDAYS.split('|').find((e) => e.startsWith(md + '=')) || '').slice(6);
    const OCC = {
      halloween: { cls: 'is-halloween', fx: '🦇', text: ['🎃 Strašidelně produktivní Halloween!', '🎃 Happy Halloween — spookily productive!'], inka: ['Bubu! Mám osm rukou a všechny strašidelné.', 'Boo! Eight arms and all of them spooky.'] },
      christmas: { cls: 'is-christmas', fx: '❄️', text: ['🎄 Krásný Štědrý den a klidné Vánoce.', '🎄 Merry Christmas!'], inka: ['Osm rukou, osm rukavic. Venku sněží!', 'Eight arms, eight mittens. It’s snowing!'] },
      valentine: { cls: 'is-valentine', fx: '💗', text: ['💌 Valentýn. Napiš dnes někomu milou zprávu.', '💌 Valentine’s Day. Send someone a kind note today.'], inka: ['Osm rukou, osm objetí.', 'Eight arms, eight hugs.'] },
      easter: { cls: 'is-easter', fx: '🥚', text: ['🐣 Veselé Velikonoce!', '🐣 Happy Easter!'], inka: ['Vajíčka! Jedno do každé ruky.', 'Eggs! One for every arm.'] },
      mikulas: { cls: '', fx: '', text: null, inka: ['Já jsem hodná. Všech osm rukou to potvrdí.', 'I’ve been good. All eight arms can vouch.'] },
    };
    const sz = { occ: null, angel: false };
    function renderSeason() {
      ndChip.hidden = !todayName;
      ndChip.textContent = todayName ? L(`🎂 Svátek má ${todayName}`, `🎂 Czech name day: ${todayName}`) : '';
      const o = OCC[sz.occ];
      occChip.hidden = !o;
      if (o) occChip.textContent = o.text ? L(o.text[0], o.text[1]) : sz.angel
        ? L('😇 Mikuláš listoval tvým seznamem: 12 hotových úkolů a nic po termínu. Anděl to jistí.', '😇 Saint Nicholas read your list: 12 tasks done, nothing overdue. The angel has this one.')
        : L('😈 Čert si poznamenal 2 úkoly po termínu. Odškrtni dnes aspoň jeden a máš to u Mikuláše vyžehlené.', '😈 The devil noted 2 overdue tasks. Tick off one today and Saint Nicholas will let it go.');
      $$('[data-occ]', stage).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.occ === sz.occ)));
    }
    function effect(kind) {
      if (reduced || !kind) return;
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      for (let i = 0; i < 14; i++) {
        const el = document.createElement('span');
        el.className = 'joy-fx';
        el.textContent = kind === '🥚' ? pick(['🥚', '🐣', '🥚', '🌷']) : kind;
        el.style.fontSize = `${16 + Math.random() * 14}px`;
        stage.appendChild(el);
        const x = Math.random() * W;
        const d = 1800 + Math.random() * 1600;
        const kf = kind === '🦇'
          ? [{ transform: `translate(${-40}px, ${30 + Math.random() * (H - 60)}px) scale(0.8)` }, { transform: `translate(${W / 2}px, ${Math.random() * H * 0.6}px) scale(1.1)` }, { transform: `translate(${W + 40}px, ${Math.random() * H}px) scale(0.8)` }]
          : kind === '❄️'
            ? [{ transform: `translate(${x}px, -30px) rotate(0)`, opacity: 0.9 }, { transform: `translate(${x + (Math.random() - 0.5) * 60}px, ${H + 10}px) rotate(180deg)`, opacity: 0.9 }]
            : kind === '💗'
              ? [{ transform: `translate(${x}px, ${H}px) scale(0.6)`, opacity: 1 }, { transform: `translate(${x + (Math.random() - 0.5) * 50}px, -30px) scale(1.1)`, opacity: 0 }]
              : [{ transform: `translate(-30px, ${H - 34}px) rotate(0)` }, { transform: `translate(${W * (0.3 + Math.random() * 0.7)}px, ${H - 34}px) rotate(${360 + Math.random() * 360}deg)` }];
        el.animate(kf, { duration: d, delay: Math.random() * 900, easing: kind === '🥚' ? 'cubic-bezier(.2,.7,.3,1)' : 'linear', fill: 'both' }).onfinish = () => el.remove();
      }
    }
    function playOcc(id) {
      sz.occ = id;
      if (id === 'mikulas') sz.angel = !sz.angel;
      const o = OCC[id];
      stage.className = `joy-home ${o.cls}`.trim();
      renderSeason();
      effect(o.fx);
      miniSay('inka', o.inka[0], o.inka[1]);
    }
    $$('[data-occ]', stage).forEach((b) => b.addEventListener('click', () => playOcc(b.dataset.occ)));
    let seasonSeen = false;
    new IntersectionObserver((es) => {
      if (es[0].isIntersecting && !seasonSeen) { seasonSeen = true; setTimeout(() => playOcc('halloween'), 400); }
    }, { threshold: 0.6 }).observe(stage);
    renderSeason();
    langHooks.push(renderSeason);

    /* ---------- easter egg: five quick clicks on the E logo (here and in the nav) ---------- */
    const eggLogo = $('[data-joy-egg-logo]', joy);
    const dots = $$('[data-joy-egg-dots] i', joy);
    let eggN = 0;
    let eggLast = 0;
    let unlocked = false;
    const showDots = () => dots.forEach((d, i) => d.classList.toggle('is-on', i < eggN));
    function eggClick(src) {
      const t = performance.now();
      eggN = t - eggLast <= 650 ? eggN + 1 : 1;
      eggLast = t;
      showDots();
      eggLogo.classList.remove('is-tap'); void eggLogo.offsetWidth;
      if (src === eggLogo) eggLogo.classList.add('is-tap');
      if (eggN < 5) return;
      eggN = 0;
      setTimeout(showDots, 700);
      burstFrom(src, 80);
      eggLogo.classList.remove('is-done'); void eggLogo.offsetWidth; eggLogo.classList.add('is-done');
      toast(unlocked ? L('🎉 Drobné radosti už máš zapnuté', '🎉 Little extras are on already') : L('🎉 Drobné radosti odemčeny', '🎉 Little extras unlocked'));
      unlocked = true;
      $$('.joy-char .mc-fig', joy).forEach((f, i) => setTimeout(() => happy(f, 1600), i * 90));
    }
    eggLogo.addEventListener('click', () => eggClick(eggLogo));
    eggLogo.addEventListener('animationend', () => eggLogo.classList.remove('is-done'));
    $$('.brand').forEach((b) => b.addEventListener('click', () => eggClick($('img', b) || b)));
  }

  /* Magnetic buttons */
  if (finePointer && !reduced) {
    $$('[data-magnetic]').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.18;
        const y = (e.clientY - r.top - r.height / 2) * 0.3;
        b.style.transform = `translate(${x}px, ${y - 2}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Counters                                                            */
  /* ------------------------------------------------------------------ */
  const counters = $$('[data-count]');
  const fmtCount = (el, v) => {
    const dec = Number(el.dataset.decimals || 0);
    el.textContent = v.toLocaleString(t('locale'), { minimumFractionDigits: dec, maximumFractionDigits: dec });
  };
  counters.forEach((el) => fmtCount(el, Number(el.dataset.count)));
  langHooks.push(() => counters.forEach((el) => { if (!el._counting) fmtCount(el, Number(el.dataset.count)); }));

  /* ------------------------------------------------------------------ */
  /* Weave: tangled threads straighten into rows behind the logo        */
  /* ------------------------------------------------------------------ */
  const weave = $('[data-weave]');
  let setWeave = null;
  if (weave) {
    const svg = $('svg', weave);
    const COLORS = ['#8b7dff', '#6c5cff', '#4f46e5', '#12a594', '#e93d97', '#f76b15', '#3b82f6'];
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const X = [0, 300, 600, 900, 1200];
    const paths = COLORS.map((color, i) => {
      const o = i - 3;
      const straightY = [140 + o * 26, 140 + o * 11, 140 + o * 3.2, 140 + o * 11, 140 + o * 26];
      const tangledY = X.map(() => 20 + rnd() * 240);
      // Each path: 5 anchors, 4 cubic segments, 2 control points per segment ([x, y] pairs).
      const build = (Y, wild) => {
        const pts = [[X[0], Y[0]]];
        for (let k = 0; k < 4; k++) {
          const dx = 100;
          const j1 = wild ? [(rnd() - 0.5) * 220, (rnd() - 0.5) * 320] : [0, 0];
          const j2 = wild ? [(rnd() - 0.5) * 220, (rnd() - 0.5) * 320] : [0, 0];
          pts.push([X[k] + dx + j1[0], Y[k] + j1[1]], [X[k + 1] - dx + j2[0], Y[k + 1] + j2[1]], [X[k + 1], Y[k + 1]]);
        }
        return pts;
      };
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      el.setAttribute('stroke', color);
      el.setAttribute('stroke-opacity', '0.85');
      svg.appendChild(el);
      return { el, a: build(tangledY, true), b: build(straightY, false) };
    });
    const logo = $('[data-weave-logo]', weave);
    setWeave = (p) => {
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      paths.forEach(({ el, a, b }) => {
        const pt = a.map((q, i) => [q[0] + (b[i][0] - q[0]) * e, q[1] + (b[i][1] - q[1]) * e]);
        let d = `M${pt[0][0].toFixed(1)} ${pt[0][1].toFixed(1)}`;
        for (let k = 1; k < pt.length; k += 3) d += ` C${pt[k].join(' ')} ${pt[k + 1].join(' ')} ${pt[k + 2].join(' ')}`;
        el.setAttribute('d', d);
      });
      const lp = clamp((p - 0.62) / 0.38, 0, 1);
      logo.style.opacity = String(lp);
      logo.style.transform = `scale(${0.5 + lp * 0.5}) rotate(${(1 - lp) * -20}deg)`;
    };
    setWeave(anim ? 0 : 1);
  }

  /* ------------------------------------------------------------------ */
  /* Morph stage: one set of records → outline → table → kanban → board  */
  /* ------------------------------------------------------------------ */
  const morph = $('[data-morph]');
  const M = {
    cs: {
      title: 'Spuštění aplikace Eiddie', crumb: 'Projekty /', tag: '#projekt', parent: 'Milníky',
      records: '5 záznamů', filter: 'Filtr', group: 'Seskupit', sort: 'Řadit',
      cols: ['Název', 'Status', 'Priorita', 'Termín', 'Štítky'], add: 'Nový záznam',
      fs: 'Status', fp: 'Priorita', fd: 'Termín',
      section: 'Spuštění', noteT: 'Proč?', noteB: 'Jeden nástroj na odrážky, tabule i tabulky. Všechno v Markdownu.',
      l1: 'blokuje', l2: 'navazuje',
    },
    en: {
      title: 'Eiddie launch', crumb: 'Projects /', tag: '#project', parent: 'Milestones',
      records: '5 records', filter: 'Filter', group: 'Group', sort: 'Sort',
      cols: ['Name', 'Status', 'Priority', 'Due', 'Tags'], add: 'New record',
      fs: 'Status', fp: 'Priority', fd: 'Due',
      section: 'Launch', noteT: 'Why?', noteB: 'One tool for outlines, boards and tables. All in Markdown.',
      l1: 'blocks', l2: 'leads to',
    },
  };
  const ITEMS = [
    { t: { cs: 'Doladit outliner', en: 'Finish outliner polish' }, s: 'Doing', p: 'High', d: { cs: 'po 5. 10.', en: 'Mon Oct 5' }, col: 1 },
    { t: { cs: 'Kanban + kalendář', en: 'Kanban + calendar' }, s: 'Todo', p: 'High', d: { cs: 'pá 9. 10.', en: 'Fri Oct 9' }, col: 0 },
    { t: { cs: 'Testy Markdownu', en: 'Markdown tests' }, s: 'Done', p: 'Medium', d: { cs: 'st 30. 9.', en: 'Wed Sep 30' }, col: 2 },
    { t: { cs: 'Článek ke spuštění', en: 'Launch blog post' }, s: 'Todo', p: 'Low', d: { cs: 'pá 16. 10.', en: 'Fri Oct 16' }, col: 0 },
    { t: { cs: 'Wireframy webu', en: 'Website wireframes' }, s: 'Doing', p: 'Medium', d: { cs: 'po 12. 10.', en: 'Mon Oct 12' }, col: 1 },
  ];
  const SP = { Todo: 'gray', Doing: 'blue', Done: 'green' };
  const PP = { High: 'red', Medium: 'yellow', Low: 'teal' };
  const pill = (txt, c) => `<span class="pill pill--${c}">${txt}</span>`;

  // Target geometry per state (stage is a fixed 1000 × 600 canvas, scaled to fit).
  const KCOL = [40, 355, 670];
  const BOARD = [[90, 110], [380, 110], [90, 330], [380, 330], [700, 140]];
  const STATES = [
    ITEMS.map((_, i) => ({ x: 80, y: 150 + i * 84, w: 760, h: 64 })),
    ITEMS.map((_, i) => ({ x: 40, y: 130 + i * 54, w: 920, h: 54 })),
    (() => { const n = [0, 0, 0]; return ITEMS.map((it) => ({ x: KCOL[it.col] + 10, y: 84 + n[it.col]++ * 104, w: 270, h: 92 })); })(),
    ITEMS.map((_, i) => ({ x: BOARD[i][0], y: BOARD[i][1], w: 240, h: 92 })),
  ];
  const BG = [0, 0, 1, 1];
  const LINE = [0, 1, 0, 0];
  const FACE = [0, 1, 2, 2]; // 0 outline face, 1 table row, 2 card

  let applyStep = () => {};

  if (morph) {
    const stage = $('[data-stage]', morph);
    const wrap = $('[data-stage-wrap]', morph);
    const steps = $$('[data-step]', morph);
    const caption = $('[data-step-caption]', morph);
    const vsw = $('[data-vswitch]', morph);
    const vbtns = $$('button', vsw);
    const ind = $('.vswitch__ind', vsw);

    stage.innerHTML = `
      <div class="layer" data-decor="0"></div>
      <div class="layer" data-decor="1"></div>
      <div class="layer" data-decor="2"></div>
      <div class="layer" data-decor="3"></div>
      ${ITEMS.map((it, i) => `<div class="mi${it.s === 'Done' ? ' is-done' : ''}" data-mi="${i}">
        <div class="mi__bg"></div><div class="mi__line"></div>
        <div class="mi__face f-ol"></div><div class="mi__face f-row"></div><div class="mi__face f-card"></div>
      </div>`).join('')}`;
    const decor = $$('[data-decor]', stage);
    const items = $$('[data-mi]', stage);
    const faces = [$$('.f-ol', stage), $$('.f-row', stage), $$('.f-card', stage)];
    const bgs = $$('.mi__bg', stage);
    const lines = $$('.mi__line', stage);

    const renderStage = () => {
      const m = M[lang];
      decor[0].innerHTML = `
        <div class="d-title">${m.title}</div>
        <div class="d-sub">${m.crumb} ${pill(m.tag, 'purple')}</div>
        <div class="d-parent">${m.parent}</div>
        <div class="d-guide"></div>`;
      decor[1].innerHTML = `
        <div class="d-toolbar"><b>#task</b><span>${m.records}</span>
          <span><svg class="ic"><use href="#i-filter"/></svg>${m.filter}</span>
          <span><svg class="ic"><use href="#i-layers"/></svg>${m.group}</span>
          <span><svg class="ic"><use href="#i-sort"/></svg>${m.sort}</span></div>
        <div class="d-thead"><span></span>
          <span><svg class="ic"><use href="#i-text"/></svg>${m.cols[0]}</span>
          <span><svg class="ic"><use href="#i-status"/></svg>${m.cols[1]}</span>
          <span><svg class="ic"><use href="#i-flag"/></svg>${m.cols[2]}</span>
          <span><svg class="ic"><use href="#i-calendar"/></svg>${m.cols[3]}</span>
          <span><svg class="ic"><use href="#i-hash"/></svg>${m.cols[4]}</span></div>
        <div class="d-newrow"><svg class="ic"><use href="#i-plus"/></svg>${m.add}</div>`;
      const cols = [['Todo', '#8b8b98', 2], ['Doing', '#3b82f6', 2], ['Done', '#2f9e6a', 1]];
      decor[2].innerHTML = cols.map(([n, c, k], i) =>
        `<div class="d-col" style="left:${KCOL[i]}px"><header><i style="background:${c}"></i>${n}<span>${k}</span></header></div>`).join('');
      if (!decor[3].firstChild) {
        decor[3].innerHTML = `
          <div class="d-dots"></div>
          <div class="d-section" style="width:590px"><b data-t="section"></b></div>
          <div class="d-note" style="left:690px"><b data-t="noteT"></b><span data-t="noteB"></span></div>
          <svg class="d-arrows" viewBox="0 0 1000 600">
            <path data-arrow d="M330 156 C 350 156, 360 156, 374 156"/>
            <path data-arrow d="M210 202 C 210 250, 210 280, 210 322"/>
            <path data-arrow d="M620 156 C 660 156, 660 186, 694 186"/>
            <polygon class="head" data-head points="380,156 371,151 371,161"/>
            <polygon class="head" data-head points="210,329 205,320 215,320"/>
            <polygon class="head" data-head points="700,186 691,181 691,191"/>
          </svg>
          <span class="d-label" style="left:222px;top:254px" data-t="l1"></span>
          <span class="d-label" style="left:632px;top:122px" data-t="l2"></span>`;
      }
      $$('[data-t]', decor[3]).forEach((el) => { el.textContent = m[el.dataset.t]; });
      ITEMS.forEach((it, i) => {
        const tt = it.t[lang];
        const done = it.s === 'Done';
        faces[0][i].innerHTML = `
          <div class="l1"><span class="cb${done ? ' is-on' : ''}"></span><span class="tt">${tt}</span>${pill('#task', 'blue')}</div>
          <div class="l2"><span class="k">${m.fs}</span>${pill(it.s, SP[it.s])}<span>·</span><span class="k">${m.fp}</span>${pill(it.p, PP[it.p])}<span>·</span><span class="k">${m.fd}</span>${pill(it.d[lang], 'blue')}</div>`;
        faces[1][i].innerHTML = `
          <span><span class="cb${done ? ' is-on' : ''}"></span></span><span class="t">${tt}</span>
          <span>${pill(it.s, SP[it.s])}</span><span>${pill(it.p, PP[it.p])}</span>
          <span class="d">${it.d[lang]}</span><span>${pill('#task', 'blue')}</span>`;
        faces[2][i].innerHTML = `
          <div class="t"><span class="cb${done ? ' is-on' : ''}"></span>${tt}</div>
          <div class="m">${pill(it.p, PP[it.p])}${pill(it.d[lang], 'blue')}</div>`;
      });
      $$('.f-row', stage).forEach((r) => { r.style.height = '54px'; });
    };
    renderStage();

    // Fit the 1000 × 600 canvas into the window
    const fit = () => {
      const w = wrap.clientWidth;
      const pinned = matchMedia('(min-width: 901px)').matches;
      const maxH = pinned ? Math.max(320, innerHeight - 200) : Infinity;
      const s = Math.min(w / 1000, maxH / 600);
      stage.style.transform = `translateX(${Math.max(0, (w - 1000 * s) / 2)}px) scale(${s})`;
      wrap.style.height = `${Math.round(600 * s)}px`;
    };
    fit();
    addEventListener('resize', fit);

    const moveIndicator = (k) => {
      const b = vbtns[k];
      vbtns.forEach((x, i) => { x.classList.toggle('is-on', i === k); x.setAttribute('aria-pressed', String(i === k)); });
      ind.style.width = `${b.offsetWidth}px`;
      ind.style.transform = `translateX(${b.offsetLeft - 3}px)`;
    };
    let active = -1;
    const setActive = (k) => {
      if (k === active) return;
      active = k;
      steps.forEach((s, i) => s.classList.toggle('is-active', i === k));
      if (caption) caption.innerHTML = $('p', steps[k]).innerHTML;
      moveIndicator(k);
    };
    langHooks.push(() => {
      renderStage();
      if (caption && active >= 0) caption.innerHTML = $('p', steps[active]).innerHTML;
      requestAnimationFrame(() => moveIndicator(Math.max(0, active)));
      if (!anim) applyState(Math.max(0, active));
    });

    // Instant state (no GSAP / reduced motion)
    const applyState = (k) => {
      items.forEach((el, i) => {
        const g = STATES[k][i];
        el.style.transform = `translate(${g.x}px, ${g.y}px)`;
        el.style.width = `${g.w}px`;
        el.style.height = `${g.h}px`;
        faces.forEach((f, fi) => { f[i].style.opacity = fi === FACE[k] ? 1 : 0; f[i].style.visibility = fi === FACE[k] ? 'visible' : 'hidden'; });
        bgs[i].style.opacity = BG[k];
        lines[i].style.opacity = LINE[k];
      });
      decor.forEach((d, i) => { d.style.opacity = i === k ? 1 : 0; d.style.visibility = i === k ? 'visible' : 'hidden'; });
      $$('[data-arrow]', stage).forEach((p) => { p.style.strokeDasharray = 'none'; });
    };

    if (!anim) {
      applyState(0);
      setActive(0);
      applyStep = (k) => { applyState(k); setActive(k); };
      steps.forEach((s, k) => s.addEventListener('click', () => applyStep(k)));
    } else {
      // Build one timeline with a hold on every state; scroll scrubs it on desktop.
      const HOLD = 0.4;
      const TR = 1;
      const starts = [1, 2, 3].map((k) => HOLD + (k - 1) * (TR + HOLD));
      const labels = [0, ...starts.map((s) => s + TR + HOLD / 2)];
      const TOTAL = HOLD + 3 * (TR + HOLD);

      const build = () => {
        const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
        // initial state
        items.forEach((el, i) => {
          const g = STATES[0][i];
          gsap.set(el, { x: g.x, y: g.y, width: g.w, height: g.h });
        });
        faces.forEach((f, fi) => gsap.set(f, { autoAlpha: fi === 0 ? 1 : 0 }));
        gsap.set(bgs, { opacity: 0 });
        gsap.set(lines, { opacity: 0 });
        decor.forEach((d, i) => gsap.set(d, { autoAlpha: i === 0 ? 1 : 0 }));
        const arrows = $$('[data-arrow]', stage);
        const heads = $$('[data-head]', stage);
        arrows.forEach((p) => { const L = p.getTotalLength(); gsap.set(p, { strokeDasharray: L, strokeDashoffset: L }); });
        gsap.set(heads, { opacity: 0 });

        [1, 2, 3].forEach((k) => {
          const at = starts[k - 1];
          items.forEach((el, i) => {
            const A = STATES[k - 1][i];
            const B = STATES[k][i];
            tl.fromTo(el, { x: A.x, y: A.y, width: A.w, height: A.h },
              { x: B.x, y: B.y, width: B.w, height: B.h, duration: TR * 0.8, immediateRender: false }, at + i * 0.05);
          });
          if (FACE[k] !== FACE[k - 1]) {
            tl.fromTo(faces[FACE[k - 1]], { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.25, immediateRender: false }, at);
            tl.fromTo(faces[FACE[k]], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, immediateRender: false }, at + TR * 0.55);
          }
          if (BG[k] !== BG[k - 1]) tl.fromTo(bgs, { opacity: BG[k - 1] }, { opacity: BG[k], duration: 0.4, immediateRender: false }, at + 0.2);
          if (LINE[k] !== LINE[k - 1]) tl.fromTo(lines, { opacity: LINE[k - 1] }, { opacity: LINE[k], duration: 0.3, immediateRender: false }, at + (LINE[k] ? 0.5 : 0));
          tl.fromTo(decor[k - 1], { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.35, immediateRender: false }, at);
          tl.fromTo(decor[k], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, immediateRender: false }, at + TR * 0.45);
          if (k === 3) {
            tl.to(arrows, { strokeDashoffset: 0, duration: 0.35, stagger: 0.08, ease: 'power1.out' }, at + TR * 0.7);
            tl.to(heads, { opacity: 1, duration: 0.15, stagger: 0.08 }, at + TR * 0.85);
          }
        });
        tl.set({}, {}, TOTAL);

        const update = () => {
          const time = tl.time();
          let k = 0;
          starts.forEach((s, i) => { if (time >= s + TR * 0.5) k = i + 1; });
          setActive(k);
          steps.forEach((s, i) => {
            const ws = i === 0 ? 0 : starts[i - 1] + TR * 0.5;
            const we = i === 3 ? TOTAL : starts[i] + TR * 0.5;
            s.style.setProperty('--p', clamp((time - ws) / (we - ws), 0, 1).toFixed(3));
          });
        };
        tl.eventCallback('onUpdate', update);
        update();
        return { tl, labels, TOTAL };
      };

      const mm = gsap.matchMedia();
      mm.add('(min-width: 901px)', () => {
        const { tl, labels: L, TOTAL: total } = build();
        const st = ST.create({
          trigger: morph,
          start: 'top top',
          end: () => `+=${Math.round(innerHeight * 3.4)}`,
          pin: true,
          scrub: 0.8,
          animation: tl,
          refreshPriority: 10,
          snap: { snapTo: L.map((x) => x / total), inertia: false, duration: { min: 0.25, max: 0.8 }, delay: 0.15, ease: 'power1.inOut' },
        });
        applyStep = (k) => scrollToY(st.start + (st.end - st.start) * (L[k] / total));
        const handlers = steps.map((s, k) => { const h = () => applyStep(k); s.addEventListener('click', h); return h; });
        return () => steps.forEach((s, k) => s.removeEventListener('click', handlers[k]));
      });
      mm.add('(max-width: 900px)', () => {
        const { tl, labels: L } = build();
        let k = 0;
        let timer;
        let visible = false;
        // Autoplay until the visitor picks a view themselves; then the chosen view stays (WCAG 2.2.2) and,
        // only from then on, the caption is announced (no screen reader chatter every 3.6 s).
        let manual = false;
        const go = (n) => {
          clearTimeout(timer);
          gsap.killTweensOf([stage, tl]);
          if (n === 0 && k !== 0) {
            gsap.to(stage, { opacity: 0, duration: 0.3, onComplete: () => { tl.seek(0, false); gsap.to(stage, { opacity: 1, duration: 0.4 }); } });
          } else {
            gsap.set(stage, { opacity: 1 });
            tl.tweenTo(L[n], { duration: 1.3, ease: 'power2.inOut' });
          }
          k = n;
          if (visible && !manual) timer = setTimeout(() => go((k + 1) % 4), 3600);
        };
        const io = new IntersectionObserver(([e]) => {
          visible = e.isIntersecting;
          clearTimeout(timer);
          if (visible && !manual) timer = setTimeout(() => go((k + 1) % 4), 2000);
        }, { threshold: 0.4 });
        io.observe(wrap);
        applyStep = (n) => {
          manual = true;
          go(n);
        };
        const handlers = steps.map((s, n) => { const h = () => applyStep(n); s.addEventListener('click', h); return h; });
        return () => {
          io.disconnect();
          clearTimeout(timer);
          steps.forEach((s, n) => s.removeEventListener('click', handlers[n]));
        };
      });
    }
    // The view buttons in the window bar drive the same state as the steps: on desktop they scroll the pinned
    // section to that view (the scrub plays the morph), on mobile they jump the carousel and stop its autoplay.
    // applyStep is reassigned per mode, so one listener always reaches the current implementation.
    // The visible caption is not a live region (on phones it changes on every autoplay step and while the
    // timeline passes the views in between); the chosen view is announced once here.
    const viewStatus = $('[data-view-status]', morph);
    vbtns.forEach((b, k) => b.addEventListener('click', () => {
      applyStep(k);
      if (viewStatus) viewStatus.textContent = `${$('h3', steps[k]).textContent.trim()}: ${$('p', steps[k]).textContent.trim()}`;
    }));
    // Button widths change with the web font and at the 900 px breakpoint (icon-only below it)
    const remeasure = () => moveIndicator(Math.max(0, active));
    requestAnimationFrame(remeasure);
    addEventListener('resize', () => requestAnimationFrame(remeasure));
    if (document.fonts) document.fonts.ready.then(remeasure);
  }

  /* ------------------------------------------------------------------ */
  /* Word splitter for headings (keeps &nbsp; pairs together)            */
  /* ------------------------------------------------------------------ */
  function splitWords(el) {
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/([ \t\n\r]+)/).forEach((p) => {
            if (!p) return;
            if (/^[ \t\n\r]+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            if (/^[.,:;!?…)\]“”"’]+$/.test(p)) {
              // Punctuation right after an element (e.g. "</em>.") stays inline so it never wraps alone.
              const sp = document.createElement('span');
              sp.className = 'wp';
              sp.textContent = p;
              frag.appendChild(sp);
              return;
            }
            const w = document.createElement('span');
            w.className = 'w';
            const i = document.createElement('span');
            i.className = 'wi';
            i.textContent = p;
            w.appendChild(i);
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR' && !n.classList.contains('w')) walk(n); // .w = already split in the markup (slogan initials)
      });
    };
    walk(el);
    // The words are inline-blocks, so a line may still break between "</em>" and its ".": wrap the last word of the
    // element together with the punctuation in a no-wrap span (in a shallow copy of the <em>, styles stay the same).
    $$('.wp', el).forEach((sp) => {
      const prev = sp.previousSibling;
      if (!prev || prev.nodeType !== 1) return;
      const last = prev.classList.contains('w') ? prev : $$('.w', prev).pop();
      if (!last) return;
      const nb = document.createElement('span');
      nb.className = 'nb';
      prev.after(nb);
      let host = nb;
      const chain = [];
      for (let p = last.parentElement; p && p !== prev.parentElement; p = p.parentElement) chain.unshift(p);
      chain.forEach((p) => { const c = p.cloneNode(false); host.appendChild(c); host = c; });
      host.appendChild(last);
      nb.appendChild(sp);
      if (prev !== last && !prev.textContent.trim()) prev.remove();
    });
    el.classList.add('is-split');
    return $$('.wi', el);
  }

  /* ------------------------------------------------------------------ */
  /* Apply language now (before splitting headings)                      */
  /* ------------------------------------------------------------------ */
  applyLang();

  /* ------------------------------------------------------------------ */
  /* Scroll-driven animations (GSAP)                                     */
  /* ------------------------------------------------------------------ */
  if (!anim) {
    $$('[data-hero-in], [data-hero-visual], [data-hero-title]').forEach((el) => { el.style.opacity = 1; });
    // Deep link without GSAP (start.html#databases from the app, or reduced motion): the browser scrolls to the fragment
    // before web fonts and the language switch settle, so the section ends up lower. Jump once more when everything
    // has loaded, unless the visitor has scrolled on their own by then.
    const target = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) {
      let touched = false;
      ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((t) => addEventListener(t, () => { touched = true; }, { once: true, passive: true }));
      const loaded = new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })));
      Promise.all([loaded, document.fonts ? document.fonts.ready : null]).then(() => requestAnimationFrame(() => {
        if (touched) return;
        root.style.scrollBehavior = 'auto'; // instant, also where scrollIntoView has no 'instant'
        target.scrollIntoView({ block: 'start' });
        root.style.scrollBehavior = '';
      }));
    }
    return;
  }

  // Hero intro (landing page only)
  if ($('.hero')) {
    const heroTitle = $('[data-hero-title]');
    const heroWords = heroTitle ? splitWords(heroTitle) : [];
    const heroIn = $$('[data-hero-in]');
    const heroVisual = $('[data-hero-visual]');
    const floats = $$('[data-float]');
    gsap.set(heroWords, { yPercent: 115 });
    if (heroTitle) gsap.set(heroTitle, { opacity: 1 });
    gsap.set(heroIn, { opacity: 0, y: 22 });
    gsap.set(heroVisual, { opacity: 0, y: 70 });
    gsap.set(floats, { opacity: 0, scale: 0.85 });
    const intro = () => {
      gsap.timeline({ defaults: { ease: 'power4.out' } })
        .to(heroIn[0], { opacity: 1, y: 0, duration: 0.8 }, 0)
        .to(heroWords, { yPercent: 0, duration: 1.1, stagger: 0.07, onStart: () => heroTitle.classList.add('is-shown') }, 0.08)
        .to(heroIn.slice(1), { opacity: 1, y: 0, duration: 0.9, stagger: 0.1 }, 0.45)
        .to(heroVisual, { opacity: 1, y: 0, duration: 1.4, ease: 'power3.out' }, 0.6)
        .to(floats, { opacity: 1, scale: 1, duration: 0.9, stagger: 0.12, ease: 'back.out(1.6)' }, 1.1);
    };
    Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 700))]).then(intro);

    // Hero: tilt flattens and chips drift as you scroll
    const tilt = $('[data-hero-tilt]');
    if (tilt) {
      gsap.fromTo(tilt, { rotateX: 16, scale: 0.94 }, {
        rotateX: 0, scale: 1, ease: 'none',
        scrollTrigger: { trigger: heroVisual, start: 'top 92%', end: 'top 18%', scrub: 0.6 },
      });
    }
    floats.forEach((f) => {
      gsap.to(f, { y: Number(f.dataset.float), ease: 'none', scrollTrigger: { trigger: heroVisual, start: 'top 70%', end: 'bottom top', scrub: 0.6 } });
    });
    gsap.to('.aurora', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  // Section headings: words rise out of a mask
  $$('[data-split]').forEach((el) => {
    let words = splitWords(el);
    gsap.set(words, { yPercent: 115 });
    ST.create({
      trigger: el, start: 'top 86%', once: true,
      onEnter: () => { el.classList.add('is-shown'); gsap.to(words, { yPercent: 0, duration: 1.05, ease: 'power4.out', stagger: 0.045 }); },
    });
    // A language switch puts the unsplit HTML back; without the .wi spans the <em> part of an .is-split heading
    // has no gradient and stays transparent. Split it again and keep the reveal state.
    langHooks.push(() => {
      if (el.querySelector('.wi')) return;
      words = splitWords(el);
      if (!el.classList.contains('is-shown')) gsap.set(words, { yPercent: 115 });
    });
  });

  // Generic reveals, batched so neighbours stagger
  if ($('[data-reveal]')) {
    gsap.set('[data-reveal]', { y: 34 });
    ST.batch('[data-reveal]', {
      start: 'top 90%', once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.95, ease: 'power3.out', stagger: 0.08, overwrite: true }),
    });
  }

  // Weave untangles while scrolling
  if (weave && setWeave) {
    const w = { p: 0 };
    gsap.to(w, {
      p: 1, ease: 'none', onUpdate: () => setWeave(w.p),
      scrollTrigger: { trigger: weave, start: 'top 85%', end: 'center 45%', scrub: 0.8 },
    });
  }

  // Counters
  counters.forEach((el) => {
    const target = Number(el.dataset.count);
    const o = { v: 0 };
    fmtCount(el, 0);
    ST.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => {
        el._counting = true;
        gsap.to(o, {
          v: target, duration: 1.8, ease: 'power3.out',
          onUpdate: () => fmtCount(el, el.dataset.decimals ? o.v : Math.round(o.v)),
          onComplete: () => { el._counting = false; fmtCount(el, target); },
        });
      },
    });
  });

  // Progress bar via ScrollTrigger (keeps it in sync with Lenis)
  if (progress) {
    gsap.fromTo(progress, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.2 } });
  }

  // Deep link (index.html#pilot opened directly): ScrollTrigger.refresh() measures at scroll 0 and restores the
  // position it cached before the browser jumped to the fragment, so the visitor would land on the hero. Jump again
  // after the final measurement, and reveal what is already in view (ST.batch onEnter needs a scroll to fire).
  const hashEl = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (hashEl) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    const loaded = new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })));
    Promise.all([loaded, document.fonts ? document.fonts.ready : null]).then(() => requestAnimationFrame(() => {
      if (lenis) lenis.resize(); // otherwise Lenis clamps the jump to a stale page height
      ST.refresh();
      if (lenis) lenis.scrollTo(hashEl, { immediate: true, force: true }); else hashEl.scrollIntoView();
      requestAnimationFrame(() => {
        ST.update();
        const inView = $$('[data-reveal]').filter((el) => {
          const r = el.getClientRects().length && el.getBoundingClientRect();
          return r && r.top < innerHeight * 0.9 && r.bottom > 0;
        });
        gsap.to(inView, { opacity: 1, y: 0, duration: 0.95, ease: 'power3.out', stagger: 0.08, overwrite: true });
      });
    }));
  }

  // Recalculate once fonts and images have settled
  addEventListener('load', () => ST.refresh());
  if (document.fonts) document.fonts.ready.then(() => ST.refresh());
})();
