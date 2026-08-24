/**
 * prices-api.js — دریافت قیمت طلا، نقره و دلار (Lazy، فقط با فراخوانی صریح)
 * منابع اعتبارسنجی‌شده (2026-08-24):
 *  - طلا/نقره: https://api.gold-api.com/price/XAU|XAG  (USD / troy ounce)
 *  - دلار→ریال: https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json (usd.irr)
 * تبدیل: ۱ اونس تروا = ۳۱٫۱۰۳۴۷۶۸ گرم · تومان = ریال / ۱۰
 */
(function (global) {
  'use strict';

  const TROY_OZ_GRAMS = 31.1034768;
  const GOLD_URL = 'https://api.gold-api.com/price/XAU';
  const SILVER_URL = 'https://api.gold-api.com/price/XAG';
  const USD_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';

  function fetchJson(url, timeoutMs) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = setTimeout(function () { if (ctrl) ctrl.abort(); }, timeoutMs || 12000);
    return fetch(url, {
      method: 'GET',
      signal: ctrl ? ctrl.signal : undefined,
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' @ ' + url);
      return res.json();
    }).finally(function () { clearTimeout(t); });
  }

  /**
   * @returns {Promise<{goldPerGramToman:number|null, silverPerGramToman:number|null, usdToman:number|null, usdIrr:number|null, goldOzUsd:number|null, silverOzUsd:number|null, updatedAt:number, source:string}>}
   */
  function fetchMarketPrices(opts) {
    opts = opts || {};
    const timeoutMs = opts.timeoutMs || 12000;

    return Promise.all([
      fetchJson(GOLD_URL, timeoutMs).catch(function (e) { return { __err: String(e && e.message || e) }; }),
      fetchJson(SILVER_URL, timeoutMs).catch(function (e) { return { __err: String(e && e.message || e) }; }),
      fetchJson(USD_URL, timeoutMs).catch(function (e) { return { __err: String(e && e.message || e) }; })
    ]).then(function (results) {
      const gold = results[0];
      const silver = results[1];
      const usdPack = results[2];

      const goldOzUsd = gold && typeof gold.price === 'number' ? gold.price : null;
      const silverOzUsd = silver && typeof silver.price === 'number' ? silver.price : null;
      const irr = usdPack && usdPack.usd && typeof usdPack.usd.irr === 'number' ? usdPack.usd.irr : null;
      // تومان = ریال / ۱۰
      const usdToman = irr != null ? irr / 10 : null;

      const goldPerGramToman =
        goldOzUsd != null && usdToman != null
          ? (goldOzUsd * usdToman) / TROY_OZ_GRAMS
          : null;
      const silverPerGramToman =
        silverOzUsd != null && usdToman != null
          ? (silverOzUsd * usdToman) / TROY_OZ_GRAMS
          : null;

      if (goldPerGramToman == null && silverPerGramToman == null && usdToman == null) {
        const errs = [gold && gold.__err, silver && silver.__err, usdPack && usdPack.__err].filter(Boolean);
        throw new Error(errs.join(' | ') || 'هیچ قیمتی دریافت نشد');
      }

      return {
        goldOzUsd: goldOzUsd,
        silverOzUsd: silverOzUsd,
        usdIrr: irr,
        usdToman: usdToman,
        goldPerGramToman: goldPerGramToman,
        silverPerGramToman: silverPerGramToman,
        updatedAt: Date.now(),
        source: 'gold-api.com + fawazahmed0/currency-api'
      };
    });
  }

  global.PricesAPI = {
    fetchMarketPrices: fetchMarketPrices,
    TROY_OZ_GRAMS: TROY_OZ_GRAMS,
    endpoints: { GOLD_URL: GOLD_URL, SILVER_URL: SILVER_URL, USD_URL: USD_URL }
  };
})(typeof window !== 'undefined' ? window : globalThis);
