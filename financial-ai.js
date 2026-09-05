/**
 * financial-ai.js — Financial Advisor Local (Offline) V3
 * Context-Aware · Intent + Rule Engine · Read-Only · Session Memory
 * کاملاً Local و Offline — هیچ درخواست شبکه‌ای برای پاسخ‌گویی ارسال نمی‌شود.
 * وابستگی: فقط خواندن state و توابع محاسباتی موجود پروژه.
 * هیچ تغییری در state مالی ایجاد نمی‌کند.
 */
(function (global) {
  'use strict';

  var AI_HISTORY_STORAGE = 'daftar-ai-chat-history-v2';
  var MAX_HISTORY_TURNS = 8;
  var MAX_RECENT_TX = 15;

  var chatHistory = [];
  var sessionMemory = { lastIntents: [], lastTopics: [], lastContextKeys: [] };
  var isSending = false;

  function safeNum(v, def) {
    var n = Number(v);
    return isFinite(n) ? n : (def != null ? def : 0);
  }
  function fmtNum(n) {
    return Math.round(safeNum(n, 0)).toLocaleString('en-US');
  }
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  /** نرمال‌سازی متن فارسی برای تطبیق بهتر کلیدواژه‌ها */
  function normalizeFa(s) {
    s = String(s || '').toLowerCase();
    s = s.replace(/ي/g, 'ی').replace(/ك/g, 'ک');
    s = s.replace(/[\u200c\u200f\u202a-\u202e]/g, ''); // ZWNJ و جهت‌نما
    s = s.replace(/[؟!؟?!.،,;:()[\]{}«»""''…]/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }
  function hasAny(q, words) {
    q = normalizeFa(q);
    for (var i = 0; i < words.length; i++) {
      var w = normalizeFa(words[i]);
      if (w && q.indexOf(w) !== -1) return true;
    }
    return false;
  }
  /** امتیاز تطبیق: کلیدهای بلندتر وزن بیشتر دارند */
  function matchScore(q, keys) {
    q = normalizeFa(q);
    var best = 0;
    for (var i = 0; i < keys.length; i++) {
      var w = normalizeFa(keys[i]);
      if (!w) continue;
      if (q.indexOf(w) !== -1) {
        var sc = w.length;
        if (q === w || q.indexOf(' ' + w + ' ') !== -1 || q.indexOf(w + ' ') === 0 || q.lastIndexOf(' ' + w) === q.length - w.length - 1) sc += 2;
        if (sc > best) best = sc;
      }
    }
    return best;
  }

  /* ========== Read-Only Tools ========== */
  var Tools = {
    getSummary: function () {
      var total = (typeof computeTotal === 'function') ? computeTotal() : 0;
      var cash = (typeof computeCash === 'function') ? computeCash() : 0;
      var invest = (typeof computeInvest === 'function') ? computeInvest() : 0;
      var noncashTotal = (typeof sumNoncashCurrentValues === 'function') ? sumNoncashCurrentValues() : 0;
      return {
        totalAssets: total,
        cashLiquidity: cash,
        investments: invest,
        noncashEstimated: noncashTotal,
        totalWithNoncash: total + noncashTotal,
        cashRatio: total > 0 ? Math.round((cash / total) * 100) : 0,
        investRatio: total > 0 ? Math.round((invest / total) * 100) : 0
      };
    },
    getLiquidity: function () {
      var items = [];
      if (typeof assets === 'object' && assets && typeof ASSET_DEFS !== 'undefined') {
        (ASSET_DEFS || []).forEach(function (d) {
          if (d && d.cat === 'نقدینگی') {
            items.push({ key: d.key, name: d.name || d.key, balance: safeNum(assets[d.key], 0) });
          }
        });
      }
      var cards = [];
      if (Array.isArray(bankCards)) {
        cards = bankCards.map(function (c) {
          return { name: c.name || 'کارت', last4: c.last4 || '', balance: safeNum(c.balance, 0), isDefault: !!c.isDefault };
        });
      }
      var cash = (typeof computeCash === 'function') ? computeCash() : 0;
      return { total: cash, items: items, bankCards: cards };
    },
    getInvestments: function () {
      var items = [];
      if (typeof assets === 'object' && assets && typeof ASSET_DEFS !== 'undefined') {
        (ASSET_DEFS || []).forEach(function (d) {
          if (d && d.cat === 'سرمایه‌گذاری') {
            items.push({ key: d.key, name: d.name || d.key, balance: safeNum(assets[d.key], 0) });
          }
        });
      }
      var total = (typeof computeInvest === 'function') ? computeInvest() : 0;
      return { total: total, items: items };
    },
    getNoncash: function () {
      var list = [];
      if (Array.isArray(noncash)) {
        list = noncash.slice(0, 20).map(function (item) {
          var val = (typeof currentValueForNoncash === 'function') ? currentValueForNoncash(item) : safeNum(item.manualValue, 0);
          return { category: item.category || item.cat || 'other', label: item.label || item.name || '', estimatedValue: val };
        });
      }
      var total = (typeof sumNoncashCurrentValues === 'function') ? sumNoncashCurrentValues() : 0;
      return { total: total, items: list };
    },
    getGoals: function () {
      var list = [];
      var summary = Tools.getSummary();
      if (Array.isArray(financialGoals)) {
        list = financialGoals.map(function (g) {
          var target = safeNum(g.targetAmount, 0);
          var progress = target > 0 ? Math.min(100, Math.round((summary.totalAssets / target) * 100)) : null;
          return { title: g.title || '', targetAmount: target, deadline: g.deadline || null, progressPctApprox: progress };
        });
      }
      return { count: list.length, items: list };
    },
    getLoans: function () {
      var lent = 0, borrowed = 0, items = [];
      if (Array.isArray(notebook)) {
        notebook.forEach(function (e) {
          if (!e || (e.type !== 'lent' && e.type !== 'borrowed') || e.settled) return;
          var amt = safeNum(e.amount, 0);
          if (e.type === 'lent') lent += amt; else borrowed += amt;
          items.push({ type: e.type, amount: amt, person: e.person || '', date: e.date || '', desc: (e.desc || '').slice(0, 60) });
        });
      }
      return { lentOpen: lent, borrowedOpen: borrowed, netDebt: borrowed - lent, items: items.slice(0, 12) };
    },
    getCashflow: function () {
      var income = 0, expense = 0;
      var byMonth = {};
      var recentIncome = [], recentExpense = [];
      if (Array.isArray(notebook)) {
        notebook.forEach(function (e) {
          if (!e) return;
          var amt = safeNum(e.amount, 0);
          if (amt <= 0) return;
          var mk = (e.date || '').slice(0, 7) || 'unknown';
          if (!byMonth[mk]) byMonth[mk] = { income: 0, expense: 0 };
          if (e.type === 'deposit') {
            income += amt; byMonth[mk].income += amt;
            recentIncome.push({ amount: amt, date: e.date || '', person: e.person || '', desc: (e.desc || '').slice(0, 60) });
          } else if (e.type === 'payment') {
            expense += amt; byMonth[mk].expense += amt;
            recentExpense.push({ amount: amt, date: e.date || '', person: e.person || '', desc: (e.desc || '').slice(0, 60) });
          }
        });
      }
      recentIncome = recentIncome.slice(-8).reverse();
      recentExpense = recentExpense.slice(-8).reverse();
      var months = Object.keys(byMonth).filter(function (k) { return k !== 'unknown'; }).sort().slice(-4);
      var monthly = months.map(function (m) {
        return { month: m, income: byMonth[m].income, expense: byMonth[m].expense, net: byMonth[m].income - byMonth[m].expense };
      });
      return {
        totalIncomeRecorded: income, totalExpenseRecorded: expense, netRecorded: income - expense,
        monthly: monthly, recentIncome: recentIncome, recentExpense: recentExpense,
        hasData: income > 0 || expense > 0
      };
    },
    getRecentTx: function () {
      var list = [];
      if (Array.isArray(notebook)) {
        var sorted = notebook.slice().sort(function (a, b) {
          return ((b.date || '') + (b.time || '')).localeCompare((a.date || '') + (a.time || ''));
        });
        list = sorted.slice(0, MAX_RECENT_TX).map(function (e) {
          return { type: e.type || '', amount: safeNum(e.amount, 0), date: e.date || '', person: e.person || '', desc: (e.desc || '').slice(0, 80), settled: !!e.settled };
        });
      }
      return { count: list.length, items: list };
    }
  };

  var INTENT_MAP = [
    { id: 'liquidity', keys: ['نقدینگی', 'پول نقد', 'موجودی کارت', 'موجودی نقد', 'موجودی', 'کارت‌هام', 'کارت هام', 'چقدر پول', 'چقد پول', 'چقدر دارم', 'موجودیم', 'liquidity', 'cash', 'پول دارم', 'موجودی بانک'], tools: ['getLiquidity', 'getSummary'] },
    { id: 'invest', keys: ['سرمایه‌گذاری', 'سرمایه گذاری', 'اسنپ', 'حامی', 'فارابی', 'صندوق', 'invest', 'fund', 'پورتفوی', 'سبد سرمایه‌گذاری', 'سبد'], tools: ['getInvestments', 'getSummary'] },
    { id: 'expense', keys: ['هزینه', 'هزینه‌ها', 'هزینه ها', 'خرج', 'مخارج', 'پرداخت', 'expense', 'چقدر خرج', 'خرج کردم', 'هزینه‌های اخیر', 'پرداختی'], tools: ['getCashflow'] },
    { id: 'income', keys: ['درآمد', 'دریافت', 'حقوق', 'واریز', 'income', 'deposit', 'چقدر درآمد', 'دریافتی', 'درآمدم'], tools: ['getCashflow'] },
    { id: 'cashflow', keys: ['دخل و خرج', 'جریان نقد', 'تراز مالی', 'cashflow', 'تراز', 'سود و زیان', 'درآمد و هزینه'], tools: ['getCashflow'] },
    { id: 'loans', keys: ['قرض', 'بدهی', 'وام', 'بدهکار', 'طلب', 'debt', 'loan', 'قرض‌ها', 'قرض ها', 'قرض باز'], tools: ['getLoans'] },
    { id: 'goals', keys: ['هدف', 'اهداف', 'goal', 'پس‌انداز', 'پس انداز', 'هدف مالی'], tools: ['getGoals', 'getSummary'] },
    { id: 'noncash', keys: ['طلا', 'نقره', 'دلار', 'سکه', 'غیرنقد', 'gold', 'silver', 'ارز', 'دارایی غیرنقد'], tools: ['getNoncash'] },
    { id: 'tx', keys: ['تراکنش', 'آخرین تراکنش', 'transaction', 'تراکنش‌ها', 'تراکنش ها', 'آخرین خرید', 'آخرین پرداخت'], tools: ['getRecentTx'] },
    { id: 'advice', keys: ['پیشنهاد', 'توصیه', 'چیکار کنم', 'چه کار کنم', 'چکار کنم', 'راهنمایی', 'advice', 'suggest', 'نصیحت', 'چطور مدیریت', 'پیشنهاد بده'], tools: ['getSummary', 'getLiquidity', 'getInvestments', 'getCashflow', 'getLoans', 'getGoals'] },
    { id: 'summary', keys: ['خلاصه', 'وضعیت مالی', 'گزارش مالی', 'کل دارایی', 'دارایی‌های من', 'دارایی های من', 'وضعیتم', 'اوضاع مالی', 'تحلیل کن', 'وضعیت من', 'وضعیت کلی'], tools: ['getSummary', 'getLiquidity', 'getInvestments'] }
  ];

  function detectIntents(question, memory) {
    var q = String(question || '').trim();
    if (!q) return ['none'];

    // امتیازدهی به همه intentها — کلید بلندتر و تطبیق دقیق‌تر برنده می‌شود
    var scored = [];
    INTENT_MAP.forEach(function (it) {
      var sc = matchScore(q, it.keys);
      if (sc > 0) scored.push({ id: it.id, score: sc });
    });
    scored.sort(function (a, b) { return b.score - a.score; });

    var found = scored.map(function (s) { return s.id; });

    // follow-up فقط با ارجاع صریح به قبل
    var followPhrases = ['نسبت به', 'ماه قبل', 'قبلش', 'قبلی', 'همون', 'همان', 'بیشتر بگو', 'ادامه بده', 'یعنی چی', 'درباره همان', 'درباره همون', 'همان مورد', 'همون مورد'];
    var isFollowUp = hasAny(q, followPhrases);
    if (!found.length && isFollowUp && memory && memory.lastIntents && memory.lastIntents.length && memory.lastIntents[0] !== 'none') {
      found = [memory.lastIntents[0]];
    }

    if (!found.length) found = ['none'];

    // یک intent اصلی:
    // ۱) اگر advice صریح باشد → اولویت advice
    // ۲) در غیر این صورت بالاترین امتیاز
    if (found[0] !== 'none' && found.length > 1) {
      if (found.indexOf('advice') >= 0 && matchScore(q, (INTENT_MAP.filter(function (x) { return x.id === 'advice'; })[0] || { keys: [] }).keys) >= 4) {
        found = ['advice'];
      } else {
        found = [found[0]];
      }
    }
    return found;
  }

  function selectToolsForIntents(intentIds) {
    if (!intentIds || !intentIds.length || intentIds[0] === 'none') return [];
    var toolSet = {};
    intentIds.forEach(function (id) {
      INTENT_MAP.forEach(function (it) {
        if (it.id === id) it.tools.forEach(function (t) { toolSet[t] = true; });
      });
    });
    return Object.keys(toolSet);
  }

  function buildSelectedContext(toolNames) {
    var ctx = { currency: 'تومان', generatedAt: new Date().toISOString(), selectedTools: toolNames.slice() };
    var keyMap = {
      getSummary: 'summary', getLiquidity: 'liquidity', getInvestments: 'investments',
      getNoncash: 'noncash', getGoals: 'goals', getLoans: 'loans',
      getCashflow: 'cashflow', getRecentTx: 'recentTx'
    };
    toolNames.forEach(function (name) {
      if (typeof Tools[name] === 'function') {
        try { ctx[keyMap[name] || name] = Tools[name](); }
        catch (e) { console.error('[FinancialAI] tool', name, e); }
      }
    });
    return ctx;
  }

  function buildLocalAnswer(question, intents, ctx) {
    var parts = [];
    var insights = [];
    var q = String(question || '');
    function addData(title, lines) {
      if (!lines || !lines.length) return;
      parts.push(title);
      lines.forEach(function (l) { if (l) parts.push(l); });
      parts.push('');
    }

    // سؤال غیرمالی یا بدون داده مرتبط
    if (!intents || intents[0] === 'none') {
      return 'متوجه نشدم سؤال مالی مشخصی مطرح کرده‌اید.\nمی‌توانید درباره نقدینگی، هزینه‌ها، سرمایه‌گذاری، قرض‌ها، اهداف یا تراکنش‌های ثبت‌شده در پنل بپرسید. من فقط بر اساس داده‌های واقعی همین پنل پاسخ می‌دهم.';
    }

    var primary = (intents && intents[0]) || 'none';
    // شروع مکالمه‌ای کوتاه
    var openers = {
      summary: 'بر اساس آخرین داده‌های ثبت‌شده در پنل:',
      liquidity: 'وضعیت نقدینگی شما این‌طور است:',
      invest: 'وضعیت سرمایه‌گذاری‌های ثبت‌شده:',
      expense: 'خلاصه هزینه‌ها و پرداخت‌های ثبت‌شده:',
      income: 'خلاصه دریافتی‌های ثبت‌شده:',
      cashflow: 'نگاه کلی به دخل و خرج:',
      loans: 'وضعیت قرض‌ها و بدهی‌های باز:',
      goals: 'اهداف مالی ثبت‌شده:',
      noncash: 'دارایی‌های غیرنقد ثبت‌شده:',
      tx: 'آخرین تراکنش‌های ثبت‌شده:',
      advice: 'با توجه به داده‌های فعلی پنل:'
    };
    if (openers[primary]) parts.push(openers[primary]);

    if (ctx.summary && (primary === 'summary' || primary === 'advice' || primary === 'liquidity' || primary === 'invest' || primary === 'goals')) {
      var s = ctx.summary;
      addData('📊 خلاصه وضعیت (داده واقعی پنل)', [
        '• کل دارایی (نقد + سرمایه‌گذاری): ' + fmtNum(s.totalAssets) + ' تومان',
        '• نقدینگی: ' + fmtNum(s.cashLiquidity) + ' تومان (' + (s.cashRatio || 0) + '٪)',
        '• سرمایه‌گذاری: ' + fmtNum(s.investments) + ' تومان (' + (s.investRatio || 0) + '٪)',
        s.noncashEstimated > 0 ? '• غیرنقد (تخمینی): ' + fmtNum(s.noncashEstimated) + ' تومان' : null
      ]);
    }

    if (ctx.liquidity && (primary === 'liquidity' || primary === 'advice' || primary === 'summary')) {
      var L = ctx.liquidity;
      var lines = ['مجموع نقدینگی: ' + fmtNum(L.total) + ' تومان'];
      (L.items || []).forEach(function (it) { lines.push('• ' + it.name + ': ' + fmtNum(it.balance) + ' تومان'); });
      if (L.bankCards && L.bankCards.length) {
        lines.push('کارت‌ها:');
        L.bankCards.forEach(function (c) {
          lines.push('• ' + c.name + (c.last4 ? ' (…' + c.last4 + ')' : '') + (c.isDefault ? ' [پیش‌فرض]' : '') + ': ' + fmtNum(c.balance) + ' تومان');
        });
      }
      addData('💰 نقدینگی', lines);
      if (ctx.summary && ctx.summary.totalAssets > 0 && ctx.summary.cashRatio < 15) {
        insights.push('نقدینگی کمتر از ۱۵٪ کل دارایی است؛ حاشیه امن نقدی را در نظر بگیرید.');
      } else if (ctx.summary && ctx.summary.cashRatio > 55) {
        insights.push('بخش بزرگی از دارایی نقد است؛ در صورت تمایل بخشی را می‌توان به سرمایه‌گذاری منتقل کرد.');
      }
    }

    if (ctx.investments && (primary === 'invest' || primary === 'summary' || primary === 'advice')) {
      var Inv = ctx.investments;
      var linesI = ['مجموع سرمایه‌گذاری: ' + fmtNum(Inv.total) + ' تومان'];
      if (!Inv.items || !Inv.items.length) linesI.push('اطلاعات کافی در پنل ثبت نشده — دارایی سرمایه‌گذاری تعریف نشده.');
      else Inv.items.forEach(function (it) { linesI.push('• ' + it.name + ': ' + fmtNum(it.balance) + ' تومان'); });
      addData('📈 سرمایه‌گذاری', linesI);
    }

    if (ctx.cashflow && (primary === 'expense' || primary === 'income' || primary === 'cashflow' || primary === 'advice')) {
      var C = ctx.cashflow;
      if (!C.hasData) {
        addData('🧾 دخل و خرج', ['اطلاعات کافی در پنل ثبت نشده — هنوز دریافت/پرداختی در دفترچه ثبت نشده است.']);
      } else {
        var linesC = [
          '• مجموع دریافتی‌های ثبت‌شده: ' + fmtNum(C.totalIncomeRecorded) + ' تومان',
          '• مجموع پرداخت‌های ثبت‌شده: ' + fmtNum(C.totalExpenseRecorded) + ' تومان',
          '• خالص ثبت‌شده: ' + fmtNum(C.netRecorded) + ' تومان'
        ];
        if (C.monthly && C.monthly.length) {
          linesC.push('روند ماهانه:');
          C.monthly.forEach(function (m) {
            linesC.push('• ' + m.month + ' → درآمد ' + fmtNum(m.income) + ' / هزینه ' + fmtNum(m.expense) + ' / خالص ' + fmtNum(m.net));
          });
        }
        if (hasAny(q, ['ماه قبل', 'نسبت به', 'قبلی']) && C.monthly && C.monthly.length >= 2) {
          var last = C.monthly[C.monthly.length - 1];
          var prev = C.monthly[C.monthly.length - 2];
          var expDiff = last.expense - prev.expense;
          linesC.push('مقایسه هزینه ' + last.month + ' نسبت به ' + prev.month + ': ' +
            (expDiff > 0 ? 'حدود ' + fmtNum(expDiff) + ' تومان بیشتر' : expDiff < 0 ? 'حدود ' + fmtNum(-expDiff) + ' تومان کمتر' : 'تقریباً برابر'));
        }
        if (primary === 'expense' && C.recentExpense && C.recentExpense.length) {
          linesC.push('آخرین هزینه‌ها:');
          C.recentExpense.slice(0, 5).forEach(function (t) {
            linesC.push('• ' + fmtNum(t.amount) + ' تومان' + (t.date ? ' (' + t.date + ')' : '') + (t.desc ? ' — ' + t.desc : ''));
          });
        }
        if (primary === 'income' && C.recentIncome && C.recentIncome.length) {
          linesC.push('آخرین دریافتی‌ها:');
          C.recentIncome.slice(0, 5).forEach(function (t) {
            linesC.push('• ' + fmtNum(t.amount) + ' تومان' + (t.date ? ' (' + t.date + ')' : '') + (t.person ? ' — ' + t.person : ''));
          });
        }
        addData('🧾 دخل و خرج', linesC);
        if (C.totalExpenseRecorded > C.totalIncomeRecorded && C.totalIncomeRecorded > 0) {
          insights.push('مجموع هزینه‌های ثبت‌شده از دریافتی‌ها بیشتر است.');
        }
      }
    }

    if (ctx.loans && primary === 'loans') {
      var Ln = ctx.loans;
      var linesL = [
        '• قرض داده‌شده (باز): ' + fmtNum(Ln.lentOpen) + ' تومان',
        '• قرض گرفته‌شده (باز): ' + fmtNum(Ln.borrowedOpen) + ' تومان'
      ];
      if (!Ln.items || !Ln.items.length) linesL.push('قرض تسویه‌نشده‌ای ثبت نشده است.');
      else Ln.items.slice(0, 6).forEach(function (it) {
        linesL.push('• ' + (it.type === 'lent' ? 'قرض داده' : 'قرض گرفته') + ' — ' + (it.person || '—') + ': ' + fmtNum(it.amount) + ' تومان');
      });
      addData('🤝 قرض و بدهی', linesL);
      if (Ln.borrowedOpen > 0) insights.push('قرض گرفته‌شده باز دارید؛ بازپرداخت را اولویت‌بندی کنید.');
    }

    if (ctx.goals && (primary === 'goals' || primary === 'advice')) {
      var G = ctx.goals;
      if (!G.count) addData('🎯 اهداف', ['اطلاعات کافی در پنل ثبت نشده — هنوز هدف مالی تعریف نشده است.']);
      else {
        var linesG = G.items.map(function (g) {
          var p = g.progressPctApprox != null ? (' ≈ ' + g.progressPctApprox + '٪ نسبت به کل دارایی') : '';
          return '• ' + (g.title || 'بدون عنوان') + ': هدف ' + fmtNum(g.targetAmount) + ' تومان' + p + (g.deadline ? ' — مهلت: ' + g.deadline : '');
        });
        addData('🎯 اهداف مالی', linesG);
      }
    }

    if (ctx.noncash && primary === 'noncash') {
      var N = ctx.noncash;
      if (!N.items || !N.items.length) addData('🪙 غیرنقد', ['دارایی غیرنقدی ثبت نشده است.']);
      else {
        var linesN = ['جمع تقریبی: ' + fmtNum(N.total) + ' تومان'].concat(N.items.map(function (it) {
          return '• ' + (it.label || it.category) + ': حدود ' + fmtNum(it.estimatedValue) + ' تومان';
        }));
        addData('🪙 دارایی غیرنقد', linesN);
      }
    }

    if (ctx.recentTx && primary === 'tx') {
      var T = ctx.recentTx;
      if (!T.count) addData('📝 تراکنش‌ها', ['تراکنشی ثبت نشده است.']);
      else {
        var typeMap = { deposit: 'دریافتی', payment: 'پرداخت', lent: 'قرض داده', borrowed: 'قرض گرفته', transfer: 'انتقال' };
        var linesT = T.items.slice(0, 8).map(function (t) {
          return '• ' + (typeMap[t.type] || t.type) + ': ' + fmtNum(t.amount) + ' تومان' + (t.date ? ' (' + t.date + ')' : '') + (t.desc ? ' — ' + t.desc : '');
        });
        addData('📝 آخرین تراکنش‌ها', linesT);
      }
    }

    if (primary === 'advice' && !insights.length && ctx.summary) {
      insights.push('ترکیب دارایی را با اهداف خود مقایسه کنید؛ در صورت نبود هدف، یک هدف کوتاه‌مدت تعریف کنید.');
    }

    if (!parts.length) {
      parts.push('برای این سؤال، داده مرتبط کافی در پنل ثبت نشده است.');
    }

    if (insights.length) {
      parts.push('💡 پیشنهاد / Insight (بر اساس داده فعلی — نه تضمین آینده):');
      insights.slice(0, 3).forEach(function (ins) { parts.push('• ' + ins); });
    }

    // پاسخ کاملاً محلی — بدون وابستگی به سرویس خارجی
    return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  /** موتور پاسخ محلی (Offline) — Intent + Context + Rule Engine */
  function callAI(userMessage) {
    var intents = detectIntents(userMessage, sessionMemory);
    var toolNames = selectToolsForIntents(intents);
    var ctx = buildSelectedContext(toolNames);
    if (intents[0] && intents[0] !== 'none') {
      sessionMemory.lastIntents = [intents[0]];
      sessionMemory.lastContextKeys = toolNames.slice();
      sessionMemory.lastTopics = [intents[0]];
    }
    var content = buildLocalAnswer(userMessage, intents, ctx);
    // کمی طبیعی‌تر کردن شروع پاسخ برای حس مکالمه‌ای
    if (intents[0] && intents[0] !== 'none' && content && content.indexOf('📊') === 0) {
      // already structured
    } else if (intents[0] && intents[0] !== 'none' && content && !content.startsWith('این سؤال')) {
      // keep as-is
    }
    return { ok: true, content: content, mode: 'local', intents: intents, tools: toolNames };
  }

  function loadHistory() {
    try {
      var raw = localStorage.getItem(AI_HISTORY_STORAGE);
      if (raw) { var arr = JSON.parse(raw); if (Array.isArray(arr)) chatHistory = arr.slice(-MAX_HISTORY_TURNS * 2); }
    } catch (e) { chatHistory = []; }
  }
  function saveHistory() {
    try { localStorage.setItem(AI_HISTORY_STORAGE, JSON.stringify(chatHistory.slice(-MAX_HISTORY_TURNS * 2))); } catch (e) {}
  }
  function clearHistory() {
    chatHistory = [];
    sessionMemory = { lastIntents: [], lastTopics: [], lastContextKeys: [] };
    saveHistory();
    renderMessages();
  }

  function formatMessageContent(text) {
    var html = escapeHtml(text).replace(/\n/g, '<br>');
    // بخش‌های ساده برای پیشنهاد / هشدار
    html = html.replace(/💡 پیشنهاد[^<]*/g, function (m) {
      return '<div class="ai-chip ai-chip-insight">' + m + '</div>';
    });
    html = html.replace(/⚠️[^<]*/g, function (m) {
      return '<div class="ai-chip ai-chip-warn">' + m + '</div>';
    });
    return html;
  }

  function setStatus(text, mode) {
    var el = document.getElementById('aiStatusText');
    var line = document.getElementById('aiStatusLine');
    if (el) el.textContent = text || 'آماده برای کمک';
    if (line) {
      line.classList.remove('is-busy', 'is-error');
      if (mode === 'busy') line.classList.add('is-busy');
      if (mode === 'error') line.classList.add('is-error');
    }
  }

  function setContextBar(show, text) {
    var bar = document.getElementById('aiContextBar');
    var tx = document.getElementById('aiContextText');
    if (!bar) return;
    if (show) {
      bar.hidden = false;
      if (tx && text) tx.textContent = text;
    } else {
      bar.hidden = true;
    }
  }

  var SUGGESTED = [
    'وضعیت مالی من را تحلیل کن',
    'نقدینگی‌ام چطور است؟',
    'هزینه‌های اخیرم را خلاصه کن',
    'پیشنهاد مدیریت دارایی بده'
  ];

  function renderWelcome() {
    var chips = SUGGESTED.map(function (s) {
      return '<button type="button" class="ai-suggest" data-suggest="' + escapeHtml(s) + '">' + escapeHtml(s) + '</button>';
    }).join('');
    return (
      '<div class="ai-welcome">' +
        '<div class="ai-welcome-icon" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M6 10v1a6 6 0 0 0 12 0v-1"/><path d="M12 17v3"/><path d="M9 21h6"/></svg>' +
        '</div>' +
        '<div class="ai-welcome-title">سلام، من مشاور مالی محلی شما هستم</div>' +
        '<div class="ai-welcome-sub">کاملاً آفلاین کار می‌کنم. می‌توانم وضعیت نقدینگی، هزینه‌ها، سرمایه‌گذاری‌ها، قرض‌ها و اهداف را بر اساس داده‌های واقعی پنل تحلیل کنم.</div>' +
        '<div class="ai-suggest-row">' + chips + '</div>' +
      '</div>'
    );
  }

  function renderMessages() {
    var list = document.getElementById('aiChatMessages');
    if (!list) return;
    if (!chatHistory.length) {
      list.innerHTML = renderWelcome();
      setStatus('آماده برای کمک', 'idle');
      return;
    }
    list.innerHTML = chatHistory.map(function (m) {
      if (m.role === 'user') {
        return '<div class="ai-msg ai-msg-user"><div class="ai-msg-bubble">' + formatMessageContent(m.content) + '</div></div>';
      }
      return (
        '<div class="ai-msg ai-msg-assistant">' +
          '<div class="ai-msg-meta"><span class="ai-msg-avatar">AI</span><span class="ai-msg-name">مشاور هوشمند</span></div>' +
          '<div class="ai-msg-bubble">' + formatMessageContent(m.content) + '</div>' +
        '</div>'
      );
    }).join('');
    list.scrollTop = list.scrollHeight;
  }

  function setSendingState(sending) {
    isSending = sending;
    var btn = document.getElementById('aiSendBtn');
    var input = document.getElementById('aiChatInput');
    if (btn) {
      btn.disabled = !!sending;
      btn.classList.toggle('is-loading', !!sending);
    }
    if (input) input.disabled = !!sending;
    if (sending) {
      setStatus('در حال تحلیل…', 'busy');
      setContextBar(true, 'در حال تحلیل داده‌های پنل…');
    } else {
      setStatus('آماده برای کمک', 'idle');
      setContextBar(false);
    }
  }

  async function handleSend(presetText) {
    if (isSending) return;
    var input = document.getElementById('aiChatInput');
    var text = (presetText != null ? String(presetText) : (input && input.value) || '').trim();
    if (!text) return;
    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }
    chatHistory.push({ role: 'user', content: text });
    renderMessages();
    saveHistory();
    setSendingState(true);

    var list = document.getElementById('aiChatMessages');
    if (list) {
      var thinking = document.createElement('div');
      thinking.className = 'ai-msg ai-msg-assistant ai-thinking';
      thinking.id = 'aiThinking';
      thinking.innerHTML =
        '<div class="ai-msg-meta"><span class="ai-msg-avatar">AI</span><span class="ai-msg-name">مشاور هوشمند</span></div>' +
        '<div class="ai-msg-bubble ai-typing"><span></span><span></span><span></span></div>';
      list.appendChild(thinking);
      list.scrollTop = list.scrollHeight;
    }

    var result;
    try { result = await callAI(text); }
    catch (e) { result = { ok: false, error: (e && e.message) || 'خطا' }; }

    var th = document.getElementById('aiThinking');
    if (th) th.remove();

    if (result && result.ok) {
      chatHistory.push({ role: 'assistant', content: result.content });
      setStatus('آماده (آفلاین)', 'idle');
    } else {
      chatHistory.push({ role: 'assistant', content: '⚠️ ' + ((result && result.error) || 'خطای ناشناخته') });
      setStatus('خطا در تحلیل محلی', 'error');
    }
    saveHistory();
    renderMessages();
    setSendingState(false);
  }

  function renderSettingsPanel() {
    // پنل تنظیمات API دیگر استفاده نمی‌شود — مشاور کاملاً محلی است
    var panel = document.getElementById('aiSettingsPanel');
    if (panel) panel.style.display = 'none';
    var toggle = document.getElementById('aiToggleSettings');
    if (toggle) toggle.style.display = 'none';
  }

  function bindUI() {
    var sendBtn = document.getElementById('aiSendBtn');
    var input = document.getElementById('aiChatInput');
    var clearBtn = document.getElementById('aiClearBtn');
    var list = document.getElementById('aiChatMessages');

    if (sendBtn && !sendBtn._aiBound) {
      sendBtn._aiBound = true;
      sendBtn.addEventListener('click', function (e) { e.preventDefault(); handleSend(); });
    }
    if (input && !input._aiBound) {
      input._aiBound = true;
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
      });
      input.addEventListener('input', function () {
        input.style.height = 'auto';
        var h = Math.min(input.scrollHeight, 120);
        input.style.height = Math.max(44, h) + 'px';
      });
    }
    if (clearBtn && !clearBtn._aiBound) {
      clearBtn._aiBound = true;
      clearBtn.addEventListener('click', function () {
        clearHistory();
        setStatus('گفتگوی جدید', 'idle');
      });
    }
    // suggested prompts (event delegation)
    if (list && !list._aiSuggestBound) {
      list._aiSuggestBound = true;
      list.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest && e.target.closest('.ai-suggest');
        if (!btn) return;
        var q = btn.getAttribute('data-suggest') || btn.textContent || '';
        handleSend(q);
      });
    }
  }

  function initPage() {
    loadHistory();
    renderMessages();
    renderSettingsPanel();
    bindUI();
    setStatus('آماده (آفلاین · محلی)', 'idle');
  }

  global.FinancialAI = {
    init: initPage,
    clearHistory: clearHistory,
    Tools: Tools,
    detectIntents: detectIntents,
    buildSelectedContext: buildSelectedContext,
    _callAI: callAI,
    _sessionMemory: function () { return sessionMemory; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
