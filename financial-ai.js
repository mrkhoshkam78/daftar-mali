/**
 * financial-ai.js — Financial AI Advisor Version 2
 * Context-Aware · Tool-Oriented · Read-Only · Session Memory
 * وابستگی: فقط خواندن state و توابع محاسباتی موجود پروژه.
 * هیچ تغییری در state مالی ایجاد نمی‌کند.
 */
(function (global) {
  'use strict';

  var AI_KEY_STORAGE = 'daftar-ai-api-key';
  var AI_ENDPOINT_STORAGE = 'daftar-ai-endpoint';
  var AI_HISTORY_STORAGE = 'daftar-ai-chat-history-v2';
  var DEFAULT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
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
  function hasAny(q, words) {
    q = String(q || '').toLowerCase();
    for (var i = 0; i < words.length; i++) {
      if (q.indexOf(words[i]) !== -1) return true;
    }
    return false;
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
    { id: 'liquidity', keys: ['نقد', 'نقدینگی', 'کارت', 'پول نقد', 'موجودی کارت', 'liquidity', 'cash'], tools: ['getLiquidity', 'getSummary'] },
    { id: 'invest', keys: ['سرمایه', 'سرمایه‌گذاری', 'اسنپ', 'حامی', 'فارابی', 'صندوق', 'invest', 'fund'], tools: ['getInvestments', 'getSummary'] },
    { id: 'expense', keys: ['هزینه', 'خرج', 'پرداخت', 'expense', 'payment', 'مخارج'], tools: ['getCashflow', 'getRecentTx'] },
    { id: 'income', keys: ['درآمد', 'دریافت', 'حقوق', 'واریز', 'income', 'deposit'], tools: ['getCashflow', 'getRecentTx'] },
    { id: 'cashflow', keys: ['جریان', 'دخل و خرج', 'تراز', 'مقایسه درآمد', 'cashflow'], tools: ['getCashflow', 'getSummary'] },
    { id: 'loans', keys: ['قرض', 'بدهی', 'وام', 'بدهکار', 'طلب', 'debt', 'loan'], tools: ['getLoans'] },
    { id: 'goals', keys: ['هدف', 'اهداف', 'پس‌انداز برای', 'goal'], tools: ['getGoals', 'getSummary'] },
    { id: 'noncash', keys: ['طلا', 'نقره', 'دلار', 'سکه', 'غیرنقد', 'gold', 'silver'], tools: ['getNoncash'] },
    { id: 'tx', keys: ['تراکنش', 'تاریخچه تراکنش', 'آخرین تراکنش', 'transaction'], tools: ['getRecentTx'] },
    { id: 'advice', keys: ['پیشنهاد', 'توصیه', 'چیکار', 'چه کار', 'بهتره', 'advice', 'suggest', 'راهنمایی'], tools: ['getSummary', 'getLiquidity', 'getInvestments', 'getCashflow', 'getLoans', 'getGoals'] },
    { id: 'summary', keys: ['خلاصه', 'وضعیت', 'گزارش', 'کل دارایی', 'overview', 'status', 'چطوره', 'چطور است'], tools: ['getSummary', 'getLiquidity', 'getInvestments'] }
  ];

  function detectIntents(question, memory) {
    var q = String(question || '');
    var found = [];
    INTENT_MAP.forEach(function (it) {
      if (hasAny(q, it.keys)) found.push(it.id);
    });
    var isFollowUp = hasAny(q, ['نسبت به', 'ماه قبل', 'قبلی', 'همون', 'همان', 'بیشتر بگو', 'یعنی', 'پس ', 'و بعد']) ||
      (q.trim().length < 18 && memory.lastIntents && memory.lastIntents.length);
    if (!found.length && isFollowUp && memory.lastIntents && memory.lastIntents.length) {
      found = memory.lastIntents.slice();
    }
    if (!found.length) found = ['summary'];
    var uniq = [];
    found.forEach(function (id) { if (uniq.indexOf(id) < 0) uniq.push(id); });
    return uniq;
  }

  function selectToolsForIntents(intentIds) {
    var toolSet = {};
    intentIds.forEach(function (id) {
      INTENT_MAP.forEach(function (it) {
        if (it.id === id) it.tools.forEach(function (t) { toolSet[t] = true; });
      });
    });
    if (intentIds.indexOf('advice') >= 0) toolSet.getSummary = true;
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

    if (ctx.summary && (intents.indexOf('summary') >= 0 || intents.indexOf('advice') >= 0)) {
      var s = ctx.summary;
      addData('📊 خلاصه وضعیت (داده واقعی پنل)', [
        '• کل دارایی (نقد + سرمایه‌گذاری): ' + fmtNum(s.totalAssets) + ' تومان',
        '• نقدینگی: ' + fmtNum(s.cashLiquidity) + ' تومان (' + (s.cashRatio || 0) + '٪)',
        '• سرمایه‌گذاری: ' + fmtNum(s.investments) + ' تومان (' + (s.investRatio || 0) + '٪)',
        s.noncashEstimated > 0 ? '• غیرنقد (تخمینی): ' + fmtNum(s.noncashEstimated) + ' تومان' : null
      ]);
    }

    if (ctx.liquidity && (intents.indexOf('liquidity') >= 0 || intents.indexOf('advice') >= 0 || intents.indexOf('summary') >= 0)) {
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

    if (ctx.investments && (intents.indexOf('invest') >= 0 || intents.indexOf('summary') >= 0 || intents.indexOf('advice') >= 0)) {
      var Inv = ctx.investments;
      var linesI = ['مجموع سرمایه‌گذاری: ' + fmtNum(Inv.total) + ' تومان'];
      if (!Inv.items || !Inv.items.length) linesI.push('اطلاعات کافی در پنل ثبت نشده — دارایی سرمایه‌گذاری تعریف نشده.');
      else Inv.items.forEach(function (it) { linesI.push('• ' + it.name + ': ' + fmtNum(it.balance) + ' تومان'); });
      addData('📈 سرمایه‌گذاری', linesI);
    }

    if (ctx.cashflow && (intents.indexOf('expense') >= 0 || intents.indexOf('income') >= 0 || intents.indexOf('cashflow') >= 0 || intents.indexOf('advice') >= 0)) {
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
        if (intents.indexOf('expense') >= 0 && C.recentExpense && C.recentExpense.length) {
          linesC.push('آخرین هزینه‌ها:');
          C.recentExpense.slice(0, 5).forEach(function (t) {
            linesC.push('• ' + fmtNum(t.amount) + ' تومان' + (t.date ? ' (' + t.date + ')' : '') + (t.desc ? ' — ' + t.desc : ''));
          });
        }
        if (intents.indexOf('income') >= 0 && C.recentIncome && C.recentIncome.length) {
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

    if (ctx.loans && intents.indexOf('loans') >= 0) {
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

    if (ctx.goals && (intents.indexOf('goals') >= 0 || intents.indexOf('advice') >= 0)) {
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

    if (ctx.noncash && intents.indexOf('noncash') >= 0) {
      var N = ctx.noncash;
      if (!N.items || !N.items.length) addData('🪙 غیرنقد', ['دارایی غیرنقدی ثبت نشده است.']);
      else {
        var linesN = ['جمع تقریبی: ' + fmtNum(N.total) + ' تومان'].concat(N.items.map(function (it) {
          return '• ' + (it.label || it.category) + ': حدود ' + fmtNum(it.estimatedValue) + ' تومان';
        }));
        addData('🪙 دارایی غیرنقد', linesN);
      }
    }

    if (ctx.recentTx && intents.indexOf('tx') >= 0) {
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

    if (intents.indexOf('advice') >= 0 && !insights.length && ctx.summary) {
      insights.push('ترکیب دارایی را با اهداف خود مقایسه کنید؛ در صورت نبود هدف، یک هدف کوتاه‌مدت تعریف کنید.');
    }

    if (!parts.length) {
      parts.push('برای این سؤال داده مرتبط کافی پیدا نشد.');
      parts.push('می‌توانید درباره نقدینگی، سرمایه‌گذاری، هزینه/درآمد، قرض، اهداف یا تراکنش‌ها بپرسید.');
    }

    if (insights.length) {
      parts.push('💡 پیشنهاد / Insight (بر اساس داده فعلی — نه تضمین آینده):');
      insights.slice(0, 3).forEach(function (ins) { parts.push('• ' + ins); });
    }

    if (!getApiKey()) {
      parts.push('');
      parts.push('ℹ️ حالت محلی. برای مدل زبانی کامل، کلید API را در تنظیمات وارد کنید.');
    }

    return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function getApiKey() {
    try { return localStorage.getItem(AI_KEY_STORAGE) || ''; } catch (e) { return ''; }
  }
  function setApiKey(key) {
    try {
      if (key) localStorage.setItem(AI_KEY_STORAGE, String(key).trim());
      else localStorage.removeItem(AI_KEY_STORAGE);
    } catch (e) {}
  }
  function getEndpoint() {
    try { return localStorage.getItem(AI_ENDPOINT_STORAGE) || DEFAULT_ENDPOINT; } catch (e) { return DEFAULT_ENDPOINT; }
  }
  function setEndpoint(url) {
    try {
      if (url && String(url).trim()) localStorage.setItem(AI_ENDPOINT_STORAGE, String(url).trim());
      else localStorage.removeItem(AI_ENDPOINT_STORAGE);
    } catch (e) {}
  }

  function buildSystemPrompt(ctx, intents) {
    return [
      'تو مشاور مالی شخصی صادق هستی. فقط فارسی روان پاسخ بده.',
      'فقط از Context زیر استفاده کن. عدد اختراع نکن. اگر داده نیست بگو «اطلاعات کافی در پنل ثبت نشده».',
      'بین داده واقعی، تحلیل و پیشنهاد تمایز بگذار. پیشنهادها قطعی نباشند.',
      'Intentها: ' + intents.join(', '),
      'Context انتخاب‌شده:',
      JSON.stringify(ctx)
    ].join('\n');
  }

  async function callAI(userMessage) {
    var intents = detectIntents(userMessage, sessionMemory);
    var toolNames = selectToolsForIntents(intents);
    var ctx = buildSelectedContext(toolNames);
    sessionMemory.lastIntents = intents.slice(0, 4);
    sessionMemory.lastContextKeys = toolNames.slice();
    sessionMemory.lastTopics = intents.slice();

    if (!getApiKey()) {
      return { ok: true, content: buildLocalAnswer(userMessage, intents, ctx), mode: 'local', intents: intents, tools: toolNames };
    }

    var messages = [{ role: 'system', content: buildSystemPrompt(ctx, intents) }];
    chatHistory.slice(-MAX_HISTORY_TURNS * 2).forEach(function (m) {
      messages.push({ role: m.role, content: m.content });
    });
    messages.push({ role: 'user', content: userMessage });

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, 45000);

    try {
      var res = await fetch(getEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getApiKey() },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: messages, temperature: 0.5, max_tokens: 1100 }),
        signal: controller ? controller.signal : undefined
      });
      clearTimeout(timer);
      if (!res.ok) {
        var errText = 'HTTP ' + res.status;
        try { var ej = await res.json(); if (ej.error && ej.error.message) errText = ej.error.message; } catch (e) {}
        return { ok: true, content: '⚠️ خطا در API (' + errText + '). پاسخ محلی:\n\n' + buildLocalAnswer(userMessage, intents, ctx), mode: 'local-fallback', intents: intents };
      }
      var data = await res.json();
      var content = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : null;
      if (!content) return { ok: true, content: buildLocalAnswer(userMessage, intents, ctx), mode: 'local-fallback', intents: intents };
      return { ok: true, content: String(content).trim(), mode: 'api', intents: intents, tools: toolNames };
    } catch (err) {
      clearTimeout(timer);
      var reason = (err && err.name === 'AbortError') ? 'زمان پاسخ تمام شد' : (err && err.message ? err.message : 'خطای شبکه');
      return { ok: true, content: '⚠️ ' + reason + '\n\n' + buildLocalAnswer(userMessage, intents, ctx), mode: 'local-fallback', intents: intents };
    }
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

  function formatMessageContent(text) { return escapeHtml(text).replace(/\n/g, '<br>'); }

  function renderMessages() {
    var list = document.getElementById('aiChatMessages');
    if (!list) return;
    if (!chatHistory.length) {
      list.innerHTML = '<div class="ai-msg ai-msg-assistant"><div class="ai-msg-bubble">سلام! درباره <b>نقدینگی</b>، <b>هزینه</b>، <b>سرمایه‌گذاری</b>، <b>قرض</b> یا <b>اهداف</b> بپرسید. فقط از داده واقعی پنل استفاده می‌کنم.</div></div>';
      return;
    }
    list.innerHTML = chatHistory.map(function (m) {
      var cls = m.role === 'user' ? 'ai-msg-user' : 'ai-msg-assistant';
      return '<div class="ai-msg ' + cls + '"><div class="ai-msg-bubble">' + formatMessageContent(m.content) + '</div></div>';
    }).join('');
    list.scrollTop = list.scrollHeight;
  }

  function setSendingState(sending) {
    isSending = sending;
    var btn = document.getElementById('aiSendBtn');
    var input = document.getElementById('aiChatInput');
    if (btn) { btn.disabled = !!sending; btn.textContent = sending ? '…' : 'ارسال'; }
    if (input) input.disabled = !!sending;
  }

  async function handleSend() {
    if (isSending) return;
    var input = document.getElementById('aiChatInput');
    if (!input) return;
    var text = (input.value || '').trim();
    if (!text) return;
    input.value = '';
    chatHistory.push({ role: 'user', content: text });
    renderMessages();
    saveHistory();
    setSendingState(true);
    var list = document.getElementById('aiChatMessages');
    if (list) {
      var thinking = document.createElement('div');
      thinking.className = 'ai-msg ai-msg-assistant ai-thinking';
      thinking.id = 'aiThinking';
      thinking.innerHTML = '<div class="ai-msg-bubble">در حال انتخاب داده و تحلیل…</div>';
      list.appendChild(thinking);
      list.scrollTop = list.scrollHeight;
    }
    var result;
    try { result = await callAI(text); }
    catch (e) { result = { ok: false, error: (e && e.message) || 'خطا' }; }
    var th = document.getElementById('aiThinking');
    if (th) th.remove();
    if (result && result.ok) chatHistory.push({ role: 'assistant', content: result.content });
    else chatHistory.push({ role: 'assistant', content: '⚠️ ' + ((result && result.error) || 'خطای ناشناخته') });
    saveHistory();
    renderMessages();
    setSendingState(false);
  }

  function renderSettingsPanel() {
    var keyInput = document.getElementById('aiApiKeyInput');
    var endpointInput = document.getElementById('aiEndpointInput');
    if (keyInput) {
      var k = getApiKey();
      keyInput.value = k ? ('••••••••' + k.slice(-4)) : '';
      keyInput.dataset.hasKey = k ? '1' : '0';
    }
    if (endpointInput) endpointInput.value = getEndpoint();
  }

  function bindUI() {
    var sendBtn = document.getElementById('aiSendBtn');
    var input = document.getElementById('aiChatInput');
    var clearBtn = document.getElementById('aiClearBtn');
    var saveKeyBtn = document.getElementById('aiSaveKeyBtn');
    var toggleSettings = document.getElementById('aiToggleSettings');
    if (sendBtn && !sendBtn._aiBound) {
      sendBtn._aiBound = true;
      sendBtn.addEventListener('click', function (e) { e.preventDefault(); handleSend(); });
    }
    if (input && !input._aiBound) {
      input._aiBound = true;
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
      });
    }
    if (clearBtn && !clearBtn._aiBound) {
      clearBtn._aiBound = true;
      clearBtn.addEventListener('click', function () {
        if (confirm('تاریخچه گفتگو پاک شود؟')) clearHistory();
      });
    }
    if (saveKeyBtn && !saveKeyBtn._aiBound) {
      saveKeyBtn._aiBound = true;
      saveKeyBtn.addEventListener('click', function () {
        var keyInput = document.getElementById('aiApiKeyInput');
        var endpointInput = document.getElementById('aiEndpointInput');
        if (keyInput) {
          var val = (keyInput.value || '').trim();
          if (val && val.indexOf('••••') !== 0) setApiKey(val);
          else if (!val) setApiKey('');
        }
        if (endpointInput) setEndpoint((endpointInput.value || '').trim());
        renderSettingsPanel();
        renderMessages();
        if (typeof showToast === 'function') showToast('تنظیمات AI ذخیره شد');
      });
    }
    if (toggleSettings && !toggleSettings._aiBound) {
      toggleSettings._aiBound = true;
      toggleSettings.addEventListener('click', function () {
        var panel = document.getElementById('aiSettingsPanel');
        if (panel) panel.classList.toggle('open');
      });
    }
  }

  function initPage() {
    loadHistory();
    renderMessages();
    renderSettingsPanel();
    bindUI();
  }

  global.FinancialAI = {
    init: initPage,
    clearHistory: clearHistory,
    getApiKey: getApiKey,
    Tools: Tools,
    detectIntents: detectIntents,
    buildSelectedContext: buildSelectedContext,
    _callAI: callAI,
    _sessionMemory: function () { return sessionMemory; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
