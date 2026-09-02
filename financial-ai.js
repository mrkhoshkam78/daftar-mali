/**
 * financial-ai.js — ماژول مستقل Financial AI Advisor (MVP v2)
 * وابستگی: فقط خواندن state سراسری و توابع محاسباتی موجود پروژه.
 * هیچ تغییری در منطق/محاسبات/UI فعلی ایجاد نمی‌کند.
 * کلید API فقط در localStorage کاربر ذخیره می‌شود (هرگز hardcode نمی‌شود).
 * بدون کلید: تحلیل‌گر محلی مبتنی بر Context واقعی پاسخ می‌دهد.
 * با کلید: درخواست به API سازگار با OpenAI ارسال می‌شود.
 */
(function (global) {
  'use strict';

  var AI_KEY_STORAGE = 'daftar-ai-api-key';
  var AI_ENDPOINT_STORAGE = 'daftar-ai-endpoint';
  var AI_HISTORY_STORAGE = 'daftar-ai-chat-history';
  var DEFAULT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
  var MAX_HISTORY = 20;
  var MAX_RECENT_TX = 12;

  var chatHistory = [];
  var isSending = false;
  var _inited = false;

  /* ---------- helpers ---------- */
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

  /* ---------- Context Builder (فقط داده واقعی) ---------- */
  function buildFinancialContext() {
    var ctx = {
      generatedAt: new Date().toISOString(),
      currency: 'تومان',
      summary: {},
      assets: {},
      bankCards: [],
      noncash: [],
      goals: [],
      recentTransactions: [],
      loans: { lentOpen: 0, borrowedOpen: 0, items: [] },
      notes: []
    };

    try {
      var total = (typeof computeTotal === 'function') ? computeTotal() : 0;
      var cash = (typeof computeCash === 'function') ? computeCash() : 0;
      var invest = (typeof computeInvest === 'function') ? computeInvest() : 0;
      var noncashTotal = (typeof sumNoncashCurrentValues === 'function') ? sumNoncashCurrentValues() : 0;

      ctx.summary = {
        totalAssets: total,
        cashLiquidity: cash,
        investments: invest,
        noncashEstimated: noncashTotal,
        totalWithNoncash: total + noncashTotal
      };

      if (typeof assets === 'object' && assets && typeof ASSET_DEFS !== 'undefined') {
        var defs = Array.isArray(ASSET_DEFS) ? ASSET_DEFS : [];
        defs.forEach(function (d) {
          if (!d || !d.key) return;
          ctx.assets[d.key] = {
            name: d.name || d.key,
            category: d.cat || '',
            balance: safeNum(assets[d.key], 0)
          };
        });
      }

      if (Array.isArray(bankCards)) {
        ctx.bankCards = bankCards.map(function (c) {
          return {
            name: c.name || 'کارت',
            last4: c.last4 || '',
            balance: safeNum(c.balance, 0),
            isDefault: !!c.isDefault
          };
        });
      }

      if (Array.isArray(noncash)) {
        ctx.noncash = noncash.slice(0, 15).map(function (item) {
          var val = (typeof currentValueForNoncash === 'function')
            ? currentValueForNoncash(item)
            : safeNum(item.manualValue, 0);
          return {
            category: item.category || item.cat || 'other',
            label: item.label || item.name || '',
            estimatedValue: val
          };
        });
      }

      if (Array.isArray(financialGoals)) {
        ctx.goals = financialGoals.map(function (g) {
          return {
            title: g.title || '',
            targetAmount: safeNum(g.targetAmount, 0),
            deadline: g.deadline || null
          };
        });
      }

      if (Array.isArray(notebook)) {
        var sorted = notebook.slice().sort(function (a, b) {
          var da = (a.date || '') + (a.time || '');
          var db = (b.date || '') + (b.time || '');
          return db.localeCompare(da);
        });
        ctx.recentTransactions = sorted.slice(0, MAX_RECENT_TX).map(function (e) {
          return {
            type: e.type || '',
            amount: safeNum(e.amount, 0),
            date: e.date || '',
            person: e.person || '',
            desc: (e.desc || '').slice(0, 80),
            settled: !!e.settled
          };
        });

        var openLoans = notebook.filter(function (e) {
          return e && (e.type === 'lent' || e.type === 'borrowed') && !e.settled;
        });
        var lent = 0, borrowed = 0;
        openLoans.forEach(function (e) {
          var amt = safeNum(e.amount, 0);
          if (e.type === 'lent') lent += amt;
          else borrowed += amt;
        });
        ctx.loans = {
          lentOpen: lent,
          borrowedOpen: borrowed,
          items: openLoans.slice(0, 8).map(function (e) {
            return {
              type: e.type,
              amount: safeNum(e.amount, 0),
              person: e.person || '',
              date: e.date || ''
            };
          })
        };
      }

      if (Array.isArray(notes)) {
        ctx.notes = notes.slice(0, 5).map(function (n) {
          return { title: (n.title || '').slice(0, 60), pinned: !!n.pinned };
        });
      }
    } catch (err) {
      console.error('[FinancialAI] context build error', err);
      ctx._error = 'خطا در ساخت خلاصه وضعیت مالی';
    }

    return ctx;
  }

  /* ---------- Local intelligent analyzer (بدون نیاز به API) ---------- */
  function localAnalyze(userMessage, ctx) {
    var q = String(userMessage || '').toLowerCase();
    var s = ctx.summary || {};
    var lines = [];

    function has(words) {
      return words.some(function (w) { return q.indexOf(w) !== -1; });
    }

    // خلاصه کلی
    if (has(['خلاصه', 'وضعیت', 'چطوره', 'چطور است', 'گزارش', 'کل', 'overview', 'status'])) {
      lines.push('📊 خلاصه وضعیت مالی شما (بر اساس داده‌های واقعی پنل):');
      lines.push('• کل دارایی نقد + سرمایه‌گذاری: ' + fmtNum(s.totalAssets) + ' تومان');
      lines.push('• نقدینگی (کارت + پول نقد): ' + fmtNum(s.cashLiquidity) + ' تومان');
      lines.push('• سرمایه‌گذاری‌ها: ' + fmtNum(s.investments) + ' تومان');
      if (s.noncashEstimated > 0) {
        lines.push('• ارزش تقریبی دارایی غیرنقد: ' + fmtNum(s.noncashEstimated) + ' تومان');
        lines.push('• جمع تقریبی با غیرنقد: ' + fmtNum(s.totalWithNoncash) + ' تومان');
      }
    }

    // نقدینگی
    if (has(['نقد', 'نقدینگی', 'کارت', 'پول نقد', 'موجودی', 'liquidity', 'cash'])) {
      lines.push('💰 نقدینگی:');
      lines.push('مجموع نقدینگی: ' + fmtNum(s.cashLiquidity) + ' تومان');
      if (ctx.assets) {
        Object.keys(ctx.assets).forEach(function (k) {
          var a = ctx.assets[k];
          if (a.category === 'نقدینگی') {
            lines.push('• ' + a.name + ': ' + fmtNum(a.balance) + ' تومان');
          }
        });
      }
      if (ctx.bankCards && ctx.bankCards.length) {
        lines.push('کارت‌های بانکی:');
        ctx.bankCards.forEach(function (c) {
          lines.push('• ' + c.name + (c.last4 ? ' (…' + c.last4 + ')' : '') +
            (c.isDefault ? ' [پیش‌فرض]' : '') + ': ' + fmtNum(c.balance) + ' تومان');
        });
      } else {
        lines.push('هنوز کارت بانکی جداگانه‌ای ثبت نشده (موجودی کارت از دارایی «کارت» خوانده می‌شود).');
      }
    }

    // سرمایه‌گذاری
    if (has(['سرمایه', 'سرمایه‌گذاری', 'اسنپ', 'حامی', 'فارابی', 'invest', 'fund'])) {
      lines.push('📈 سرمایه‌گذاری‌ها:');
      lines.push('مجموع: ' + fmtNum(s.investments) + ' تومان');
      if (ctx.assets) {
        Object.keys(ctx.assets).forEach(function (k) {
          var a = ctx.assets[k];
          if (a.category === 'سرمایه‌گذاری') {
            lines.push('• ' + a.name + ': ' + fmtNum(a.balance) + ' تومان');
          }
        });
      }
      if (s.totalAssets > 0) {
        var pct = Math.round((s.investments / s.totalAssets) * 100);
        lines.push('سهم سرمایه‌گذاری از کل دارایی: حدود ' + pct + '٪');
      }
    }

    // اهداف
    if (has(['هدف', 'اهداف', 'goal'])) {
      if (ctx.goals && ctx.goals.length) {
        lines.push('🎯 اهداف مالی ثبت‌شده:');
        ctx.goals.forEach(function (g) {
          lines.push('• ' + (g.title || 'بدون عنوان') + ' — هدف: ' + fmtNum(g.targetAmount) + ' تومان' +
            (g.deadline ? ' (مهلت: ' + g.deadline + ')' : ''));
        });
      } else {
        lines.push('هنوز هدف مالی در پنل ثبت نشده. می‌توانید از بخش «اهداف مالی» هدف اضافه کنید.');
      }
    }

    // قرض
    if (has(['قرض', 'بدهی', 'وام', 'lent', 'borrow', 'debt'])) {
      var L = ctx.loans || {};
      lines.push('🤝 وضعیت قرض‌ها:');
      lines.push('• قرض داده‌شده (تسویه‌نشده): ' + fmtNum(L.lentOpen) + ' تومان');
      lines.push('• قرض گرفته‌شده (تسویه‌نشده): ' + fmtNum(L.borrowedOpen) + ' تومان');
      if (L.items && L.items.length) {
        lines.push('جزئیات:');
        L.items.forEach(function (it) {
          var label = it.type === 'lent' ? 'قرض داده' : 'قرض گرفته';
          lines.push('• ' + label + ' به/از ' + (it.person || '—') + ': ' + fmtNum(it.amount) + ' تومان');
        });
      } else if (!L.lentOpen && !L.borrowedOpen) {
        lines.push('قرض تسویه‌نشده‌ای ثبت نشده است.');
      }
    }

    // تراکنش / هزینه / درآمد
    if (has(['تراکنش', 'هزینه', 'خرج', 'درآمد', 'پرداخت', 'دریافت', 'transaction', 'expense', 'income'])) {
      if (ctx.recentTransactions && ctx.recentTransactions.length) {
        lines.push('🧾 آخرین تراکنش‌های ثبت‌شده:');
        ctx.recentTransactions.slice(0, 8).forEach(function (t) {
          var typeLabel = ({
            deposit: 'دریافتی', payment: 'پرداخت', lent: 'قرض داده',
            borrowed: 'قرض گرفته', transfer: 'انتقال'
          })[t.type] || t.type;
          lines.push('• ' + typeLabel + ': ' + fmtNum(t.amount) + ' تومان' +
            (t.date ? ' (' + t.date + ')' : '') +
            (t.person ? ' — ' + t.person : '') +
            (t.desc ? ' · ' + t.desc : ''));
        });
      } else {
        lines.push('هنوز تراکنشی در دفترچه ثبت نشده است.');
      }
    }

    // غیرنقد
    if (has(['طلا', 'نقره', 'دلار', 'سکه', 'غیرنقد', 'noncash', 'gold'])) {
      if (ctx.noncash && ctx.noncash.length) {
        lines.push('🪙 دارایی غیرنقد:');
        ctx.noncash.forEach(function (n) {
          lines.push('• ' + (n.label || n.category) + ': حدود ' + fmtNum(n.estimatedValue) + ' تومان');
        });
        lines.push('جمع تقریبی: ' + fmtNum(s.noncashEstimated) + ' تومان');
      } else {
        lines.push('دارایی غیرنقدی ثبت نشده است.');
      }
    }

    // پیشنهاد / توصیه
    if (has(['پیشنهاد', 'توصیه', 'چیکار', 'چه کار', 'advice', 'suggest', 'بهتر'])) {
      lines.push('💡 پیشنهاد بر اساس وضعیت فعلی:');
      if (s.cashLiquidity < s.totalAssets * 0.15 && s.totalAssets > 0) {
        lines.push('• نقدینگی نسبت به کل دارایی پایین به نظر می‌رسد؛ بخشی از سرمایه‌گذاری را نقد نگه دارید.');
      } else if (s.cashLiquidity > s.totalAssets * 0.5 && s.totalAssets > 0) {
        lines.push('• بخش زیادی از دارایی نقد است؛ در صورت تمایل می‌توانید بخشی را به سرمایه‌گذاری منتقل کنید.');
      } else {
        lines.push('• ترکیب نقد و سرمایه‌گذاری نسبتاً متعادل به نظر می‌رسد.');
      }
      if (!(ctx.goals && ctx.goals.length)) {
        lines.push('• ثبت حداقل یک هدف مالی مشخص کمک می‌کند برنامه‌ریزی دقیق‌تری داشته باشید.');
      }
      if ((ctx.loans && ctx.loans.borrowedOpen > 0)) {
        lines.push('• قرض گرفته‌شده تسویه‌نشده دارید؛ اولویت بازپرداخت را در نظر بگیرید.');
      }
    }

    // اگر هیچ دسته‌ای match نشد → خلاصه پیش‌فرض
    if (!lines.length) {
      lines.push('سلام! بر اساس داده‌های فعلی پنل:');
      lines.push('• کل دارایی: ' + fmtNum(s.totalAssets) + ' تومان');
      lines.push('• نقدینگی: ' + fmtNum(s.cashLiquidity) + ' تومان');
      lines.push('• سرمایه‌گذاری: ' + fmtNum(s.investments) + ' تومان');
      lines.push('');
      lines.push('می‌توانید بپرسید: وضعیت نقدینگی، سرمایه‌گذاری‌ها، اهداف، قرض‌ها، تراکنش‌های اخیر، یا درخواست پیشنهاد.');
    }

    // یادآوری حالت محلی
    if (!getApiKey()) {
      lines.push('');
      lines.push('ℹ️ این پاسخ با تحلیل‌گر محلی و داده‌های واقعی پنل ساخته شده. برای پاسخ کامل‌تر با مدل زبانی، کلید API را در تنظیمات وارد کنید.');
    }

    return lines.join('\n');
  }

  /* ---------- System Prompt (برای API واقعی) ---------- */
  function buildSystemPrompt(context) {
    return [
      'تو یک مشاور مالی شخصی هوشمند و صادق هستی که به زبان فارسی روان پاسخ می‌دهی.',
      'فقط بر اساس داده‌های واقعی Context زیر تحلیل و پیشنهاد بده.',
      'هرگز عدد یا مانده را خودت محاسبه یا حدس نزن؛ اعداد را از Context بگیر.',
      'اگر داده کافی نداری، صریحاً بگو «اطلاعات کافی در پنل ثبت نشده».',
      'پاسخ‌ها مختصر، مفید و با توضیح دلیل باشند. واحد پول تومان است.',
      '',
      '=== وضعیت مالی فعلی کاربر ===',
      JSON.stringify(context)
    ].join('\n');
  }

  /* ---------- API key / endpoint ---------- */
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
    try { return localStorage.getItem(AI_ENDPOINT_STORAGE) || DEFAULT_ENDPOINT; }
    catch (e) { return DEFAULT_ENDPOINT; }
  }
  function setEndpoint(url) {
    try {
      if (url && String(url).trim()) localStorage.setItem(AI_ENDPOINT_STORAGE, String(url).trim());
      else localStorage.removeItem(AI_ENDPOINT_STORAGE);
    } catch (e) {}
  }

  /* ---------- Call AI (API یا محلی) ---------- */
  async function callAI(userMessage) {
    var context = buildFinancialContext();
    var apiKey = getApiKey();

    // بدون کلید → تحلیل‌گر محلی (همیشه پاسخ می‌دهد)
    if (!apiKey) {
      return { ok: true, content: localAnalyze(userMessage, context), mode: 'local' };
    }

    var endpoint = getEndpoint();
    var systemPrompt = buildSystemPrompt(context);
    var messages = [{ role: 'system', content: systemPrompt }];
    chatHistory.slice(-MAX_HISTORY).forEach(function (m) {
      messages.push({ role: m.role, content: m.content });
    });
    messages.push({ role: 'user', content: userMessage });

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (controller) controller.abort();
    }, 45000);

    try {
      var res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: 0.6,
          max_tokens: 1200
        }),
        signal: controller ? controller.signal : undefined
      });
      clearTimeout(timer);

      if (!res.ok) {
        var errText = 'HTTP ' + res.status;
        try {
          var errJson = await res.json();
          if (errJson.error && errJson.error.message) errText = errJson.error.message;
        } catch (e) {}
        // fallback به محلی در صورت خطای API
        var local = localAnalyze(userMessage, context);
        return {
          ok: true,
          content: '⚠️ خطا در API (' + errText + '). پاسخ محلی:\n\n' + local,
          mode: 'local-fallback'
        };
      }

      var data = await res.json();
      var content = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : null;
      if (!content) {
        return { ok: true, content: localAnalyze(userMessage, context), mode: 'local-fallback' };
      }
      return { ok: true, content: String(content).trim(), mode: 'api' };
    } catch (err) {
      clearTimeout(timer);
      var local = localAnalyze(userMessage, context);
      var reason = (err && err.name === 'AbortError')
        ? 'زمان پاسخ به پایان رسید'
        : (err && err.message ? err.message : 'خطای شبکه');
      return {
        ok: true,
        content: '⚠️ ' + reason + '. پاسخ محلی بر اساس داده‌های پنل:\n\n' + local,
        mode: 'local-fallback'
      };
    }
  }

  /* ---------- History ---------- */
  function loadHistory() {
    try {
      var raw = localStorage.getItem(AI_HISTORY_STORAGE);
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr)) chatHistory = arr.slice(-MAX_HISTORY * 2);
      }
    } catch (e) { chatHistory = []; }
  }
  function saveHistory() {
    try {
      localStorage.setItem(AI_HISTORY_STORAGE, JSON.stringify(chatHistory.slice(-MAX_HISTORY * 2)));
    } catch (e) {}
  }
  function clearHistory() {
    chatHistory = [];
    saveHistory();
    renderMessages();
  }

  /* ---------- UI ---------- */
  function formatMessageContent(text) {
    return escapeHtml(text).replace(/\n/g, '<br>');
  }

  function renderMessages() {
    var list = document.getElementById('aiChatMessages');
    if (!list) return;

    if (!chatHistory.length) {
      list.innerHTML =
        '<div class="ai-msg ai-msg-assistant">' +
        '<div class="ai-msg-bubble">سلام! من مشاور مالی شما هستم. ' +
        'می‌توانید درباره نقدینگی، سرمایه‌گذاری، اهداف، قرض‌ها یا تراکنش‌ها سؤال بپرسید. ' +
        'پاسخ‌ها بر اساس داده‌های واقعی پنل است.' +
        (getApiKey() ? '' : '<br><br>ℹ️ فعلاً بدون کلید API در حالت محلی کار می‌کند. برای مدل زبانی کامل، کلید را در تنظیمات وارد کنید.') +
        '</div></div>';
      return;
    }

    list.innerHTML = chatHistory.map(function (m) {
      var cls = m.role === 'user' ? 'ai-msg-user' : 'ai-msg-assistant';
      return '<div class="ai-msg ' + cls + '"><div class="ai-msg-bubble">' +
        formatMessageContent(m.content) + '</div></div>';
    }).join('');
    list.scrollTop = list.scrollHeight;
  }

  function setSendingState(sending) {
    isSending = sending;
    var btn = document.getElementById('aiSendBtn');
    var input = document.getElementById('aiChatInput');
    if (btn) {
      btn.disabled = !!sending;
      btn.textContent = sending ? '…' : 'ارسال';
    }
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
      thinking.innerHTML = '<div class="ai-msg-bubble">در حال تحلیل…</div>';
      list.appendChild(thinking);
      list.scrollTop = list.scrollHeight;
    }

    var result;
    try {
      result = await callAI(text);
    } catch (e) {
      result = { ok: false, error: (e && e.message) || 'خطای ناشناخته' };
    }

    var thinkingEl = document.getElementById('aiThinking');
    if (thinkingEl) thinkingEl.remove();

    if (result && result.ok) {
      chatHistory.push({ role: 'assistant', content: result.content });
    } else {
      chatHistory.push({
        role: 'assistant',
        content: '⚠️ ' + ((result && result.error) || 'خطای ناشناخته')
      });
    }
    saveHistory();
    renderMessages();
    setSendingState(false);
  }

  function renderSettingsPanel() {
    var keyInput = document.getElementById('aiApiKeyInput');
    var endpointInput = document.getElementById('aiEndpointInput');
    if (keyInput) {
      var k = getApiKey();
      if (k) {
        keyInput.value = '••••••••' + k.slice(-4);
        keyInput.dataset.hasKey = '1';
      } else {
        keyInput.value = '';
        keyInput.dataset.hasKey = '0';
      }
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
      sendBtn.addEventListener('click', function (e) {
        e.preventDefault();
        handleSend();
      });
    }
    if (input && !input._aiBound) {
      input._aiBound = true;
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
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
    _inited = true;
  }

  /* ---------- Public ---------- */
  global.FinancialAI = {
    init: initPage,
    buildContext: buildFinancialContext,
    clearHistory: clearHistory,
    getApiKey: getApiKey,
    _callAI: callAI,
    _localAnalyze: localAnalyze
  };
})(typeof window !== 'undefined' ? window : globalThis);
