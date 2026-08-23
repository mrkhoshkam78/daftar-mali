/*
 * prices-api.js
 * ------------------------------------------------------------------
 * ماژول مستقل و ایزوله برای دریافت قیمت لحظه‌ای طلای ۱۸ عیار، نقره و دلار.
 * فقط همین فایل با API خارجی حرف می‌زند؛ بقیه‌ی برنامه فقط از توابع
 * public (window.PricesAPI) استفاده می‌کنند و هیچ Endpoint یا منطق
 * Fetch/Cache/Timeout جای دیگری تکرار نمی‌شود.
 *
 * این فایل به‌تنهایی هیچ Request ای نمی‌زند (کاملاً Lazy). فقط با
 * صدا زدن صریح PricesAPI.start(...) از سمت صفحه‌ی «دارایی‌های غیرنقد»
 * فچ آغاز می‌شود و با PricesAPI.stop() بلافاصله متوقف می‌شود.
 *
 * ================== منابع داده (بررسی‌شده) ==================
 * BRS API (Api.BrsApi.ir/Market/Gold_Currency.php و
 * BrsApi.ir/Api/Market/Commodity.php برای نقره) به‌صراحت به یک
 * API Key ثبت‌نامی نیاز دارد؛ برخلاف ادعای «بدون نیاز به ثبت‌نام»
 * در README پروژه APIs-made-in-Iran. چون کلیدی از سمت کاربر در
 * دسترس نبود، طبق دستور «حدس نزن»، به‌جای آن از دو منبع کاملاً
 * رایگان و بدون نیاز به ثبت‌نام/کلید استفاده شد که مستندات رسمی‌شان
 * به‌صورت مستقیم بررسی و تأیید شد:
 *
 *   1) PriceDB  — github.com/margani/pricedb (متن‌باز، MIT)
 *      GET https://api.priceto.day/v1/latest/irr/usd          → دلار به ریال
 *      GET https://api.priceto.day/v1/latest/irr/gold-miskal  → «مثقال/مظنه»
 *      طلا (۱۷ عیار مبنا) به ریال — همان عددی که طلافروشی‌ها به آن
 *      «مظنه» می‌گویند.
 *
 *   2) gold-api.com — مستندات: gold-api.com/llms.txt
 *      GET https://api.gold-api.com/price/XAG → قیمت جهانی انس نقره
 *      به دلار (بدون کلید، بدون محدودیت نرخ، CORS باز).
 *      این API واحد ریالی ندارد، برای همین با نرخ دلار (منبع ۱)
 *      به تومان تبدیل می‌شود.
 * ================================================================
 */
