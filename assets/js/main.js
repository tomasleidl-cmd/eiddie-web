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
      checkoutMissing: 'Platební brána zatím není napojená. Doplň <code>checkoutUrl</code> v assets/js/config.js.',
      checkoutThanks: 'Děkuju za nákup! Za chvíli tě přesměruju…',
      copied: 'E-mail je zkopírovaný ve schránce.',
      todo: 'Tenhle odkaz ještě čeká na doplnění.',
      installerMissing: 'Instalátor zatím není nahraný. Vlož ho do website/downloads/ nebo nastav <code>trialUrl</code> v assets/js/config.js.',
      formInvalid: 'Vyplň prosím jméno, platný e-mail a zprávu.',
      formSending: 'Odesílám…',
      formOk: 'Díky! Zpráva je na cestě, ozvu se co nejdřív.',
      formErr: 'Něco se pokazilo. Napiš mi prosím rovnou na e-mail.',
      formMailto: 'Otevírám tvůj e-mailový program…',
      videoError: 'Video se nepodařilo načíst. Zkus to prosím později.',
      years: { 1: '1 rok', 3: '3 roky', 5: '5 let' },
      subFor: (y) => `Předplatné za ${y}`,
      save: 'Ušetříš',
      payback: 'Eiddie se ti zaplatí za',
      months: (n) => `${n} ${n === 1 ? 'měsíc' : n < 5 ? 'měsíce' : 'měsíců'}`,
      currency: (n) => `${n.toLocaleString('cs-CZ')} Kč`,
      locale: 'cs-CZ',
    },
    en: {
      checkoutMissing: 'The checkout isn’t connected yet. Set <code>checkoutUrl</code> in assets/js/config.js.',
      checkoutThanks: 'Thank you for your purchase! Redirecting you in a moment…',
      copied: 'E-mail address copied to the clipboard.',
      todo: 'This link is still a placeholder.',
      installerMissing: 'The installer isn’t uploaded yet. Put it in website/downloads/ or set <code>trialUrl</code> in assets/js/config.js.',
      formInvalid: 'Please fill in your name, a valid e-mail and a message.',
      formSending: 'Sending…',
      formOk: 'Thanks! Your message is on its way, I’ll reply soon.',
      formErr: 'Something went wrong. Please e-mail me directly.',
      formMailto: 'Opening your e-mail app…',
      videoError: 'The video couldn’t be loaded. Please try again later.',
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
    $$('[data-cfg-mail]').forEach((el) => {
      if (!C.email) return;
      const subject = { bug: 'Eiddie: bug report', team: 'Eiddie: team licence' }[el.dataset.cfgMail] || 'Eiddie';
      el.href = `mailto:${C.email}?subject=${encodeURIComponent(subject)}`;
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
    // Warm up the script when the browser is idle so the overlay opens instantly.
    (window.requestIdleCallback || setTimeout)(() => loadLemon().catch(() => {}), 2500);
  }
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-buy]');
    if (!btn) return;
    e.preventDefault();
    if (!checkoutReady) { toast(t('checkoutMissing'), 6500); return; }
    loadLemon()
      .then(() => window.LemonSqueezy.Url.Open(checkoutUrl))
      .catch(() => { location.href = checkoutUrl.replace(/[?&]embed=1/, ''); });
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
  $$('[data-trial-file]').forEach((a) => { if (trialUrl && !trialViaLemon) a.href = trialUrl; });

  /* Download page: start the installer download automatically */
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
    setTimeout(() => {
      // Same-origin file that isn't uploaded yet → tell the site owner instead of downloading a 404 page.
      const sameOrigin = new URL(trialUrl, location.href).origin === location.origin;
      if (!sameOrigin) { start(); return; }
      fetch(trialUrl, { method: 'HEAD' })
        .then((r) => { if (r.ok) start(); else toast(t('installerMissing'), 8000); })
        .catch(() => start());
    }, 1200);
  }

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

    const reset = () => {
      playBtn.hidden = false;
      endCard.hidden = true;
      reelVideo.controls = false;
    };
    const setSource = () => {
      const ready = !!(V.ready && V.ready[lang] && V.src);
      reelSec.hidden = !ready;
      openBtns.forEach((b) => { b.hidden = !ready; });
      if (V.duration) $$('[data-video-duration]').forEach((el) => { el.textContent = V.duration; });
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
      else if (reelVideo.ended) reelVideo.currentTime = 0;
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
    reelVideo.addEventListener('ended', () => {
      if (document.fullscreenElement === reelVideo && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      const hadFocus = reelSec.contains(document.activeElement);
      reelVideo.controls = false;
      endCard.hidden = false;
      if (hadFocus) $('[data-video-replay]', reelSec).focus({ preventScroll: true });
    });
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
      section: 'Spuštění', noteT: 'Proč?', noteB: 'Jeden nástroj na outline, tabule i tabulky. Všechno v Markdownu.',
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
      vbtns.forEach((x, i) => x.classList.toggle('is-on', i === k));
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
        const go = (n) => {
          clearTimeout(timer);
          if (n === 0 && k !== 0) {
            gsap.to(stage, { opacity: 0, duration: 0.3, onComplete: () => { tl.seek(0); gsap.to(stage, { opacity: 1, duration: 0.4 }); } });
          } else tl.tweenTo(L[n], { duration: 1.3, ease: 'power2.inOut' });
          k = n;
          if (visible) timer = setTimeout(() => go((k + 1) % 4), 3600);
        };
        const io = new IntersectionObserver(([e]) => {
          visible = e.isIntersecting;
          clearTimeout(timer);
          if (visible) timer = setTimeout(() => go((k + 1) % 4), 2000);
        }, { threshold: 0.4 });
        io.observe(wrap);
        applyStep = (n) => go(n);
        const handlers = steps.map((s, n) => { const h = () => go(n); s.addEventListener('click', h); return h; });
        return () => { io.disconnect(); clearTimeout(timer); steps.forEach((s, n) => s.removeEventListener('click', handlers[n])); };
      });
    }
    requestAnimationFrame(() => moveIndicator(Math.max(0, active)));
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
    const words = splitWords(el);
    gsap.set(words, { yPercent: 115 });
    ST.create({
      trigger: el, start: 'top 86%', once: true,
      onEnter: () => { el.classList.add('is-shown'); gsap.to(words, { yPercent: 0, duration: 1.05, ease: 'power4.out', stagger: 0.045 }); },
    });
  });

  // Generic reveals, batched so neighbours stagger
  gsap.set('[data-reveal]', { y: 34 });
  ST.batch('[data-reveal]', {
    start: 'top 90%', once: true,
    onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.95, ease: 'power3.out', stagger: 0.08, overwrite: true }),
  });

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

  // Recalculate once fonts and images have settled
  addEventListener('load', () => ST.refresh());
  if (document.fonts) document.fonts.ready.then(() => ST.refresh());
})();
