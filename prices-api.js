/**
 * prices-api.js — لایه مرکزی قیمت از TGJU
 *
 * منبع: https://call5.tgju.org/ajax.json  (CORS: Access-Control-Allow-Origin: *)
 *
 * فیلدهای استخراج‌شده از Response واقعی (current):
 *   - geram18        → طلای ۱۸ عیار — ریال / گرم
 *   - price_dollar_rl → دلار آزاد — ریال / دلار
 *   - silver_999     → نقره ۹۹۹ — ریال / گرم
 *
 * تبدیل: تومان = ریال ÷ ۱۰
 * هیچ Field فرضی ساخته نمی‌شود؛ در نبود قیمت، null برمی‌گردد.
 */
(function (global) {
  'use strict';

  var TGJU_URL = 'https://call5.tgju.org/ajax.json';

  /** کلیدهای تأییدشده از Response واقعی — تغییر نده بدون بررسی JSON */
  var SYM = {
    gold18: 'geram18',
    usd: 'price_dollar_rl',
    silver: 'silver_999'
  };

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

  /** خواندن p از current[symbol]؛ فقط اگر آبجکت معتبر باشد */
  function readCurrentPrice(current, symbol) {
    if (!current || typeof current !== 'object') return null;
    var row = current[symbol];
    if (!row || typeof row !== 'object') return null;
    return parsePrice(row.p);
  }

  function fetchJson(url, timeoutMs) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, timeoutMs || 14000);
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
      return new Promise(function (r) { setTimeout(r, 500); }).then(function () {
        return fetchWithRetry(url, timeoutMs, retries - 1);
      });
    });
  }

  /**
   * @returns {Promise<object>}
   */
  function fetchMarketPrices(opts) {
    opts = opts || {};
    var timeoutMs = opts.timeoutMs || 14000;

    return fetchWithRetry(TGJU_URL, timeoutMs, 1).then(function (raw) {
      if (!raw || typeof raw !== 'object' || !raw.current || typeof raw.current !== 'object') {
        throw new Error('پاسخ نامعتبر از TGJU');
      }
      var current = raw.current;

      var gold18Rial = readCurrentPrice(current, SYM.gold18);
      var usdRial = readCurrentPrice(current, SYM.usd);
      var silver999Rial = readCurrentPrice(current, SYM.silver);

      // ریال → تومان (÷۱۰). فقط وقتی قیمت معتبر است.
      var goldPerGramToman = gold18Rial != null ? gold18Rial / 10 : null;
      var usdToman = usdRial != null ? usdRial / 10 : null;
      var silverPerGramToman = silver999Rial != null ? silver999Rial / 10 : null;

      if (goldPerGramToman == null && silverPerGramToman == null && usdToman == null) {
        throw new Error('هیچ قیمت معتبری در پاسخ TGJU یافت نشد');
      }

      return {
        goldPerGramToman: goldPerGramToman,
        silverPerGramToman: silverPerGramToman,
        usdToman: usdToman,
        // خام برای دیباگ
        gold18Rial: gold18Rial,
        usdRial: usdRial,
        silver999Rial: silver999Rial,
        updatedAt: Date.now(),
        source: 'call5.tgju.org',
        symbols: { gold: SYM.gold18, usd: SYM.usd, silver: SYM.silver },
        errors: {
          gold: gold18Rial == null ? 'missing:' + SYM.gold18 : null,
          silver: silver999Rial == null ? 'missing:' + SYM.silver : null,
          fx: usdRial == null ? 'missing:' + SYM.usd : null
        }
      };
    });
  }

  global.PricesAPI = {
    fetchMarketPrices: fetchMarketPrices,
    parsePrice: parsePrice,
    toLatinDigits: toLatinDigits,
    endpoints: { TGJU_URL: TGJU_URL },
    symbols: SYM
  };
})(typeof window !== 'undefined' ? window : globalThis);