(function (window) {
  'use strict';

  var ENDPOINTS = {
    usd: 'https://api.priceto.day/v1/latest/irr/usd',
    goldMiskal: 'https://api.priceto.day/v1/latest/irr/gold-miskal',
    silverXAG: 'https://api.gold-api.com/price/XAG'
  };

  var FETCH_TIMEOUT_MS = 8000; // Timeout هر درخواست
  var CACHE_TTL_MS = 60 * 1000; // مدت اعتبار Cache در حافظه (۶۰ ثانیه)
  // مثقال/مظنه‌ی طلا (استاندارد بازار طلای ایران، منابع متعدد تأیید شده):
  // قیمت هر گرم طلای ۱۸ عیار = قیمت یک مثقال ÷ ۴.۳۳۱۸
  var MESGHAL_TO_GRAM_18K = 4.3318;
  var TROY_OUNCE_TO_GRAM = 31.1034768;

  var _cache = null; // { data, ts }
  var _pollTimer = null;
  var _activeToken = 0; // برای لغو ایمن Loop قبلی هنگام start/stop مکرر
  var _inFlight = []; // AbortController های در حال اجرا

  function isPositiveFiniteNumber(v) {
    return typeof v === 'number' && isFinite(v) && !isNaN(v) && v > 0;
  }

  function fetchJsonWithTimeout(url) {
    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    if (controller) _inFlight.push(controller);
    var timer = setTimeout(function () {
      if (controller) controller.abort();
    }, FETCH_TIMEOUT_MS);

    var opts = { cache: 'no-store' };
    if (controller) opts.signal = controller.signal;

    return fetch(url, opts)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .finally(function () {
        clearTimeout(timer);
        if (controller) {
          var idx = _inFlight.indexOf(controller);
          if (idx > -1) _inFlight.splice(idx, 1);
        }
      });
  }

  // ---- استخراج و اعتبارسنجی هر منبع (خروجی خام API را به عدد قابل‌اعتماد تبدیل می‌کند) ----

  function extractLatestRow(json) {
    // اسکیمای رسمی PriceDB: آرایه‌ای از { success, price, high, low, time }
    var row = Array.isArray(json) ? json[0] : json;
    if (!row || row.success !== true || !isPositiveFiniteNumber(row.price)) {
      throw new Error('پاسخ نامعتبر یا ناقص از سرویس قیمت');
    }
    return row;
  }

  function fetchUsdToman() {
    return fetchJsonWithTimeout(ENDPOINTS.usd).then(function (json) {
      var row = extractLatestRow(json);
      var toman = row.price / 10; // ریال -> تومان
      return { value: toman, time: row.time || null };
    });
  }

  function fetchGold18kTomanPerGram() {
    return fetchJsonWithTimeout(ENDPOINTS.goldMiskal).then(function (json) {
      var row = extractLatestRow(json);
      var mesghalToman = row.price / 10; // ریال -> تومان
      var gramToman = mesghalToman / MESGHAL_TO_GRAM_18K;
      if (!isPositiveFiniteNumber(gramToman)) throw new Error('محاسبه قیمت طلا نامعتبر شد');
      return { value: gramToman, time: row.time || null };
    });
  }

  function fetchSilverUsdPerGram() {
    return fetchJsonWithTimeout(ENDPOINTS.silverXAG).then(function (data) {
      if (!data || data.symbol !== 'XAG' || !isPositiveFiniteNumber(data.price)) {
        throw new Error('پاسخ نامعتبر از سرویس نقره');
      }
      var usdPerGram = data.price / TROY_OUNCE_TO_GRAM;
      return { value: usdPerGram, time: data.updatedAt || null };
    });
  }

  // ---- ترکیب هر سه منبع با مدیریت خطای مستقل (خطای یکی بقیه را خراب نمی‌کند) ----

  function fetchAllSafely() {
    var result = {
      usdToman: null,
      gold18kToman: null,
      silverTomanPerGram: null,
      errors: {},
      time: new Date().toISOString()
    };

    return fetchUsdToman()
      .then(function (r) {
        result.usdToman = r.value;
      })
      .catch(function (e) {
        result.errors.usd = (e && e.message) || String(e);
      })
      .then(function () {
        return fetchGold18kTomanPerGram()
          .then(function (r) {
            result.gold18kToman = r.value;
          })
          .catch(function (e) {
            result.errors.gold = (e && e.message) || String(e);
          });
      })
      .then(function () {
        return fetchSilverUsdPerGram()
          .then(function (r) {
            if (isPositiveFiniteNumber(result.usdToman)) {
              result.silverTomanPerGram = r.value * result.usdToman;
            } else {
              result.errors.silver = 'برای تبدیل نقره به تومان، نرخ دلار در دسترس نبود';
            }
          })
          .catch(function (e) {
            result.errors.silver = (e && e.message) || String(e);
          });
      })
      .then(function () {
        return result;
      });
  }

  // ---- Cache در حافظه (نه localStorage) با TTL ----

  function refresh(force) {
    if (!force && _cache && (Date.now() - _cache.ts) < CACHE_TTL_MS) {
      return Promise.resolve(_cache.data);
    }
    return fetchAllSafely().then(function (data) {
      _cache = { data: data, ts: Date.now() };
      return data;
    });
  }

  // ---- Lazy polling — فقط وقتی start() صدا زده شود شروع می‌شود ----

  function start(onUpdate) {
    _activeToken += 1;
    var myToken = _activeToken;

    function tick() {
      if (myToken !== _activeToken) return; // توسط stop()/start() جدید لغو شده
      refresh(false).then(function (data) {
        if (myToken !== _activeToken) return;
        if (typeof onUpdate === 'function') onUpdate(data);
        if (myToken !== _activeToken) return;
        _pollTimer = setTimeout(tick, CACHE_TTL_MS);
      });
    }
    tick();
  }

  function stop() {
    _activeToken += 1; // هر Loop در حال اجرا را بی‌اثر می‌کند
    if (_pollTimer) {
      clearTimeout(_pollTimer);
      _pollTimer = null;
    }
    _inFlight.forEach(function (c) {
      try { c.abort(); } catch (e) { /* noop */ }
    });
    _inFlight = [];
  }

  function getCached() {
    return _cache ? _cache.data : null;
  }

  window.PricesAPI = {
    start: start,
    stop: stop,
    refresh: refresh,
    getCached: getCached
  };

  // برای تست واحد (Node.js / بدون DOM) دسترسی به توابع خالص فراهم می‌شود
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      MESGHAL_TO_GRAM_18K: MESGHAL_TO_GRAM_18K,
      TROY_OUNCE_TO_GRAM: TROY_OUNCE_TO_GRAM,
      isPositiveFiniteNumber: isPositiveFiniteNumber,
      extractLatestRow: extractLatestRow
    };
  }
})(typeof window !== 'undefined' ? window : this);
