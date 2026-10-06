/*
 * Eiddie website: the only file you need to edit before going live.
 * Every button, price and link on the site reads from here.
 */
window.EIDDIE_CONFIG = {
  // Pilot with friends: hides the price, the Buy buttons, the sample reviews and the legal placeholders,
  // and shows the pilot copy instead ([data-pilot-only] in the HTML). Set to false for the public launch.
  // (This file is loaded in <head>, so keep it small and free of side effects.)
  pilot: true,

  // Lemon Squeezy checkout link of the paid product (Products → Share → Checkout URL).
  // Keep "?embed=1" so the checkout opens as an overlay on top of the page.
  checkoutUrl: 'https://YOUR-STORE.lemonsqueezy.com/buy/YOUR-VARIANT-ID?embed=1',

  // Where the installer is downloaded from.
  // Now: the asset "Eiddie-Setup.exe" of the newest GitHub Release of tomasleidl-cmd/eiddie-web
  // ("latest" skips drafts and pre-releases, so a new release needs no change here).
  // The download page asks the GitHub API for that release first and shows its real version and size.
  // Alternative: a free (0 Kč) Lemon Squeezy product, so you also collect e-mails.
  trialUrl: 'https://github.com/tomasleidl-cmd/eiddie-web/releases/latest/download/Eiddie-Setup.exe',

  // Fallback for the download page when the GitHub API can't answer (rate limit); keep roughly current.
  version: '0.1.0',
  installerSize: '≈ 106 MB',
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
    // Pilot mode stops the video here: its last 5 s are the sales end card (999 Kč, 14 days free).
    pilotEnd: 25,
  },

  author: 'Tomáš Leidl',
  email: 'tomas.leidl@gmail.com',

  // Optional: form endpoint (Formspree, Web3Forms, Basin…). Empty → the form opens a pre-filled e-mail.
  formEndpoint: '',
};
