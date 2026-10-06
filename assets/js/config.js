/*
 * Eiddie website: the only file you need to edit before going live.
 * Every button, price and link on the site reads from here.
 */
window.EIDDIE_CONFIG = {
  // Lemon Squeezy checkout link of the paid product (Products → Share → Checkout URL).
  // Keep "?embed=1" so the checkout opens as an overlay on top of the page.
  checkoutUrl: 'https://YOUR-STORE.lemonsqueezy.com/buy/YOUR-VARIANT-ID?embed=1',

  // Where the free 14-day trial installer is downloaded from.
  // Option A: direct link to the .exe (Cloudflare R2, your hosting, a public GitHub release).
  // Option B: a free (0 Kč) Lemon Squeezy product, so you also collect e-mails.
  trialUrl: 'downloads/Eiddie-Setup.exe',

  version: '0.1.0',
  installerSize: '≈ 95 MB',
  trialDays: 14,
  price: { cs: '999 Kč', en: '999 CZK' },
  priceNote: { cs: 'jednorázově', en: 'one-time' },
  devices: 3,

  author: 'Tomáš Leidl',
  email: 'tomas.leidl@gmail.com',

  // Optional: form endpoint (Formspree, Web3Forms, Basin…). Empty → the form opens a pre-filled e-mail.
  formEndpoint: '',
};
