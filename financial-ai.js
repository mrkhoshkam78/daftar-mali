/**
 * financial-ai.js — ماژول مستقل Financial AI Advisor (MVP)
 * وابستگی: فقط خواندن state سراسری (assets, bankCards, …) و توابع محاسباتی موجود.
 * هیچ تغییری در منطق فعلی پروژه ایجاد نمی‌کند.
 * کلید API فقط در localStorage کاربر ذخیره می‌شود و هرگز hardcode نمی‌شود.
 */
(function (global) {
  'use strict';

  const AI_KEY_STORAGE = 'daftar-ai-api-key';
  const AI_ENDPOINT_STORAGE = 'daftar-ai-endpoint';
  const AI_HISTORY_STORAGE = 'daftar-ai-chat-history';
  const DEFAULT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
  const MAX_HISTORY = 20;
  const MAX_RECENT_TX = 12;

  let chatHistory = [];
  let isSending = false;

  /* ---------- Context Builder (فقط داده واقعی) ---------- */
  function safeNum(v, def) {
    const n = Number(v);
    return isFinite(n) ? n : (def != null ? def : 0);
  }

  function fmtNum(n) {
    const v = safeNum(n, 0);
    return Math.round(v).toLocaleString('en-US');
  }

  function buildFinancialContext() {
    const ctx = {
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
      // محاسبات از منطق موجود پروژه
      const total = (typeof computeTotal === 'function') ? computeTotal() : 0;
      const cash = (typeof computeCash === 'function') ? computeCash() : 0;
      const invest = (typeof computeInvest === 'function') ? computeInvest() : 0;
      const noncashTotal = (typeof sumNoncashCurrentValues === 'function') ? sumNoncashCurrentValues() : 0;

      ctx.summary = {
        totalAssets: total,
        cashLiquidity: cash,
        investments: invest,
        noncashEstimated: noncashTotal,
        totalWithNoncash: total + noncashTotal
      };

      // دارایی‌های نقد و سرمایه‌گذاری
      if (typeof assets === 'object' && assets && typeof ASSET_DEFS !== 'undefined') {
        const defs = Array.isArray(ASSET_DEFS) ? ASSET_DEFS : [];
        defs.forEach(function (d) {
          if (!d || !d.key) return;
          ctx.assets[d.key] = {
            name: d.name || d.key,
            category: d.cat || '',
            balance: safeNum(assets[d.key], 0)
          };
        });
      }

      // کارت‌های بانکی
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

      // دارایی غیرنقد (خلاصه)
      if (Array.isArray(noncash)) {
        ctx.noncash = noncash.slice(0, 15).map(function (item) {
          const val = (typeof currentValueForNoncash === 'function')
            ? currentValueForNoncash(item)
            : safeNum(item.manualValue, 0);
          return {
            category: item.category || item.cat || 'other',
            label: item.label || item.name || '',
            estimatedValue: val
          };
        });
      }

      // اهداف مالی
      if (Array.isArray(financialGoals)) {
        ctx.goals = financialGoals.map(function (g) {
          return {
            title: g.title || '',
            targetAmount: safeNum(g.targetAmount, 0),
            deadline: g.deadline || null
          };
        });
      }

      // تراکنش‌های اخیر از دفترچه
      if (Array.isArray(notebook)) {
        const sorted = notebook.slice().sort(function (a, b) {
          const da = (a.date || '') + (a.time || '');
          const db = (b.date || '') + (b.time || '');
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

        // قرض‌ها
        const openLoans = notebook.filter(function (e) {
          return e && (e.type === 'lent' || e.type === 'borrowed') && !e.settled;
        });
        let lent = 0, borrowed = 0;
        openLoans.forEach(function (e) {
          const amt = safeNum(e.amount, 0);
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

      // چند یادداشت اخیر (فقط عنوان)
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

  /* ---------- System Prompt ---------- */
  function buildSystemPrompt(context) {
    return [
      'تو یک مشاور مالی شخصی هوشمند و صادق هستی که به زبان فارسی روان و محاوره‌ای پاسخ می‌دهی.',
      'فقط و فقط بر اساس داده‌های واقعی زیر (Context) تحلیل و پیشنهاد بده.',
      'هرگز عدد یا مانده را خودت محاسبه یا حدس نزن؛ اعداد را از Context بگیر.',
      'اگر داده کافی برای پاسخ دقیق نداری، صریحاً بگو «اطلاعات کافی در پنل ثبت نشده» و حدس نزن.',
      'پاسخ‌ها را مختصر، مفید، تحلیلی و با توضیح دلیل پیشنهاد ارائه بده.',
      'از لحن مثبت و حرفه‌ای استفاده کن. پیشنهادهای عملی و واقع‌بینانه بده.',
      'واحد پول تومان است.',
      '',
      '=== وضعیت مالی فعلی کاربر ===',
      JSON.stringify(context, null, 0)
    ].join('\n');
  }

  /* ---------- API Call ---------- */
  function getApiKey() {
    try { return localStorage.getItem(AI_KEY_STORAGE) || ''; } catch (e) { return ''; }
  }

  function setApiKey(key) {
    try {
      if (key) localStorage.setItem(AI_KEY_STORAGE, key.trim());
      else localStorage.removeItem(AI_KEY_STORAGE);
    } catch (e) {}
  }

  function getEndpoint() {
    try {
      return localStorage.getItem(AI_ENDPOINT_STORAGE) || DEFAULT_ENDPOINT;
    } catch (e) { return DEFAULT_ENDPOINT; }
  }

  function setEndpoint(url) {
    try {
      if (url && url.trim()) localStorage.setItem(AI_ENDPOINT_STORAGE, url.trim());
      else localStorage.removeItem(AI_ENDPOINT_STORAGE);
    } catch (e) {}
  }

  async function callAI(userMessage) {
    const apiKey = getApiKey();
    if (!apiKey) {
      return {
        ok: false,
        error: 'کلید API تنظیم نشده. لطفاً در بخش تنظیمات این صفحه کلید خود را وارد کنید.'
      };
    }

    const endpoint = getEndpoint();
    const context = buildFinancialContext();
    const systemPrompt = buildSystemPrompt(context);

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // تاریخچه محدود
    chatHistory.slice(-MAX_HISTORY).forEach(function (m) {
      messages.push({ role: m.role, content: m.content });
    });
    messages.push({ role: 'user', content: userMessage });

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(function () {
      if (controller) controller.abort();
    }, 45000);

    try {
      const res = await fetch(endpoint, {
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
        let errText = 'HTTP ' + res.status;
        try {
          const errJson = await res.json();
          if (errJson.error && errJson.error.message) errText = errJson.error.message;
        } catch (e) {}
        return { ok: false, error: 'خطای API: ' + errText };
      }

      const data = await res.json();
      const content = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : null;

      if (!content) {
        return { ok: false, error: 'پاسخ خالی از سرویس هوش مصنوعی دریافت شد.' };
      }

      return { ok: true, content: content.trim() };
    } catch (err) {
      clearTimeout(timer);
      if (err && err.name === 'AbortError') {
        return { ok: false, error: 'زمان پاسخ‌گویی به پایان رسید. دوباره تلاش کنید.' };
      }
      return {
        ok: false,
        error: 'خطا در ارتباط با سرویس: ' + (err && err.message ? err.message : 'نامشخص')
      };
    }
  }

  /* ---------- Chat History Persistence ---------- */
  function loadHistory() {
    try {
      const raw = localStorage.getItem(AI_HISTORY_STORAGE);
      if (raw) {
        const arr = JSON.parse(raw);
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
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatMessageContent(text) {
    // ساده: خطوط جدید + کد بلاک‌های خیلی پایه
    let html = escapeHtml(text);
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  function renderMessages() {
    const list = document.getElementById('aiChatMessages');
    if (!list) return;

    if (!chatHistory.length) {
      list.innerHTML = [
        '<div class="ai-msg ai-msg-assistant">',
        '<div class="ai-msg-bubble">سلام! من مشاور مالی هوشمند شما هستم. ',
        'می‌توانید درباره وضعیت دارایی‌ها، نقدینگی، اهداف، هزینه‌ها یا هر سؤال مالی بپرسید. ',
        'پاسخ‌ها بر اساس داده‌های واقعی پنل شماست.</div></div>'
      ].join('');
      return;
    }

    list.innerHTML = chatHistory.map(function (m) {
      const cls = m.role === 'user' ? 'ai-msg-user' : 'ai-msg-assistant';
      return '<div class="ai-msg ' + cls + '"><div class="ai-msg-bubble">' +
        formatMessageContent(m.content) + '</div></div>';
    }).join('');

    list.scrollTop = list.scrollHeight;
  }

  function setSendingState(sending) {
    isSending = sending;
    const btn = document.getElementById('aiSendBtn');
    const input = document.getElementById('aiChatInput');
    if (btn) {
      btn.disabled = sending;
      btn.textContent = sending ? 'در حال ارسال…' : 'ارسال';
    }
    if (input) input.disabled = sending;
  }

  async function handleSend() {
    if (isSending) return;
    const input = document.getElementById('aiChatInput');
    if (!input) return;
    const text = (input.value || '').trim();
    if (!text) return;

    input.value = '';
    chatHistory.push({ role: 'user', content: text });
    renderMessages();
    saveHistory();
    setSendingState(true);

    // نشانگر در حال فکر
    const list = document.getElementById('aiChatMessages');
    if (list) {
      const thinking = document.createElement('div');
      thinking.className = 'ai-msg ai-msg-assistant ai-thinking';
      thinking.id = 'aiThinking';
      thinking.innerHTML = '<div class="ai-msg-bubble">در حال تحلیل وضعیت مالی شما…</div>';
      list.appendChild(thinking);
      list.scrollTop = list.scrollHeight;
    }

    const result = await callAI(text);

    const thinkingEl = document.getElementById('aiThinking');
    if (thinkingEl) thinkingEl.remove();

    if (result.ok) {
      chatHistory.push({ role: 'assistant', content: result.content });
    } else {
      chatHistory.push({
        role: 'assistant',
        content: '⚠️ ' + (result.error || 'خطای ناشناخته')
      });
    }
    saveHistory();
    renderMessages();
    setSendingState(false);
  }

  function renderSettingsPanel() {
    const keyInput = document.getElementById('aiApiKeyInput');
    const endpointInput = document.getElementById('aiEndpointInput');
    if (keyInput) {
      const k = getApiKey();
      keyInput.value = k ? '••••••••' + k.slice(-4) : '';
      keyInput.dataset.hasKey = k ? '1' : '0';
    }
    if (endpointInput) {
      endpointInput.value = getEndpoint();
    }
  }

  function bindUI() {
    const sendBtn = document.getElementById('aiSendBtn');
    const input = document.getElementById('aiChatInput');
    const clearBtn = document.getElementById('aiClearBtn');
    const saveKeyBtn = document.getElementById('aiSaveKeyBtn');
    const toggleSettings = document.getElementById('aiToggleSettings');

    if (sendBtn && !sendBtn._bound) {
      sendBtn._bound = true;
      sendBtn.addEventListener('click', handleSend);
    }
    if (input && !input._bound) {
      input._bound = true;
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      });
    }
    if (clearBtn && !clearBtn._bound) {
      clearBtn._bound = true;
      clearBtn.addEventListener('click', function () {
        if (confirm('تاریخچه گفتگو پاک شود؟')) clearHistory();
      });
    }
    if (saveKeyBtn && !saveKeyBtn._bound) {
      saveKeyBtn._bound = true;
      saveKeyBtn.addEventListener('click', function () {
        const keyInput = document.getElementById('aiApiKeyInput');
        const endpointInput = document.getElementById('aiEndpointInput');
        if (keyInput) {
          const val = keyInput.value.trim();
          if (val && !val.startsWith('••••')) {
            setApiKey(val);
          } else if (!val) {
            setApiKey('');
          }
        }
        if (endpointInput) {
          setEndpoint(endpointInput.value.trim());
        }
        renderSettingsPanel();
        if (typeof showToast === 'function') showToast('تنظیمات AI ذخیره شد');
        else alert('تنظیمات ذخیره شد');
      });
    }
    if (toggleSettings && !toggleSettings._bound) {
      toggleSettings._bound = true;
      toggleSettings.addEventListener('click', function () {
        const panel = document.getElementById('aiSettingsPanel');
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

  /* ---------- Public API ---------- */
  const FinancialAI = {
    init: initPage,
    buildContext: buildFinancialContext,
    clearHistory: clearHistory,
    getApiKey: getApiKey,
    // برای تست و دیباگ
    _callAI: callAI
  };

  global.FinancialAI = FinancialAI;

  // self-init وقتی صفحه AI فعال شود (از showPage صدا زده می‌شود)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      // فقط bind اولیه؛ رندر کامل هنگام ورود به صفحه
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
