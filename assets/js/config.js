/*
 * Eiddie website: the only file you need to edit before going live.
 * Every button, price and link on the site reads from here.
 */
window.EIDDIE_CONFIG = {
  // Pilot with friends: hides the price, the Buy buttons, the sample reviews and the legal placeholders,
  // and shows the pilot copy instead ([data-pilot-only] in the HTML); koupit.html then says that sales haven't started.
  // Set to false for the public launch, as part of the launch-day runbook in LICENSING.md (website first, then the
  // sale release: scripts/release-pilot.mjs refuses a sale build while this is true).
  // (This file is loaded in <head>, so keep it small and free of side effects.)
  pilot: true,

  // Lemon Squeezy checkout link of the paid product (Products → Share → Checkout URL).
  // Keep "?embed=1" so the checkout opens as an overlay on top of the page.
  // Every Buy button ([data-buy], all pages) adds a remembered discount code as checkout[discount_code]: main.js takes it
  // from koupit.html?code=EIDDIE50K7Q2MX (or ?sleva=, any page), keeps it for the tab and drops anything that isn't
  // 3–64 letters/digits. The app's "Buy Eiddie" opens koupit.html (LICENSING.buyUrl in src/shared/licence/config.ts).
  checkoutUrl: 'https://YOUR-STORE.lemonsqueezy.com/buy/YOUR-VARIANT-ID?embed=1',

  // Where the installer is downloaded from.
  // Now: the asset "Eiddie-Setup.exe" of the newest GitHub Release of tomasleidl-cmd/eiddie-web
  // ("latest" skips drafts and pre-releases, so a new release needs no change here).
  // The download page asks the GitHub API for that release first and shows its real version and size.
  // Alternative: a free (0 Kč) Lemon Squeezy product, so you also collect e-mails.
  trialUrl: 'https://github.com/tomasleidl-cmd/eiddie-web/releases/latest/download/Eiddie-Setup.exe',

  // Fallback for the download page until the GitHub API answers (download.html repeats both for visitors without
  // JavaScript). scripts/release-pilot.mjs rewrites them after each release. If the API fails, the page says
  // "the latest version" instead of this number.
  version: '0.1.10',
  installerSize: '≈ 106 MB',
  // Shown on the site; the app's own values are in src/shared/licence/config.ts (trialDays, devices): keep them equal.
  trialDays: 14,
  price: { cs: '999 Kč', en: '999 CZK' },
  priceNote: { cs: 'jednorázově', en: 'one-time' },
  devices: 3,

  // Intro video (the 30 s promo), one file per language, made by scratch/video/render/web-export.mjs.
  // While ready[lang] is false, the video section and the hero "Watch the video" button stay hidden for that language.
  video: {
    ready: { cs: true, en: true },
    src: 'assets/video/eiddie-promo-{lang}.mp4',
    poster: 'assets/video/eiddie-promo-{lang}.jpg',
    duration: '0:30',
    // The files on the site now are the PILOT renders (end card "Pilotní verze zdarma · www.eiddie.cz", no price), so the
    // video plays to the end. Before the paid launch, export the sales renders again (website/README.md, Video) and set
    // pilotEnd back to 25 only if a sales file is ever shown in pilot mode: pilot mode then stops before its price card.
    pilotEnd: 0,
  },

  author: 'Tomáš Leidl',
  email: 'tomas.leidl@gmail.com',

  // Optional: form endpoint (Formspree, Web3Forms, Basin…). Empty → the form opens a pre-filled e-mail.
  formEndpoint: '',
};
