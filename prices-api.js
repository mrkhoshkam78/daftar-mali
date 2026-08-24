/**
 * prices-api.js — لایه مرکزی قیمت (بدون کلید API)
 *
 * منابع تست‌شده (مرورگر + CORS):
 *  1) طلا/نقره: https://api.gold-api.com/price/XAU|XAG  (USD/oz, Access-Control-Allow-Origin: *)
 *  2) USD→IRR:  https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json
 *
 * TGJU (call1.tgju.org/ajax.json) قیمت بازار آزاد ایران را دارد ولی هدر CORS ندارد
 * و از مرورگر مستقیم قابل‌خواندن نیست؛ در این لایه استفاده نشده تا UI خالی/خطا نماند.
 *
 * تبدیل: ۱ اونس تروا = ۳۱٫۱۰۳۴۷۶۸ گرم · تومان = ریال ÷ ۱۰
 */
(function (global) {
  'use strict';

  var TROY_OZ_GRAMS = 31.1034768;
  var GOLD_URL = 'https://api.gold-api.com/price/XAU';
  var SILVER_URL = 'https://api.gold-api.com/price/XAG';
  var USD_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';

  function toLatinDigits(s) {
    return String(s == null ? '' : s)
      .replace(/[۰-۹]/g, function (d) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); })
      .replace(/[٠-٩]/g, function (d) { return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); });
  }

  function parsePrice(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = toLatinDigits(v).replace(/,/g, '').replace(/[^\d.\-]/g, '');
    if (!s) return null;
    var n = Number(s);
    return isFinite(n) ? n : null;
  }

  function fetchJson(url, timeoutMs) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, timeoutMs || 12000);
    return fetch(url, {
      method: 'GET',
      signal: ctrl ? ctrl.signal : undefined,
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
      mode: 'cors'
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).finally(function () { clearTimeout(timer); });
  }

  function fetchWithRetry(url, timeoutMs, retries) {
    retries = retries == null ? 1 : retries;
    return fetchJson(url, timeoutMs).catch(function (err) {
      if (retries <= 0) throw err;
      return new Promise(function (r) { setTimeout(r, 400); }).then(function () {
        return fetchWithRetry(url, timeoutMs, retries - 1);
      });
    });
  }

  /**
   * @returns {Promise<object>}
   */
  function fetchMarketPrices(opts) {
    opts = opts || {};
    var timeoutMs = opts.timeoutMs || 12000;

    return Promise.all([
      fetchWithRetry(GOLD_URL, timeoutMs, 1).then(function (j) { return { ok: true, data: j }; }).catch(function (e) { return { ok: false, err: String(e && e.message || e) }; }),
      fetchWithRetry(SILVER_URL, timeoutMs, 1).then(function (j) { return { ok: true, data: j }; }).catch(function (e) { return { ok: false, err: String(e && e.message || e) }; }),
      fetchWithRetry(USD_URL, timeoutMs, 1).then(function (j) { return { ok: true, data: j }; }).catch(function (e) { return { ok: false, err: String(e && e.message || e) }; })
    ]).then(function (parts) {
      var gold = parts[0];
      var silver = parts[1];
      var fx = parts[2];

      var goldOzUsd = gold.ok ? parsePrice(gold.data && gold.data.price) : null;
      var silverOzUsd = silver.ok ? parsePrice(silver.data && silver.data.price) : null;
      var irr = null;
      if (fx.ok && fx.data && fx.data.usd) irr = parsePrice(fx.data.usd.irr);

      var usdToman = irr != null ? irr / 10 : null;
      var goldPerGramToman = (goldOzUsd != null && usdToman != null)
        ? (goldOzUsd * usdToman) / TROY_OZ_GRAMS
        : null;
      var silverPerGramToman = (silverOzUsd != null && usdToman != null)
        ? (silverOzUsd * usdToman) / TROY_OZ_GRAMS
        : null;

      if (goldPerGramToman == null && silverPerGramToman == null && usdToman == null) {
        var errs = [];
        if (!gold.ok) errs.push('طلا: ' + gold.err);
        if (!silver.ok) errs.push('نقره: ' + silver.err);
        if (!fx.ok) errs.push('ارز: ' + fx.err);
        throw new Error(errs.join(' | ') || 'دریافت قیمت ناموفق');
      }

      return {
        goldOzUsd: goldOzUsd,
        silverOzUsd: silverOzUsd,
        usdIrr: irr,
        usdToman: usdToman,
        goldPerGramToman: goldPerGramToman,
        silverPerGramToman: silverPerGramToman,
        coinEmamiToman: null,
        updatedAt: Date.now(),
        source: 'gold-api.com + fawazahmed0/currency-api',
        errors: {
          gold: gold.ok ? null : gold.err,
          silver: silver.ok ? null : silver.err,
          fx: fx.ok ? null : fx.err
        }
      };
    });
  }

  global.PricesAPI = {
    fetchMarketPrices: fetchMarketPrices,
    parsePrice: parsePrice,
    toLatinDigits: toLatinDigits,
    TROY_OZ_GRAMS: TROY_OZ_GRAMS,
    endpoints: { GOLD_URL: GOLD_URL, SILVER_URL: SILVER_URL, USD_URL: USD_URL }
  };
})(typeof window !== 'undefined' ? window : globalThis);
