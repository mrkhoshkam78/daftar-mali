/* ==========================================================================
   app-ui.js — رندر UI، نمودارها، دارایی، اسنپ، تراکنش، اهداف، کارت بانکی
   وابستگی: بعد از app-core.js | قبل از app-notes.js و app-boot.js
   scope سراسری؛ نام توابع عمومی و رفتار DOM نباید تغییر کند.
   ========================================================================== */

/* --- Orchestrator: refresh all visible panels --- */
function render(){
  $('sumInvest').textContent = fmt(computeInvest());
  $('sumCash').textContent = fmt(computeCash());
  $('totalNet').innerHTML = fmt(computeTotal()) + ' <small>تومان</small>';
  renderDonut();
  renderTrendChart(currentTrendRange);
  renderAssetCards();
  renderLogs();
  renderTxs();
  renderHistory();
  renderNonCash();
  renderNotebook();
  renderForecast();
  if(typeof renderFinancialAnalysis === 'function') renderFinancialAnalysis();
  if(typeof renderNotes === 'function') renderNotes();
  if(typeof renderFinancialGoals === 'function') renderFinancialGoals();
}

let selectedDonutKey = null;

function selectDonutAsset(key){
  selectedDonutKey = key;
  const total = computeTotal();
  const def = ASSET_DEFS.find(d => d.key === key);
  const tip = $('donutTip');
  const centerLbl = $('donutCenterLabel');
  const centerVal = $('donutTotal');
  document.querySelectorAll('#legendList .legend-item').forEach(el=>{
    el.classList.toggle('active', el.dataset.key === key);
  });
  if(!def){
    if(tip) tip.innerHTML = 'برای دیدن جزئیات، روی هر دارایی بزنید';
    if(centerLbl) centerLbl.textContent = 'جمع کل';
    if(centerVal) centerVal.textContent = total ? fmt(total) : '۰';
    return;
  }
  const v = safeNum(assets[key], 0);
  const pct = total ? (v / total * 100) : 0;
  if(tip) tip.innerHTML = `<span style="color:var(--ink)">${def.name}</span> — <strong>${fmt(v)} تومان</strong> <span style="opacity:.7">(${pct.toFixed(1)}٪)</span>`;
  if(centerLbl) centerLbl.textContent = def.name;
  if(centerVal) centerVal.textContent = fmt(v);
}

/* --- Dashboard: donut + legend --- */
function renderDonut(){
  const donut = $('donutChart');
  const legend = $('legendList');
  const tip = $('donutTip');
  const centerLbl = $('donutCenterLabel');
  const centerVal = $('donutTotal');

  // فقط دارایی‌های واقعی با مقدار معتبر و مثبت
  const items = [];
  (Array.isArray(ASSET_DEFS) ? ASSET_DEFS : []).forEach(d => {
    if(!d || !d.key) return;
    const v = safeNum(assets && assets[d.key], 0);
    if(!(v > 0) || !isFinite(v)) return;
    items.push({ key: d.key, name: d.name, color: d.color, value: v });
  });
  const displayTotal = items.reduce((s, it) => s + it.value, 0);

  // حذف لایهٔ SVG معیوب قبلی در صورت وجود
  if(donut){
    const oldSvg = donut.querySelector('.donut-seg-svg');
    if(oldSvg) oldSvg.remove();
  }

  if(!(displayTotal > 0)){
    if(donut) donut.style.background = 'var(--card-2)';
    if(legend) legend.innerHTML = '<div class="empty">دارایی‌ای ثبت نشده است</div>';
    if(centerLbl) centerLbl.textContent = 'جمع کل';
    if(centerVal) centerVal.textContent = '۰';
    if(tip) tip.textContent = 'دارایی‌ای برای نمایش وجود ندارد';
    selectedDonutKey = null;
    return;
  }

  // درصدها با روش Largest Remainder تا مجموع دقیقاً ۱۰۰٫۰٪ شود
  const raw = items.map(it => (it.value / displayTotal) * 100);
  const floors = raw.map(p => Math.floor(p * 10) / 10);
  let rest = Math.round((100 - floors.reduce((a,b)=>a+b, 0)) * 10); // دهم‌درصد باقی
  const order = raw.map((p,i) => ({ i, frac: p * 10 - Math.floor(p * 10) }))
    .sort((a,b) => b.frac - a.frac);
  const pcts = floors.slice();
  for(let k = 0; k < order.length && rest > 0; k++, rest--){
    pcts[order[k].i] = Math.round((pcts[order[k].i] + 0.1) * 10) / 10;
  }
  // اطمینان نهایی از جمع ۱۰۰
  const pctSum = pcts.reduce((a,b)=>a+b, 0);
  if(Math.abs(pctSum - 100) > 0.01 && pcts.length){
    pcts[pcts.length - 1] = Math.round((pcts[pcts.length - 1] + (100 - pctSum)) * 10) / 10;
  }

  let acc = 0;
  const stops = [];
  const segments = [];
  items.forEach((it, i) => {
    const pct = Math.max(0, safeNum(pcts[i], 0));
    const start = acc;
    const end = acc + pct;
    stops.push(it.color + ' ' + start + '% ' + end + '%');
    segments.push({ key: it.key, start, end, color: it.color, name: it.name, value: it.value, pct });
    acc = end;
  });

  if(donut){
    donut.style.background = stops.length ? ('conic-gradient(' + stops.join(',') + ')') : 'var(--card-2)';
  }

  if(legend){
    legend.innerHTML = items.map((it, i) => {
      const pct = safeNum(pcts[i], 0);
      const active = selectedDonutKey === it.key ? ' active' : '';
      return '<div class="legend-item' + active + '" data-key="' + it.key + '">' +
        '<span class="legend-dot" style="background:' + it.color + '"></span>' +
        '<span class="legend-name">' + it.name + '</span>' +
        '<span class="legend-pct">' + pct.toFixed(1) + '%</span></div>';
    }).join('');

    legend.querySelectorAll('.legend-item').forEach(el => {
      el.addEventListener('click', () => {
        const key = el.dataset.key;
        if(selectedDonutKey === key){
          selectedDonutKey = null;
          selectDonutAsset(null);
        } else {
          selectDonutAsset(key);
        }
      });
    });
  }

  if(donut && !donut._donutBound){
    donut._donutBound = true;
    donut.style.cursor = 'pointer';
    donut.addEventListener('click', (e) => {
      const rect = donut.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const x = e.clientX - cx;
      const y = e.clientY - cy;
      let ang = Math.atan2(x, -y) * 180 / Math.PI;
      if(ang < 0) ang += 360;
      const pctAng = ang / 360 * 100;
      // بازسازی segmentها از دارایی‌های مثبت فعلی
      let a = 0;
      let found = null;
      let sum = 0;
      const live = [];
      (Array.isArray(ASSET_DEFS) ? ASSET_DEFS : []).forEach(d => {
        const v = safeNum(assets && assets[d.key], 0);
        if(v > 0){ live.push({ key: d.key, value: v }); sum += v; }
      });
      if(!(sum > 0)) return;
      for(const it of live){
        const p = (it.value / sum) * 100;
        if(pctAng >= a && pctAng < a + p){ found = it.key; break; }
        a += p;
      }
      if(found){
        if(selectedDonutKey === found){ selectedDonutKey = null; selectDonutAsset(null); }
        else selectDonutAsset(found);
      }
    });
  }

  if(selectedDonutKey && items.some(it => it.key === selectedDonutKey)){
    selectDonutAsset(selectedDonutKey);
  } else {
    selectedDonutKey = null;
    if(centerLbl) centerLbl.textContent = 'جمع کل';
    if(centerVal) centerVal.textContent = fmt(displayTotal);
    if(tip) tip.innerHTML = 'برای دیدن جزئیات، روی هر دارایی بزنید';
  }
}

/* Timeline ثابت و کامل برای همه بازه‌ها — نقطه حذف نمی‌شود */
const JWEEK_FA = ['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه']; // شنبه→جمعه

function startOfPersianWeek(d){
  const x = new Date(d);
  x.setHours(0,0,0,0);
  const day = x.getDay(); // 0=یکشنبه ... 6=شنبه
  const sinceSat = (day + 1) % 7;
  x.setDate(x.getDate() - sinceSat);
  return x;
}

function jalaliMonthEndTs(jy, jm){
  const dim = daysInJalaliMonth(jy, jm);
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, dim);
  return new Date(gy, gm - 1, gd, 23, 59, 59, 999).getTime();
}

function jalaliYearEndTs(jy){
  return jalaliMonthEndTs(jy, 12);
}

/** نقاط ثابت Timeline: {ts, label}[] */
function getTimelineBuckets(rangeKey){
  const now = new Date();
  const buckets = [];

  if(rangeKey === '24h'){
    // ۲۴ نقطه: 00:00 تا 23:00 امروز
    for(let h = 0; h < 24; h++){
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 0, 0, 0);
      const label = (h % 3 === 0) ? String(h).padStart(2,'0') : '';
      buckets.push({ ts: d.getTime(), label, endTs: d.getTime() });
    }
  } else if(rangeKey === 'week'){
    // شنبه تا جمعه هفته جاری
    const sat = startOfPersianWeek(now);
    for(let i = 0; i < 7; i++){
      const d = new Date(sat);
      d.setDate(sat.getDate() + i);
      d.setHours(23, 59, 59, 999);
      buckets.push({ ts: d.getTime(), label: JWEEK_FA[i], endTs: d.getTime() });
    }
  } else if(rangeKey === 'month'){
    // ۱۲ ماه شمسی سال جاری
    const [jy] = gregorianToJalali(now.getFullYear(), now.getMonth()+1, now.getDate());
    for(let jm = 1; jm <= 12; jm++){
      buckets.push({
        ts: jalaliMonthEndTs(jy, jm),
        label: JMONTHS[jm - 1],
        endTs: jalaliMonthEndTs(jy, jm),
      });
    }
  } else if(rangeKey === 'year'){
    // ۴ سال شمسی منتهی به سال جاری
    const [jy] = gregorianToJalali(now.getFullYear(), now.getMonth()+1, now.getDate());
    for(let y = jy - 3; y <= jy; y++){
      buckets.push({
        ts: jalaliYearEndTs(y),
        label: String(y),
        endTs: jalaliYearEndTs(y),
      });
    }
  }
  return buckets;
}

function buildBucketSeries(rangeKey){
  const buckets = getTimelineBuckets(rangeKey);
  const sorted = (netSeries || [])
    .filter(p => p && isFinite(p.ts) && isFinite(p.total))
    .slice()
    .sort((a,b) => a.ts - b.ts);

  const live = safeNum(computeTotal(), 0);
  const earliest = sorted.length ? safeNum(sorted[0].total, live) : live;
  const nowTs = Date.now();

  let j = 0;
  let lastTotal = earliest; // قبل از اولین ثبت هم بهترین مقدار موجود

  const values = buckets.map((b) => {
    const T = Math.min(b.endTs, nowTs); // برای آینده‌های نسبی، تا «الان»
    while(j < sorted.length && sorted[j].ts <= T){
      lastTotal = safeNum(sorted[j].total, lastTotal);
      j++;
    }
    // اگر نقطه مربوط به آیندهٔ دورتر از الان است، مقدار زنده
    if(b.endTs > nowTs) return live;
    return lastTotal;
  });

  // تضمین پیوستگی: هیچ null
  for(let i = 0; i < values.length; i++){
    if(values[i] == null || !isFinite(values[i])) values[i] = i > 0 ? values[i-1] : live;
  }

  return {
    times: buckets.map(b => b.ts),
    labels: buckets.map(b => b.label),
    values,
  };
}

/* --- Dashboard: trend chart --- */
function renderTrendChart(rangeKey){
  const svg = $('trendSvg');
  const badge = $('trendBadge');
  const emptyEl = $('trendEmpty');
  const labelsEl = $('trendLabels');

  const { times, labels, values } = buildBucketSeries(rangeKey);
  const n = times.length;

  if(!n){
    if(svg) svg.innerHTML = '';
    if(labelsEl) labelsEl.innerHTML = '';
    if(emptyEl) emptyEl.style.display = 'block';
    if(badge){ badge.textContent = ''; badge.className = 'trend-badge'; }
    return;
  }

  if(emptyEl) emptyEl.style.display = 'none';

  // زوم عقب‌تر: padding بیشتر تا خط به لبه‌ها نچسبد
  const w = 300, h = 100, padX = 10, padY = 14;
  const xOf = i => n > 1 ? padX + (i / (n - 1)) * (w - padX * 2) : w / 2;

  let minV = Math.min(...values), maxV = Math.max(...values);
  if(minV === maxV){ minV -= 1; maxV += 1; }
  const span = (maxV - minV) || 1;
  // کمی فضای عمودی اضافه (zoom out)
  minV -= span * 0.08;
  maxV += span * 0.08;
  const yOf = v => (h - padY) - ((v - minV) / (maxV - minV)) * (h - padY * 2);

  // خط کامل روی همه نقاط (Timeline همیشه کامل)
  const linePts = values.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
  const firstX = xOf(0), lastX = xOf(n - 1);
  const areaPts = `${firstX.toFixed(1)},${h-padY} ${linePts} ${lastX.toFixed(1)},${h-padY}`;
  const lastY = yOf(values[n - 1]);

  if(svg){
    svg.innerHTML = `
    <defs>
      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--blue-light)" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="var(--blue-light)" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <polygon points="${areaPts}" fill="url(#trendFill)"/>
    <polyline points="${linePts}" fill="none" stroke="var(--blue-light)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3" fill="var(--blue-light)"/>
  `;
  }

  // برچسب‌های محور (LTR = قدیمی‌تر چپ → جدیدتر راست)
  if(labelsEl){
    const dense = rangeKey === '24h' || rangeKey === 'month';
    labelsEl.className = 'trend-labels' + (dense ? ' dense' : '');
    labelsEl.innerHTML = labels.map(lb => `<span>${lb || ''}</span>`).join('');
  }
  const inner = $('trendScrollInner');
  if(inner){
    // برای ۲۴س و ماه اسکرول افقی نرم با عرض بیشتر
    const needWide = rangeKey === '24h' || rangeKey === 'month';
    inner.classList.toggle('wide', needWide);
  }

  const first = safeNum(values[0], 0), last = safeNum(values[n - 1], 0);
  let changePct = 0;
  if(Math.abs(first) > 1e-9){
    changePct = ((last - first) / Math.abs(first)) * 100;
  } else if(last !== 0){
    changePct = last > 0 ? 100 : -100;
  }
  if(!isFinite(changePct)) changePct = 0;

  if(badge){
    const arrow = changePct > 0.05 ? '▲' : (changePct < -0.05 ? '▼' : '—');
    const cls = changePct > 0.05 ? 'up' : (changePct < -0.05 ? 'down' : 'flat');
    badge.className = 'trend-badge ' + cls;
    badge.textContent = `${arrow} ${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%  (${fmt(first)} ← ${fmt(last)} تومان)`;
  }
}

document.querySelectorAll('.trend-tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.trend-tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    currentTrendRange = btn.dataset.range;
    renderTrendChart(currentTrendRange);
  });
});

function fillTransferSelects(){
  const from = $('tfFrom'), to = $('tfTo');
  if(!from || !to) return;
  const opts = ASSET_DEFS.map(d => {
    const bal = safeNum(assets[d.key], 0);
    return `<option value="${d.key}">${d.name} (${fmt(bal)})</option>`;
  }).join('');
  const prevFrom = from.value, prevTo = to.value;
  from.innerHTML = opts;
  to.innerHTML = opts;
  if(ASSET_DEFS.some(d => d.key === prevFrom)) from.value = prevFrom;
  if(ASSET_DEFS.some(d => d.key === prevTo)) to.value = prevTo;
  else if(ASSET_DEFS.length > 1) to.selectedIndex = Math.min(1, ASSET_DEFS.length - 1);
}

/* --- Assets: cards, transfer, CRUD --- */
function renderAssetCards(){
  const el = $('assetCards');
  el.classList.add('rendering');
  // کارت فقط در خانه/نمودار/انتقال — نه در لیست قابل‌ویرایش دارایی‌ها
  const visibleDefs = ASSET_DEFS.filter(d => d.key !== 'card');
  el.innerHTML = visibleDefs.map(d => {
    const accent = d.color || 'var(--blue-light)';
    const val = safeNum(assets[d.key], 0);
    return `
    <div class="asset-card" style="--asset-accent:${accent}">
      <div class="asset-card-head">
        <div>
          <div class="asset-name">${d.name}</div>
          <div class="asset-cat">${d.cat}</div>
        </div>
        <button class="asset-del-btn" data-del-key="${d.key}" title="حذف این دارایی" aria-label="حذف">×</button>
      </div>
      <div class="asset-balance">
        <span class="asset-val" data-val-key="${d.key}">${fmt(val)} <small>تومان</small></span>
      </div>
      <div class="adjust-row">
        <button class="adj-btn plus" data-key="${d.key}" data-dir="1" aria-label="افزایش">+</button>
        <input type="text" inputmode="numeric" placeholder="مبلغ" data-amount="${d.key}" class="money-input">
        <button class="adj-btn minus" data-key="${d.key}" data-dir="-1" aria-label="کاهش">−</button>
      </div>
    </div>`;
  }).join('');

  el.querySelectorAll('.adj-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const key = btn.dataset.key;
      const dir = parseInt(btn.dataset.dir);
      const input = el.querySelector(`input[data-amount="${key}"]`);
      const amount = parseMoney(input.value);
      if(isNaN(amount) || amount<=0){ showToast('یک مبلغ معتبر وارد کنید', true); return; }
      const def = ASSET_DEFS.find(d=>d.key===key);
      const prevVal = assets[key]||0;
      assets[key] = prevVal + dir*amount;
      txs.push({date: todayISO(), key, delta: dir*amount, note: def.name});
      pushSeriesPoint();
      checkMilestones(key, prevVal, assets[key]);
      if(persist()){
        input.value = '';
        showToast(dir>0 ? `${fmt(amount)} به ${def.name} اضافه شد` : `${fmt(amount)} از ${def.name} کم شد`);
        const valEl = el.querySelector(`[data-val-key="${key}"]`);
        if(valEl){
          valEl.innerHTML = fmt(assets[key]) + ' <small>تومان</small>';
          valEl.classList.remove('pulse');
          void valEl.offsetWidth;
          valEl.classList.add('pulse');
        }
        render();
      } else {
        showToast('ذخیره ناموفق — دوباره تلاش کنید', true);
      }
    });
  });

  // دکمه سطل زباله — راه مطمئن و همیشه در دسترس برای حذف
  el.querySelectorAll('.asset-del-btn').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      confirmDeleteAsset(btn.dataset.delKey);
    });
  });

  fillTransferSelects();
  requestAnimationFrame(()=>{ el.classList.remove('rendering'); });
}

function confirmDeleteAsset(key){
  if(FIXED_ASSET_KEYS.includes(key) || key === 'card' || key === 'wallet'){
    showToast('کارت و پول نقد قابل حذف نیستند', true);
    return;
  }
  const def = ASSET_DEFS.find(d=>d.key===key);
  if(!def) return;
  showConfirmModal(
    `دارایی «${def.name}» از فهرست حذف شود؟`,
    `موجودی فعلی: ${fmt(assets[key]||0)} تومان — این کار قابل بازگشت نیست (فقط با فایل پشتیبان قدیمی).`,
    ()=>{
      ASSET_DEFS = ASSET_DEFS.filter(d=>d.key!==key);
      delete assets[key];
      pushSeriesPoint();
      if(persist()){
        showToast(`دارایی «${def.name}» حذف شد`);
        render();
      } else {
        showToast('حذف ناموفق — ذخیره انجام نشد', true);
      }
    }
  );
}

/* --- Snapp daily profit list + projections --- */
function renderLogs(){
  const el = $('logList');
  if(logs.length === 0){ el.innerHTML = '<div class="empty">هنوز سودی ثبت نشده است</div>'; $('projCard').style.display = 'none'; return; }
  const sorted = [...logs].sort((a,b)=> a.date < b.date ? 1 : -1);
  el.classList.toggle('scrollable', sorted.length > 7);
  el.innerHTML = sorted.map(l => {
    const realIdx = logs.indexOf(l);
    return `<div class="log-item"><span class="d">${toJalaliStr(l.date)||'—'}</span><span class="n">سود روزانه</span><span class="p">+${fmt(safeNum(l.profit))} ت</span><button type="button" class="del" data-idx="${realIdx}" aria-label="حذف">×</button></div>`;
  }).join('');
  el.querySelectorAll('.del').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = parseInt(btn.dataset.idx, 10);
      const row = logs[idx];
      showConfirmModal(
        'حذف این ثبت سود؟',
        row ? (toJalaliStr(row.date) || '') + ' — +' + fmt(safeNum(row.profit)) + ' تومان' : '',
        ()=>{
          if(row){
            const p = safeNum(row.profit, 0);
            assets.snapp = Math.max(0, safeNum(assets.snapp, 0) - p);
            if(Array.isArray(txs)){
              // حذف اولین تراکنش متناظر سود اسنپ با همان تاریخ و مبلغ (در صورت وجود)
              const ti = txs.findIndex(t => t && t.key === 'snapp' && t.date === row.date && safeNum(t.delta) === p);
              if(ti >= 0) txs.splice(ti, 1);
            }
            if(typeof pushSeriesPoint === 'function') pushSeriesPoint();
          }
          logs.splice(idx, 1);
          let ok = false;
          try{ ok = !!persist(); }catch(e){ console.error(e); }
          try{ if(typeof render === 'function') render(); }catch(e){ console.error(e); }
          showToast(ok ? 'حذف شد' : 'حذف اعمال شد', !ok);
        }
      );
    });
  });

  // نرخ روزانه مؤثر: میانگین وزنی نرخ‌های ثبت‌شده (ثبت جدیدتر وزن بیشتر)
  // نرخ هر روز = سود همان روز ÷ موجودی قبل از واریز سود
  const recent = sorted.slice(0, 14); // تا ۱۴ ثبت اخیر
  const rateSamples = [];
  recent.forEach((l, idxFromNewest)=>{
    // sorted newest-first؛ وزن: جدیدتر = بزرگ‌تر
    const weight = recent.length - idxFromNewest; // n, n-1, ..., 1
    let base = (l.balanceBefore && l.balanceBefore > 0) ? l.balanceBefore : null;
    // اگر balanceBefore نبود، از موجودی فعلی منهای سودهای بعد از آن روز تخمین نزن — نادیده بگیر
    if(base == null || base <= 0) return;
    const r = safeNum(l.profit, 0) / base;
    if(isFinite(r) && r > 0 && r < 0.2){ // سقف ۲۰٪ روزانه برای حذف داده پرت
      rateSamples.push({r, weight});
    }
  });
  let rate = 0;
  if(rateSamples.length){
    const wSum = rateSamples.reduce((s,x)=>s+x.weight, 0);
    rate = rateSamples.reduce((s,x)=>s + x.r*x.weight, 0) / wSum;
  }
  rate = safeNum(rate, 0);

  const bal0 = safeNum(assets.snapp, 0);
  // سود مرکب روزانه: سود n روز = B * ((1+r)^n - 1)
  const profit1 = bal0 * rate;
  const profit30 = bal0 * (Math.pow(1 + rate, 30) - 1);
  const bal30 = bal0 + profit30;
  // نرخ مؤثر سالانه مرکب (EAR): (1+r)^365 - 1
  const annualEff = Math.pow(1 + rate, 365) - 1;
  // نرخ اسمی سالانه: r * 365
  const annualNom = rate * 365;
  // سود کل ثبت‌شده تا الان
  const totalProfit = (logs || []).reduce((s, l) => s + safeNum(l && l.profit, 0), 0);

  $('projCard').style.display = 'block';
  $('rateLabel').textContent = rateSamples.length
    ? `نرخ مؤثر روزانه (میانگین وزنی ${rateSamples.length} ثبت — سود مرکب)`
    : 'نرخ مؤثر روزانه';
  $('rateVal').textContent = (rate * 100).toFixed(4) + '%';
  if($('annualEffVal')) $('annualEffVal').textContent = (annualEff * 100).toFixed(2) + '%';
  if($('annualNomVal')) $('annualNomVal').textContent = (annualNom * 100).toFixed(2) + '%';
  if($('totalProfitVal')) $('totalProfitVal').textContent = '+' + fmt(totalProfit) + ' ت';
  if($('snappBalVal')) $('snappBalVal').textContent = fmt(bal0) + ' ت';
  $('tomorrowVal').textContent = '+' + fmt(profit1) + ' ت';
  $('monthVal').textContent = '+' + fmt(profit30) + ' ت';
  if($('bal30Val')) $('bal30Val').textContent = fmt(bal30) + ' ت';
}

let currentTxFilter = 'newest';

function getFilteredTxs(){
  let list = Array.isArray(txs) ? [...txs] : [];
  // نرمال‌سازی delta
  list = list.filter(t => t && t.date != null);
  if(currentTxFilter === 'deficit'){
    list = list.filter(t => safeNum(t.delta) < 0);
  } else if(currentTxFilter === 'receipt'){
    list = list.filter(t => safeNum(t.delta) > 0);
  }
  list.sort((a,b)=>{
    const ka = String(a.date) + String(a.note||'');
    const kb = String(b.date) + String(b.note||'');
    if(currentTxFilter === 'oldest') return ka < kb ? -1 : (ka > kb ? 1 : 0);
    return ka < kb ? 1 : (ka > kb ? -1 : 0); // newest default
  });
  return list;
}

/* --- History page: transaction filters/list --- */
function renderTxs(){
  updateTxFilterCounts();
  const el = $('txList');
  if(!el) return;
  const list = getFilteredTxs();
  el.classList.toggle('scrollable', list.length > 15);
  if(list.length === 0){
    const msg = (txs||[]).length === 0
      ? 'هنوز تغییری ثبت نشده است'
      : 'موردی با این فیلتر پیدا نشد';
    el.innerHTML = `<div class="empty">${msg}</div>`;
    return;
  }
  el.innerHTML = list.map(t => {
    const d = safeNum(t.delta);
    const pos = d >= 0;
    const note = t.note || '—';
    return `<div class="log-item"><span class="d">${toJalaliStr(t.date)||'—'}</span><span class="n">${note}</span><span class="p ${pos?'':'neg'}">${pos?'+':''}${fmt(d)} ت</span></div>`;
  }).join('');
}

function updateTxFilterCounts(){
  const all=(txs||[]).filter(t=>t&&t.date!=null);
  const counts={newest:all.length,oldest:all.length,deficit:all.filter(t=>safeNum(t.delta)<0).length,receipt:all.filter(t=>safeNum(t.delta)>0).length};
  Object.keys(counts).forEach(k=>{const el=document.querySelector(`[data-count-for="${k}"]`);if(el)el.textContent=counts[k];});
}
document.querySelectorAll('#txFilters .hist-filter').forEach(btn=>{
  btn.addEventListener('click',(e)=>{
    if(e){ e.preventDefault(); e.stopPropagation(); }
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    document.querySelectorAll('#txFilters .hist-filter').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-selected','false');});
    btn.classList.add('active');btn.setAttribute('aria-selected','true');
    currentTxFilter=btn.dataset.filter||'newest';
    renderTxs();
    try{ window.scrollTo(0, y); }catch(_e){}
    requestAnimationFrame(()=>{ try{ window.scrollTo(0, y); }catch(_e){} });
  });
});


/* --- Net-worth history snapshots --- */
function renderHistory(){
  const el = $('historyList');
  if(history.length === 0){ el.innerHTML = '<div class="empty">هنوز نقطه‌ای ثبت نشده است</div>'; return; }
  const sorted = [...history].sort((a,b)=> a.date < b.date ? 1 : -1);
  el.innerHTML = sorted.slice(0,10).map(h=>{
    return `<div class="log-item"><span class="d">${toJalaliStr(h.date)}</span><span class="n"></span><span class="p" style="color:var(--blue-light)">${fmt(h.total)} ت</span></div>`;
  }).join('');
}

/* --- Non-cash assets --- */
function renderNonCash(){
  const el = $('ncList');
  const totalEl = $('ncTotal');
  const chip = $('ncCountChip');
  const list = Array.isArray(noncash) ? noncash : [];
  // جمع ارزش فعلی: قیمت API × مقدار واحد (در صورت وجود)، وگرنه ارزش دفتری
  const total = typeof sumNoncashCurrentValues === 'function'
    ? sumNoncashCurrentValues()
    : list.reduce((s, item) => s + safeNum(item.manualValue, 0), 0);

  if(totalEl) totalEl.innerHTML = fmt(Math.round(total)) + ' <small>تومان</small>';
  if(chip) chip.textContent = list.length + ' مورد';
  if(!el) return;

  if(list.length === 0){
    el.innerHTML = '<div class="empty">هنوز دارایی غیرنقدی ثبت نشده است</div>';
    return;
  }

  el.innerHTML = list.map(item => {
    const cat = NC_CATS[item.category] || 'سایر';
    const name = (item.label && String(item.label).trim()) ? item.label : '';
    const bookVal = safeNum(item.manualValue, 0);
    const curVal = currentValueForNoncash(item);
    let live = null;
    try{ live = liveValueForNoncash(item); }catch(e){}
    const hasLive = live != null && isFinite(live);
    const qInfo = noncashQuantityInfo(item);
    const goldW = formatGoldWeight(item);
    const qtyLine = goldW || (qInfo ? qInfo.label : '');
    const upd = item.updatedAt
      ? `<div class="nc-updated">آخرین به‌روزرسانی: ${toJalaliStr(item.updatedAt) || item.updatedAt}</div>`
      : '';
    const isGold = item.category === 'gold';
    const isSilver = item.category === 'silver';
    const isUsd = item.category === 'usd';
    const absVar = (Math.abs(Number(item.id) || 0) % 5);
    const subVal = hasLive
      ? (bookVal > 0 && Math.round(bookVal) !== Math.round(live)
          ? `<div class="nc-live-val">دفتری: ${fmt(Math.round(bookVal))} ت</div>`
          : `<div class="nc-live-val">بر اساس قیمت بازار</div>`)
      : '';
    return `<div class="nc-item" data-id="${item.id}" data-abs="${absVar}">
      <div class="nc-abstract" aria-hidden="true"></div>
      <div class="nc-meta">
        <span class="nc-cat">${cat}</span>
        ${name ? `<div class="nc-name">${name}</div>` : ''}
        ${qtyLine ? `<div class="nc-updated">${qtyLine}</div>` : ''}
        ${upd}
      </div>
      <span class="nc-val">${fmt(Math.round(curVal))} ت${subVal}</span>
      <div class="nc-actions">
        <button type="button" class="nc-edit-btn" data-edit-id="${item.id}" title="ویرایش" aria-label="ویرایش">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
        </button>
        <button type="button" class="del" data-id="${item.id}" title="حذف" aria-label="حذف">×</button>
      </div>
      <div class="nc-edit-panel" id="ncEdit-${item.id}">
        ${isGold ? `<div class="grid2">
          <div><label class="field">گرم</label><input type="text" inputmode="decimal" data-eg="${item.id}" value="${safeNum(item.grams,0)}"></div>
          <div><label class="field">سوت</label><input type="text" inputmode="decimal" data-es="${item.id}" value="${safeNum(item.soot,0)}"></div>
        </div>` : ''}
        ${isSilver ? `<div><label class="field">گرم نقره</label><input type="text" inputmode="decimal" data-esg="${item.id}" value="${safeNum(item.grams,0) || safeNum(item.totalGrams,0)}"></div>` : ''}
        ${isUsd ? `<div><label class="field">مقدار دلار</label><input type="text" inputmode="decimal" data-eua="${item.id}" value="${safeNum(item.usdAmount,0)}"></div>` : ''}
        <label class="field">ارزش دفتری (تومان)</label>
        <input type="text" inputmode="numeric" data-ev="${item.id}" class="money-input" value="${fmt(bookVal).replace(/,/g,'')}">
        <label class="field" style="margin-top:6px;">توضیح</label>
        <input type="text" data-el="${item.id}" value="${(name||'').replace(/"/g,'&quot;')}">
        <button type="button" class="btn" data-save-nc="${item.id}" style="margin-top:8px;">ذخیره تغییرات</button>
      </div>
    </div>`;
  }).join('');

  el.querySelectorAll('.del').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const item = noncash.find(x => String(x.id) === String(id));
      const cat = item ? (NC_CATS[item.category] || item.category) : '';
      const val = item ? currentValueForNoncash(item) : 0;
      showConfirmModal(
        'حذف این دارایی غیرنقد؟',
        (cat ? cat + ' — ' : '') + fmt(Math.round(val)) + ' تومان',
        () => {
          noncash = noncash.filter(x => String(x.id) !== String(id));
          if(persist()){ showToast('دارایی غیرنقد حذف شد'); renderNonCash(); }
          else showToast('حذف ناموفق — ذخیره انجام نشد', true);
        }
      );
    });
  });

  el.querySelectorAll('.nc-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.editId;
      const panel = $('ncEdit-' + id);
      if(!panel) return;
      document.querySelectorAll('.nc-edit-panel.open').forEach(p => {
        if(p !== panel) p.classList.remove('open');
      });
      panel.classList.toggle('open');
    });
  });

  el.querySelectorAll('[data-save-nc]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = String(btn.dataset.saveNc);
      const idx = noncash.findIndex(x => x && String(x.id) === id);
      if(idx < 0){ showToast('مورد پیدا نشد', true); return; }
      const item = noncash[idx];
      const valInp = el.querySelector('input[data-ev="'+id+'"]');
      const labInp = el.querySelector('input[data-el="'+id+'"]');
      const newVal = parseMoney(valInp ? valInp.value : '');
      if(isNaN(newVal) || newVal < 0){ showToast('قیمت معتبر نیست', true); return; }
      // فقط همان رکورد — موجودی واحد جدا ذخیره می‌شود؛ ارزش فعلی از API
      item.manualValue = newVal;
      if(labInp) item.label = labInp.value.trim();
      if(item.category === 'gold'){
        const gInp = el.querySelector('input[data-eg="'+id+'"]');
        const sInp = el.querySelector('input[data-es="'+id+'"]');
        item.grams = parseDec(gInp && gInp.value);
        item.soot = parseDec(sInp && sInp.value);
        item.totalGrams = goldTotalGrams(item.grams, item.soot);
      } else if(item.category === 'silver'){
        const gInp = el.querySelector('input[data-esg="'+id+'"]');
        item.grams = parseDec(gInp && gInp.value);
        item.totalGrams = item.grams;
      } else if(item.category === 'usd'){
        const uInp = el.querySelector('input[data-eua="'+id+'"]');
        item.usdAmount = parseDec(uInp && uInp.value);
      }
      item.updatedAt = todayISO();
      noncash[idx] = item;
      if(persist()){
        showToast('همان مورد به‌روز شد');
        renderNonCash();
      } else {
        showToast('ذخیره تغییرات ناموفق بود', true);
      }
    });
  });
}


/* ================= تراکنش‌ها ================= */
const NB_TYPES = {
  deposit:  {label:'دریافتی',      sign: 1, color:'var(--green)'},
  payment:  {label:'پرداخت',       sign:-1, color:'var(--red)'},
  lent:     {label:'قرض داده',      sign:-1, color:'var(--red)'},
  borrowed: {label:'قرض گرفته',     sign: 1, color:'var(--green)'},
  transfer: {label:'انتقال',        sign: 0, color:'var(--blue-light)'},
};
// آیکون‌های SVG کارت‌های فید تراکنش (فقط بصری — بدون اثر روی منطق/داده)
const NB_ICONS = {
  deposit:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M7 10l5-5 5 5"/></svg>',
  payment:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M7 14l5 5 5-5"/></svg>',
  transfer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h11M14 3l4 4-4 4"/><path d="M17 17H6M10 21l-4-4 4-4"/></svg>',
  lent:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M17 7H9M17 7v8"/></svg>',
  borrowed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 7L7 17M7 17h8M7 17V9"/></svg>',
};
// نگاشت فیلترهای نوع تراکنش (فقط نمایشی — روی nbDelta/محاسبات کارت اثر ندارد)
let currentNbFilter = 'all';
let nbDayExpanded = (function(){try{const r=JSON.parse(localStorage.getItem("nb-day-expanded")||"[]");return new Set(Array.isArray(r)?r:[]);}catch(e){return new Set();}})();
function nbFilterMatch(type, filter){
  if(!filter || filter === 'all') return true;
  if(filter === 'income') return type === 'deposit';
  if(filter === 'expense') return type === 'payment';
  if(filter === 'transfer') return type === 'transfer';
  if(filter === 'debt') return type === 'lent' || type === 'borrowed';
  return true;
}
function nbEntryInCurrentMonth(e){
  if(!e) return false;
  // بدون تاریخ → ماه جاری (نمایش و دلتا)
  if(!e.date) return true;
  const key = isoToJalaliMonthKey(e.date);
  if(!key) return true; // تاریخ نامعتبر را حذف نکن
  return key === currentNbMonthKey();
}

function loanRemaining(e){
  if(!e) return 0;
  const total = safeNum(e.amount, 0);
  const paid = Math.min(total, Math.max(0, safeNum(e.paidAmount, 0)));
  if(e.settled) return 0;
  return Math.max(0, total - paid);
}

/* --- Notebook math helpers --- */
function nbDelta(){
  // هر مبلغ فقط یک‌بار: applied → دیگر در دلتا نیست
  // قرض باز (تسویه‌نشده و applied نشده) با باقی‌مانده در دلتا می‌آید
  // پس از «ثبت موجودی کارت» قرض‌ها هم applied می‌شوند تا تکرار نشود؛ وضعیت تسویه جدا می‌ماند
  return (notebook || []).reduce((s, e) => {
    if(!e) return s;
    if(e.applied) return s;
    if(e.type === 'lent' || e.type === 'borrowed'){
      if(e.settled) return s;
      const sign = (NB_TYPES[e.type] && NB_TYPES[e.type].sign) || 0;
      return s + sign * loanRemaining(e);
    }
    const sign = (NB_TYPES[e.type] && NB_TYPES[e.type].sign) || 0;
    return s + sign * safeNum(e.amount, 0);
  }, 0);
}

function progressColor(pct){
  if(pct > 100) return '#B91C1C';
  const stops = [
    {p:0, c:[34,197,94]},
    {p:20, c:[132,204,22]},
    {p:40, c:[234,179,8]},
    {p:60, c:[249,115,22]},
    {p:75, c:[234,88,12]},
    {p:90, c:[239,68,68]},
    {p:100, c:[239,68,68]},
  ];
  const clamped = Math.max(0, Math.min(100, pct));
  let i = 0;
  while(i < stops.length-1 && clamped > stops[i+1].p) i++;
  const a = stops[i], b = stops[Math.min(i+1, stops.length-1)];
  const t = (b.p === a.p) ? 0 : (clamped - a.p) / (b.p - a.p);
  const rgb = a.c.map((v,idx)=> Math.round(v + (b.c[idx]-v)*t));
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}

function safeNum(n, fallback){
  const v = Number(n);
  return (isFinite(v) && !isNaN(v)) ? v : (fallback||0);
}

function currentJalaliParts(){
  return gregorianToJalali(...todayISO().split('-').map(Number));
}
const NB_MONTH_KEY = 'daftar-nb-month';

function currentNbMonthKey(){
  const [jy, jm] = currentJalaliParts();
  return jy + '-' + String(jm).padStart(2, '0');
}

function clearNotebookForNewMonth(){
  // لیست ماه قبل پاک می‌شود؛ فقط قرض تسویه‌نشده می‌ماند
  const before = notebook.length;
  notebook = (notebook || []).filter(e => e && (e.type === 'lent' || e.type === 'borrowed') && !e.settled);
  return before !== notebook.length;
}

/**
 * موتور پیش‌بینی/تحلیل هزینه ماهانه
 * — روزهای بدون پرداخت در بازهٔ سپری‌شده = صفر واقعی (نه «دادهٔ مفقود»)
 * — «روز بدون ثبت» فقط برای روزهای آیندهٔ ماه جاری معنا دارد
 * — ماه ناقص: فقط تا امروز میانگین گرفته می‌شود و به باقی‌مانده تعمیم داده می‌شود
 */
function jalaliDayOfMonthFromISO(iso){
  if(!iso) return 0;
  const parts = String(iso).slice(0,10).split('-').map(Number);
  if(parts.length < 3 || parts.some(x => isNaN(x))) return 0;
  try{
    const [, , jd] = gregorianToJalali(parts[0], parts[1], parts[2]);
    return safeNum(jd, 0);
  }catch(e){ return 0; }
}

function buildDailySpendSeries(payments, elapsedDays){
  // آرایهٔ ۱..elapsedDays با مجموع پرداخت هر روز شمسی
  const byDay = {};
  (payments || []).forEach(e => {
    if(!e || !e.date) return;
    const d = jalaliDayOfMonthFromISO(e.date);
    if(d < 1 || d > elapsedDays) return;
    const key = String(d);
    byDay[key] = (byDay[key] || 0) + safeNum(e.amount, 0);
  });
  const series = [];
  for(let d = 1; d <= elapsedDays; d++){
    series.push(safeNum(byDay[String(d)], 0));
  }
  return series;
}

function linearTrendSlope(series){
  // شیب رگرسیون خطی ساده (روز → مبلغ). واحد: تومان بر روز
  const n = series.length;
  if(n < 2) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for(let i = 0; i < n; i++){
    const x = i + 1;
    const y = series[i];
    sumX += x; sumY += y; sumXY += x * y; sumXX += x * x;
  }
  const den = n * sumXX - sumX * sumX;
  if(Math.abs(den) < 1e-12) return 0;
  return (n * sumXY - sumX * sumY) / den;
}

function sampleStdev(series){
  const n = series.length;
  if(n < 2) return 0;
  const mean = series.reduce((a,b)=>a+b, 0) / n;
  let ss = 0;
  for(let i = 0; i < n; i++){
    const d = series[i] - mean;
    ss += d * d;
  }
  return Math.sqrt(ss / (n - 1));
}

/**
 * @param {string} monthKey  مثلاً 1405-06
 * @param {object} opts
 *   closedMonth: ماه بسته‌شده (بدون تعمیم آینده)
 *   asOfDay: روز شمسی مبنا (پیش‌فرض: امروز اگر ماه جاری، وگرنه آخرین روز ماه)
 *   balanceForResources: موجودی برای توان مالی
 */
function computeMonthSpendStats(monthKey, opts){
  opts = opts || {};
  const parts = String(monthKey || '').split('-');
  const mJy = parseInt(parts[0], 10);
  const mJm = parseInt(parts[1], 10);
  const totalDays = (isFinite(mJy) && isFinite(mJm)) ? daysInJalaliMonth(mJy, mJm) : 30;

  const [cjy, cjm, cjd] = currentJalaliParts();
  const currentKey = cjy + '-' + String(cjm).padStart(2, '0');
  const isCurrentMonth = monthKey === currentKey;
  const closed = !!opts.closedMonth || !isCurrentMonth;

  let asOfDay = safeNum(opts.asOfDay, 0);
  if(!(asOfDay >= 1)){
    asOfDay = closed ? totalDays : Math.min(Math.max(1, cjd), totalDays);
  } else {
    asOfDay = Math.min(Math.max(1, asOfDay), totalDays);
  }

  // بازهٔ سپری‌شده: روزهای ۱..asOfDay — روز بدون پرداخت = صفر واقعی
  const elapsedDays = asOfDay;
  const remainingDays = closed ? 0 : Math.max(0, totalDays - asOfDay);

  // —— هزینهٔ ماه: فقط type===payment و مبلغ>0 ——
  // درآمد (deposit)، انتقال (transfer)، قرض و سایر انواع وارد نمی‌شوند
  const monthEvents = (Array.isArray(fcEvents) ? fcEvents : []).filter(e =>
    e && e.date && isoToJalaliMonthKey(String(e.date).slice(0, 10)) === monthKey
  );

  const seenPay = new Set();
  const paymentsAll = [];
  monthEvents.forEach(e => {
    if(String(e.type) !== 'payment') return;
    const amt = safeNum(e.amount, 0);
    if(!(amt > 0) || !isFinite(amt)) return;
    const id = e.id != null ? String(e.id) : '';
    if(id){
      if(seenPay.has(id)) return;
      seenPay.add(id);
    }
    paymentsAll.push({ date: String(e.date).slice(0, 10), amount: amt, id: e.id });
  });

  // فقط پرداخت‌های داخل بازهٔ ۱..asOfDay (تا امروز / تا آخر ماه بسته‌شده)
  const payments = paymentsAll.filter(e => {
    const d = jalaliDayOfMonthFromISO(e.date);
    return d >= 1 && d <= elapsedDays;
  });

  const seenRec = new Set();
  const receipts = [];
  monthEvents.forEach(e => {
    if(String(e.type) !== 'deposit') return;
    const amt = safeNum(e.amount, 0);
    if(!(amt > 0)) return;
    const id = e.id != null ? String(e.id) : '';
    if(id){
      if(seenRec.has(id)) return;
      seenRec.add(id);
    }
    const d = jalaliDayOfMonthFromISO(e.date);
    if(d < 1 || d > elapsedDays) return;
    receipts.push({ date: String(e.date).slice(0, 10), amount: amt });
  });

  // سری روزانهٔ هزینه در بازهٔ سپری‌شده (روز بدون پرداخت = ۰)
  const series = buildDailySpendSeries(payments, elapsedDays);
  // مجموع از روی سری — یک منبع حقیقت، بدون دوباره‌شماری
  const sumPay = series.reduce((a, b) => a + b, 0);
  const daysWithSpend = series.filter(v => v > 0).length;
  const daysZero = Math.max(0, elapsedDays - daysWithSpend);
  const paymentCount = payments.length;

  // میانگین خرج روزانه = مجموع تا امروز ÷ تعداد روزهای سپری‌شده
  // (روز بدون خرج در میانگین به‌عنوان صفر لحاظ می‌شود تا نرخ مصنوعی بالا نرود)
  const avgDaily = elapsedDays > 0 ? (sumPay / elapsedDays) : 0;
  // شدت در روزهای دارای خرج — فقط شاخص فرعی، برای پیش‌بینی کل ماه استفاده نمی‌شود
  const avgOnSpendDays = daysWithSpend > 0 ? (sumPay / daysWithSpend) : 0;

  const stdev = sampleStdev(series);
  const cv = avgDaily > 1e-9 ? (stdev / avgDaily) : 0;
  const slope = linearTrendSlope(series);

  // پیش‌بینی کل ماه:
  // بسته: واقعیت = sumPay
  // جاری: اگر حداقل یک روز سپری شده: avgDaily × totalDays
  //        ≡ sumPay + avgDaily × remainingDays
  // بدون روز سپری‌شده یا بدون دادهٔ معتبر: ۰
  let projectedMonth = 0;
  let extrapolate = false;
  if(closed){
    projectedMonth = sumPay;
    extrapolate = false;
  } else if(elapsedDays >= 1){
    projectedMonth = avgDaily * totalDays;
    extrapolate = (remainingDays > 0 && sumPay >= 0);
  } else {
    projectedMonth = 0;
  }
  if(!isFinite(projectedMonth) || projectedMonth < 0) projectedMonth = 0;
  projectedMonth = Math.round(projectedMonth);

  // دریافتی‌ها — فقط برای نسبت/منابع؛ وارد پیش‌بینی «هزینه» نمی‌شوند
  const receiptSeries = buildDailySpendSeries(receipts, elapsedDays);
  const sumReceipt = receiptSeries.reduce((a,b)=>a+b, 0);
  const avgDailyReceipt = elapsedDays > 0 ? (sumReceipt / elapsedDays) : 0;
  let projectedReceipt = sumReceipt;
  if(!closed && elapsedDays >= 1 && remainingDays > 0){
    projectedReceipt = Math.round(avgDailyReceipt * totalDays);
  }

  // اطمینان نسبی: نسبت روزهای سپری‌شده و وجود حداقل ۲ روز
  // عدد بین ۰ و ۱ — بدون ضریب دلخواه؛ فقط elapsed/total
  const coverage = totalDays > 0 ? (elapsedDays / totalDays) : 0;
  const confidence = (elapsedDays < 2) ? 0 : Math.min(1, coverage);

  // روند: شیب نسبت به میانگین (اگر میانگین نزدیک صفر باشد، فقط علامت شیب)
  let trend = 'flat';
  if(elapsedDays >= 3 && avgDaily > 1e-9){
    // شیب معنی‌دار اگر |slope| > 5٪ میانگین روزانه
    const thr = avgDaily * 0.05;
    if(slope > thr) trend = 'up';
    else if(slope < -thr) trend = 'down';
  } else if(elapsedDays >= 3 && avgDaily <= 1e-9 && slope > 0){
    trend = 'up';
  }

  const bal = safeNum(opts.balanceForResources, 0);
  const resources = bal;
  const capacity = resources * 0.8; // توان مالی تعریف‌شده محصول (۸۰٪ منابع)
  let pressure = 0;
  if(capacity > 1e-9) pressure = (projectedMonth / capacity) * 100;
  else if(projectedMonth > 0) pressure = 100; // بدون توان مالی ولی با هزینه → فشار حداکثر نمایشی
  pressure = safeNum(pressure, 0);
  if(pressure < 0) pressure = 0;
  // برای Progress همیشه ۰–۱۰۰؛ مقدار خام بالاتر فقط در note قابل ذکر است
  if(pressure > 100) pressure = 100;

  const incomeRatio = sumReceipt > 1e-9 ? (sumPay / sumReceipt) : (sumPay > 0 ? Infinity : 0);

  return {
    monthKey,
    totalDays,
    elapsedDays,
    remainingDays,
    closed,
    extrapolate,
    sumPay: Math.round(sumPay),
    sumReceipt: Math.round(sumReceipt),
    paymentCount,
    daysWithSpend,
    daysZero,
    avgDaily,
    avgOnSpendDays,
    stdev,
    cv,
    slope,
    trend,
    projectedMonth: Math.round(projectedMonth),
    projectedReceipt: Math.round(projectedReceipt),
    coverage,
    confidence,
    resources,
    capacity: Math.round(capacity),
    pressure: Math.round(pressure * 100) / 100,
    incomeRatio,
    series
  };
}

function computeForecastForMonthKey(monthKey, balanceForResources){
  const st = computeMonthSpendStats(monthKey, {
    closedMonth: true,
    balanceForResources: balanceForResources
  });
  return {
    monthKey,
    pressure: st.pressure,
    expense: st.projectedMonth,
    capacity: st.capacity,
    payments: st.paymentCount,
    daysWithData: st.elapsedDays,
    daysWithSpend: st.daysWithSpend,
    daysZero: st.daysZero,
    avgDaily: st.avgDaily
  };
}

function archiveMonthEndForecast(monthKey, cardBalance){
  if(!monthKey) return;
  if((fcSnapshots || []).some(s => s && s.kind === 'month-end' && s.monthKey === monthKey)) return;
  const stats = computeForecastForMonthKey(monthKey, cardBalance);
  const parts = String(monthKey).split('-');
  const jy = parseInt(parts[0],10), jm = parseInt(parts[1],10);
  const label = (JMONTHS[jm-1] || monthKey) + (jy ? ' ' + jy : '');
  fcSnapshots.push({
    id: Date.now(),
    kind: 'month-end',
    date: todayISO(),
    monthKey,
    monthLabel: label,
    pressure: stats.pressure,
    expense: stats.expense,
    capacity: stats.capacity,
    payments: stats.payments,
    daysWithData: stats.daysWithData
  });
}

function ensureNotebookMonth(){
  try{
    if(window._pendingEncStore && !sessionCryptoKey) return false;
    const cur = currentNbMonthKey();
    let saved = null;
    try{ saved = localStorage.getItem(NB_MONTH_KEY); }catch(e){}
    if(saved){
      const m = String(saved).match(/^(\d{4})-(\d{1,2})$/);
      if(m) saved = m[1] + '-' + String(parseInt(m[2],10)).padStart(2,'0');
    }
    if(saved == null){
      try{ localStorage.setItem(NB_MONTH_KEY, cur); }catch(e){}
      return false;
    }
    if(saved !== cur){
      // ۱) ثبت پایدار موجودی کارت از دلتای ماه قبل (جلوگیری از محاسبه تکراری بعد از Refresh)
      const pending = nbDelta();
      if(pending){
        assets.card = safeNum(assets.card, 0) + pending;
        txs.push({date: todayISO(), key:'card', delta: pending, note:'بستن ماه — ثبت خودکار موجودی کارت'});
        pushSeriesPoint();
      }
      // اقلام مشارکت‌کننده در دلتا applied می‌شوند تا قرض باز در ماه بعد دوباره وارد nbDelta نشود
      // (clearNotebook قرض‌های تسویه‌نشده را نگه می‌دارد؛ بدون این پرچم double-count رخ می‌دهد)
      (notebook || []).forEach(e => {
        if(!e || e.applied) return;
        e.applied = true;
      });
      // ۲) بایگانی نتیجهٔ نهایی پیش‌بینی ماه قبل (تغییرناپذیر)
      archiveMonthEndForecast(saved, assets.card);
      // ۳) پاک کردن لیست تراکنش‌های ماه قبل از UI
      clearNotebookForNewMonth();
      try{ localStorage.setItem(NB_MONTH_KEY, cur); }catch(e){}
      persist();
      if(typeof renderNotebook === 'function') renderNotebook();
      if(typeof renderForecast === 'function') renderForecast();
      return true;
    }
  }catch(e){ console.error(e); }
  return false;
}



function isoToJalaliMonthKey(iso){
  if(!iso) return '';
  const parts = String(iso).split('-').map(Number);
  if(parts.length < 3 || parts.some(x=>isNaN(x))) return '';
  const [jy,jm] = gregorianToJalali(parts[0], parts[1], parts[2]);
  return jy + '-' + String(jm).padStart(2,'0');
}

function eventInCurrentMonth(e){
  const [jy,jm] = currentJalaliParts();
  const key = jy + '-' + String(jm).padStart(2,'0');
  return isoToJalaliMonthKey(e.date) === key;
}

function remainingDaysInJalaliMonth(){
  const [jy, jm, jd] = currentJalaliParts();
  const total = daysInJalaliMonth(jy, jm);
  return Math.max(0, total - jd); // روزهای بعد از امروز
}

function makeSetKey(ids){
  return [...ids].map(String).sort().join('|');
}

function maybeCreateSnapshot(paymentSet, pressure){
  if(!paymentSet || paymentSet.length < 15) return;
  const setKey = makeSetKey(paymentSet.map(e=>e.id));
  if(fcSnapshots.some(s => s.setKey === setKey)) return; // تکراری نساز
  const [jy, jm] = currentJalaliParts();
  const monthKey = jy + '-' + String(jm).padStart(2,'0');
  const pRounded = Math.round(safeNum(pressure, 0) * 100) / 100;
  fcSnapshots.push({
    id: Date.now(),
    date: todayISO(),
    pressure: pRounded,
    setKey,
    monthKey,
  });
  // هرگز حذف یا بازنویسی سوابق قبلی
  persist();
}


/* ================= اهداف مالی (Financial Goals) ================= */
function daysPerMonthFromStats(st){
  const d = st && st.totalDays ? st.totalDays : 30;
  return Math.max(28, Math.min(31, d));
}

/** جریان خالص روزانه از fcEvents ماه جاری — روز بدون تراکنش = صفر */
function buildDailyNetSeriesForGoals(st){
  const elapsed = st && st.elapsedDays ? st.elapsedDays : 0;
  if(elapsed < 1) return [];
  const [jy, jm] = currentJalaliParts();
  const monthKey = jy + '-' + String(jm).padStart(2, '0');
  const events = (Array.isArray(fcEvents) ? fcEvents : []).filter(e =>
    e && e.date && isoToJalaliMonthKey(String(e.date).slice(0,10)) === monthKey
  );
  const payBy = {}, recBy = {};
  events.forEach(e => {
    const d = jalaliDayOfMonthFromISO(e.date);
    if(d < 1 || d > elapsed) return;
    const amt = safeNum(e.amount, 0);
    if(e.type === 'payment' && amt > 0) payBy[d] = (payBy[d] || 0) + amt;
    if(e.type === 'deposit' && amt > 0) recBy[d] = (recBy[d] || 0) + amt;
  });
  const series = [];
  for(let d = 1; d <= elapsed; d++){
    series.push(safeNum(recBy[d], 0) - safeNum(payBy[d], 0));
  }
  return series;
}

/** رشد مشاهده‌شده جمع دارایی از netSeries (تومان/روز) */
function observedCapitalGrowthPerDay(){
  const series = (Array.isArray(netSeries) ? netSeries : [])
    .filter(p => p && isFinite(p.ts) && isFinite(p.total))
    .slice()
    .sort((a,b)=> a.ts - b.ts);
  if(series.length < 2) return { perDay: null, spanDays: 0, points: series.length };
  const first = series[0], last = series[series.length - 1];
  const spanMs = last.ts - first.ts;
  const spanDays = spanMs / (24 * 3600 * 1000);
  if(spanDays < 1) return { perDay: null, spanDays, points: series.length };
  const perDay = (safeNum(last.total, 0) - safeNum(first.total, 0)) / spanDays;
  return { perDay, spanDays, points: series.length };
}

/**
 * مدل پس‌انداز ماهانه — سه سناریو از μ و σ جریان خالص روزانه
 * بدون ضریب دلخواه: محافظه‌کار = μ−σ ، واقع‌بین = μ ، خوش‌بین = μ+σ
 */
function computeSavingsModel(){
  const [jy, jm] = currentJalaliParts();
  const monthKey = jy + '-' + String(jm).padStart(2, '0');
  const st = (typeof computeMonthSpendStats === 'function')
    ? computeMonthSpendStats(monthKey, { closedMonth: false, balanceForResources: safeNum(assets && assets.card, 0) })
    : null;

  const dpm = daysPerMonthFromStats(st);
  const netSeriesDaily = buildDailyNetSeriesForGoals(st || { elapsedDays: 0 });
  const n = netSeriesDaily.length;
  let mean = 0, stdev = 0;
  if(n > 0){
    mean = netSeriesDaily.reduce((a,b)=>a+b, 0) / n;
    if(n >= 2){
      let ss = 0;
      for(let i = 0; i < n; i++){
        const d = netSeriesDaily[i] - mean;
        ss += d * d;
      }
      stdev = Math.sqrt(ss / (n - 1));
    }
  }

  const growth = observedCapitalGrowthPerDay();
  // اگر جریان ماه جاری داده دارد از آن استفاده کن؛ در غیر این صورت از رشد سرمایه
  let useCashflow = n >= 2;
  let dailyReal = mean;
  let dailyCons = mean - stdev;
  let dailyOpt = mean + stdev;
  if(!useCashflow && growth.perDay != null && growth.spanDays >= 3){
    dailyReal = growth.perDay;
    // نوسان جایگزین نداریم — سناریوها حول رشد مشاهده‌شده با نصف |رشد| به‌عنوان پهنهٔ آماری ساده از خود داده
    const band = Math.abs(growth.perDay) * 0.5;
    dailyCons = growth.perDay - band;
    dailyOpt = growth.perDay + band;
    useCashflow = false;
  }

  const monthly = (d) => d * dpm;
  const confidence = n >= 7 ? Math.min(1, (st && st.coverage) || (n / 30))
    : (n >= 2 ? Math.min(0.45, n / 14) : (growth.spanDays >= 7 ? 0.35 : 0));

  return {
    st,
    elapsedDays: n,
    meanDailyNet: mean,
    stdevDailyNet: stdev,
    daysPerMonth: dpm,
    monthlyCons: monthly(dailyCons),
    monthlyReal: monthly(dailyReal),
    monthlyOpt: monthly(dailyOpt),
    dailyCons, dailyReal, dailyOpt,
    confidence,
    dataSource: n >= 2 ? 'cashflow' : (growth.perDay != null && growth.spanDays >= 3 ? 'capital-growth' : 'none'),
    growth,
    pressure: st ? st.pressure : 0,
    daysZero: st ? st.daysZero : 0,
    daysWithSpend: st ? st.daysWithSpend : 0
  };
}

function formatDurationMonths(months){
  if(months == null || !isFinite(months)) return '—';
  if(months <= 0) return 'اکنون';
  if(months < 1){
    const days = Math.ceil(months * 30.4375);
    return days <= 1 ? 'حدود ۱ روز' : ('حدود ' + days + ' روز');
  }
  if(months < 12){
    const m = Math.ceil(months * 10) / 10;
    return m % 1 === 0 ? (m + ' ماه') : (m.toFixed(1) + ' ماه');
  }
  const y = months / 12;
  if(y < 10) return (Math.round(y * 10) / 10).toFixed(1) + ' سال';
  return Math.round(y) + ' سال';
}

function scenarioTime(remaining, monthlySave){
  const rem = safeNum(remaining, 0);
  if(rem <= 0) return { months: 0, label: 'رسیده', reachable: true };
  const mon = safeNum(monthlySave, 0);
  if(!(mon > 0)) return { months: null, label: 'با روند فعلی قابل وصول نیست', reachable: false };
  const months = rem / mon;
  if(!isFinite(months) || months < 0) return { months: null, label: '—', reachable: false };
  if(months > 1200) return { months, label: 'بیش از ۱۰۰ سال', reachable: true };
  return { months, label: formatDurationMonths(months), reachable: true };
}

/** پارس تاریخ ISO به‌صورت محلی (بدون شیفت UTC) */
function parseISODateLocalMs(iso){
  if(!iso) return NaN;
  const m = String(iso).slice(0,10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return NaN;
  const y = +m[1], mo = +m[2], d = +m[3];
  if(!y || !mo || !d) return NaN;
  return new Date(y, mo - 1, d).getTime();
}

function computeGoalProjection(goal, capital, model){
  const target = Math.max(0, safeNum(goal && goal.targetAmount, 0));
  // سرمایه فعلی = همان computeTotal() که از بیرون پاس داده می‌شود
  const current = Math.max(0, safeNum(capital, 0));
  const remaining = Math.max(0, target - current);
  const achieved = target > 0 ? (current >= target) : false;
  let progress = 0;
  if(target > 0){
    progress = (current / target) * 100;
    if(!isFinite(progress)) progress = 0;
    progress = Math.max(0, Math.min(100, progress));
  } else if(achieved){
    progress = 100;
  }

  const scCons = scenarioTime(remaining, model.monthlyCons);
  const scReal = scenarioTime(remaining, model.monthlyReal);
  const scOpt = scenarioTime(remaining, model.monthlyOpt);

  // شرایط برای رسیدن در ۶ / ۱۲ / ۲۴ ماه
  const horizons = [6, 12, 24].map(m => {
    const needMonthly = remaining > 0 ? (remaining / m) : 0;
    const gap = needMonthly - model.monthlyReal;
    return {
      months: m,
      needMonthly,
      gap, // مثبت = کمبود پس‌انداز ماهانه
      currentMonthly: model.monthlyReal
    };
  });

  // مهلت — تاریخ محلی (هماهنگ با شمسی ذخیره‌شده به‌صورت ISO)
  let deadlineInfo = null;
  if(goal && goal.deadline){
    const dl = parseISODateLocalMs(goal.deadline);
    if(isFinite(dl)){
      const today = todayDate();
      const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const daysLeft = Math.ceil((dl - todayMs) / (24 * 3600 * 1000));
      const monthsLeft = daysLeft / 30.4375;
      const needByDeadline = (daysLeft > 0 && remaining > 0)
        ? (remaining / Math.max(monthsLeft, 1/30))
        : 0;
      const realMon = safeNum(model && model.monthlyReal, 0);
      deadlineInfo = {
        daysLeft,
        monthsLeft,
        needMonthly: needByDeadline,
        gap: needByDeadline - realMon,
        expired: daysLeft < 0,
        reachableOnReal: realMon > 0 && monthsLeft > 0 && (remaining / realMon) <= monthsLeft
      };
    }
  }

  // نیاز روزانه واقع‌بینانه
  let dailyNeedReal = null;
  if(remaining > 0 && model){
    if(scReal.reachable && scReal.months > 0 && model.daysPerMonth > 0){
      dailyNeedReal = remaining / (scReal.months * model.daysPerMonth);
    } else if(model.dailyReal > 0){
      dailyNeedReal = model.dailyReal;
    }
  }

  return {
    target, current, remaining, achieved, progress,
    scCons, scReal, scOpt,
    horizons,
    deadlineInfo,
    dailyNeedReal
  };
}

function setupGoalDeadlinePicker(){
  const daySel = $('goalDlDay'), monthSel = $('goalDlMonth'), yearSel = $('goalDlYear'), noneChk = $('goalDlNone');
  if(!daySel || !monthSel || !yearSel) return;
  if(daySel.dataset.ready === '1') return;
  daySel.dataset.ready = '1';
  const [ty, tm, td] = gregorianToJalali(...todayISO().split('-').map(Number));
  monthSel.innerHTML = JMONTHS.map((m,i)=>`<option value="${i+1}">${m}</option>`).join('');
  const years = [];
  for(let y = ty - 1; y <= ty + 12; y++) years.push(y);
  yearSel.innerHTML = years.map(y=>`<option value="${y}">${y}</option>`).join('');
  function rebuildDays(){
    const jy = parseInt(yearSel.value, 10), jm = parseInt(monthSel.value, 10);
    if(!isFinite(jy) || !isFinite(jm)) return;
    const dCount = daysInJalaliMonth(jy, jm);
    const prevVal = parseInt(daySel.value, 10) || td;
    daySel.innerHTML = Array.from({length:dCount}, (_,i)=>i+1).map(d=>`<option value="${d}">${d}</option>`).join('');
    daySel.value = String(Math.min(prevVal, dCount));
  }
  monthSel.value = String(tm);
  yearSel.value = String(ty);
  rebuildDays();
  daySel.value = String(td);
  monthSel.addEventListener('change', rebuildDays);
  yearSel.addEventListener('change', rebuildDays);
  function applyNoneState(){
    const off = !!(noneChk && noneChk.checked);
    [daySel, monthSel, yearSel].forEach(el => { if(el) el.disabled = off; });
  }
  if(noneChk){
    noneChk.checked = true;
    noneChk.addEventListener('change', applyNoneState);
    applyNoneState();
  }
}
function setGoalDeadlinePickerFromISO(iso){
  setupGoalDeadlinePicker();
  const daySel = $('goalDlDay'), monthSel = $('goalDlMonth'), yearSel = $('goalDlYear'), noneChk = $('goalDlNone');
  if(!daySel || !monthSel || !yearSel) return;
  if(!iso){
    if(noneChk) noneChk.checked = true;
    [daySel, monthSel, yearSel].forEach(el => { if(el) el.disabled = true; });
    return;
  }
  try{
    const parts = String(iso).slice(0,10).split('-').map(Number);
    if(parts.length < 3 || parts.some(n => !isFinite(n))){
      if(noneChk) noneChk.checked = true;
      return;
    }
    const [jy, jm, jd] = gregorianToJalali(parts[0], parts[1], parts[2]);
    if(noneChk) noneChk.checked = false;
    [daySel, monthSel, yearSel].forEach(el => { if(el) el.disabled = false; });
    if(![...yearSel.options].some(o => Number(o.value) === jy)){
      const o = document.createElement('option');
      o.value = jy; o.textContent = jy;
      yearSel.appendChild(o);
    }
    yearSel.value = String(jy);
    monthSel.value = String(jm);
    const dCount = daysInJalaliMonth(jy, jm);
    daySel.innerHTML = Array.from({length:dCount}, (_,i)=>i+1).map(d=>`<option value="${d}">${d}</option>`).join('');
    daySel.value = String(Math.min(jd, dCount));
  }catch(e){
    if(noneChk) noneChk.checked = true;
  }
}
function getGoalDeadlineISO(){
  const noneChk = $('goalDlNone');
  if(noneChk && noneChk.checked) return '';
  return getJalaliPickerISO('goalDlDay', 'goalDlMonth', 'goalDlYear');
}
function formatGoalDeadlineDisplay(iso){
  if(!iso) return '';
  const s = toJalaliStr(String(iso).slice(0,10));
  return s || String(iso).slice(0,10);
}

function openGoalForm(editId){
  // اطمینان از نمایش صفحه اهداف
  const page = document.getElementById('page-goals');
  if(page && !page.classList.contains('active') && typeof showPage === 'function'){
    showPage('page-goals');
  }
  const form = document.getElementById('goalForm');
  if(!form){
    console.error('goalForm not found in DOM');
    return;
  }
  form.classList.add('open');
  form.setAttribute('aria-hidden', 'false');
  form.style.display = 'block';
  const idEl = document.getElementById('goalEditId');
  const titleEl = document.getElementById('goalTitle');
  const amtEl = document.getElementById('goalAmount');
  const ft = document.getElementById('goalFormTitle');
  setupGoalDeadlinePicker();
  if(editId){
    const g = (financialGoals || []).find(x => String(x.id) === String(editId));
    if(g){
      if(idEl) idEl.value = String(g.id);
      if(titleEl) titleEl.value = g.title || '';
      if(amtEl) amtEl.value = fmt(g.targetAmount);
      setGoalDeadlinePickerFromISO(g.deadline ? String(g.deadline).slice(0,10) : '');
      if(ft) ft.textContent = 'ویرایش هدف';
    }
  } else {
    if(idEl) idEl.value = '';
    if(titleEl) titleEl.value = '';
    if(amtEl) amtEl.value = '';
    setGoalDeadlinePickerFromISO('');
    if(ft) ft.textContent = 'هدف جدید';
  }
  try{ form.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }catch(e){}
  if(titleEl) setTimeout(()=>{ try{ titleEl.focus(); }catch(e){} }, 80);
}

function closeGoalForm(){
  const form = document.getElementById('goalForm');
  if(!form) return;
  form.classList.remove('open');
  form.setAttribute('aria-hidden', 'true');
  form.style.display = '';
  const idEl = document.getElementById('goalEditId');
  if(idEl) idEl.value = '';
}

function saveGoalFromForm(){
  const title = String(($('goalTitle') && $('goalTitle').value) || '').trim();
  const amount = parseMoney(($('goalAmount') && $('goalAmount').value) || '');
  const deadlineRaw = (typeof getGoalDeadlineISO === 'function' ? getGoalDeadlineISO() : '') || '';
  const editId = ($('goalEditId') && $('goalEditId').value) || '';

  if(!title){
    if(typeof showToast === 'function') showToast('عنوان هدف را وارد کنید', true);
    else if(typeof toast === 'function') toast('عنوان هدف را وارد کنید', true);
    else alert('عنوان هدف را وارد کنید');
    return;
  }
  if(!isFinite(amount) || amount < 0){
    if(typeof showToast === 'function') showToast('مبلغ هدف نامعتبر است', true);
    else if(typeof toast === 'function') toast('مبلغ هدف نامعتبر است', true);
    else alert('مبلغ هدف نامعتبر است');
    return;
  }

  const now = Date.now();
  const deadline = deadlineRaw ? String(deadlineRaw).slice(0,10) : null;

  if(editId){
    const g = (financialGoals || []).find(x => String(x.id) === String(editId));
    if(g){
      g.title = title;
      g.targetAmount = amount;
      g.deadline = deadline;
      g.updatedAt = now;
    }
  } else {
    financialGoals.push({
      id: now,
      title,
      targetAmount: amount,
      deadline,
      createdAt: now,
      updatedAt: now
    });
  }
  closeGoalForm();
  persist();
  renderFinancialGoals();
  if(typeof showToast === 'function') showToast(editId ? 'هدف به‌روز شد' : 'هدف ذخیره شد');
}

function deleteGoal(id){
  if(!confirm('این هدف حذف شود؟')) return;
  financialGoals = (financialGoals || []).filter(g => String(g.id) !== String(id));
  persist();
  renderFinancialGoals();
}

const GOALS_COLLAPSE_KEY = 'daftar-goals-collapse';
function loadGoalCollapseState(){
  try{
    const raw = sessionStorage.getItem(GOALS_COLLAPSE_KEY);
    if(!raw) return {};
    const o = JSON.parse(raw);
    return (o && typeof o === 'object') ? o : {};
  }catch(e){ return {}; }
}
function saveGoalCollapseState(map){
  try{ sessionStorage.setItem(GOALS_COLLAPSE_KEY, JSON.stringify(map || {})); }catch(e){}
}
function isGoalExpanded(id){
  const map = loadGoalCollapseState();
  return map[String(id)] === true;
}
function setGoalExpanded(id, open){
  const map = loadGoalCollapseState();
  map[String(id)] = !!open;
  saveGoalCollapseState(map);
}

/* --- Financial goals --- */
function renderFinancialGoals(){
  const listEl = $('goalsList');
  if(!listEl) return;

  try{
    const capital = safeNum(typeof computeTotal === 'function' ? computeTotal() : 0, 0);
    if($('goalsCurrentCapital')) $('goalsCurrentCapital').textContent = fmt(capital) + ' ت';

    const model = computeSavingsModel();
    if($('goalsSavingsRate')){
      if(model.dataSource === 'none'){
        $('goalsSavingsRate').textContent = 'داده کافی نیست';
      } else {
        const v = model.monthlyReal;
        const sign = v >= 0 ? '' : '−';
        $('goalsSavingsRate').textContent = sign + fmt(Math.abs(Math.round(v))) + ' ت/ماه';
      }
    }

    const goals = Array.isArray(financialGoals) ? financialGoals.slice() : [];
    goals.sort((a,b)=> (b.updatedAt||0) - (a.updatedAt||0));

    if(!goals.length){
      listEl.innerHTML = '<div class="goals-empty">هنوز هدفی ندارید.<br>با «هدف جدید» شروع کنید.</div>';
      return;
    }

    listEl.innerHTML = goals.map(g => {
      const proj = computeGoalProjection(g, capital, model);
      const badge = proj.achieved ? 'رسیده' : 'در مسیر';
      const confPct = Math.round(model.confidence * 100);
      let confHtml = '';
      if(model.dataSource === 'none'){
        confHtml = '<div class="goal-conf warn">داده کافی برای پیش‌بینی زمان نیست؛ فقط فاصله تا هدف مشخص است.</div>';
      } else if(model.confidence < 0.45){
        confHtml = '<div class="goal-conf warn">اطمینان پیش‌بینی ≈ ' + confPct + '٪ — داده محدود است.</div>';
      } else {
        confHtml = '<div class="goal-conf">اطمینان ≈ ' + confPct + '٪ · ' +
          (model.dataSource === 'cashflow' ? 'بر پایه درآمد/هزینه' : 'بر پایه رشد سرمایه') + '</div>';
      }

      const scBlock = (name, sc, monthly) => {
        const mon = monthly;
        const monTxt = isFinite(mon)
          ? ((mon >= 0 ? '' : '−') + fmt(Math.abs(Math.round(mon))) + ' ت/ماه')
          : '—';
        return '<div class="goal-sc"><div class="sc-name">' + name + '</div>' +
          '<div class="sc-line">پس‌انداز: <b>' + monTxt + '</b></div>' +
          '<div class="sc-line">زمان تقریبی: <b>' + escapeHtml(sc.label) + '</b></div></div>';
      };

      let condHtml = '';
      if(!proj.achieved){
        const lines = proj.horizons.map(h => {
          if(h.needMonthly <= 0) return '';
          if(h.gap <= 0){
            return '<p><b>' + h.months + ' ماه:</b> با پس‌انداز فعلی قابل دسترس (≈ ' +
              fmt(Math.round(h.needMonthly)) + ' ت/ماه).</p>';
          }
          return '<p><b>' + h.months + ' ماه:</b> نیاز ≈ ' + fmt(Math.round(h.needMonthly)) +
            ' ت/ماه — ' + fmt(Math.round(h.gap)) + ' ت بیشتر از روند فعلی.</p>';
        }).filter(Boolean).join('');
        if(model.monthlyReal <= 0 && proj.remaining > 0){
          condHtml = '<div class="goal-conditions"><div class="gc-h">شرایط لازم</div>' +
            '<p>پس‌انداز فعلی صفر یا منفی است؛ برای رسیدن باید درآمد بیشتر یا هزینه کمتر شود.</p>' +
            lines + '</div>';
        } else if(lines){
          condHtml = '<div class="goal-conditions"><div class="gc-h">شرایط لازم</div>' + lines + '</div>';
        }
      }

      let deadlineHtml = '';
      if(g.deadline || proj.deadlineInfo){
        const di = proj.deadlineInfo;
        const jalaliDl = g.deadline ? formatGoalDeadlineDisplay(g.deadline) : '';
        if(di && di.expired){
          deadlineHtml = '<div class="gc-row"><span class="k">مهلت</span><span class="v" style="color:var(--red)">' +
            escapeHtml(jalaliDl || 'منقضی') + ' — منقضی</span></div>';
        } else if(di){
          deadlineHtml = '<div class="gc-row"><span class="k">مهلت</span><span class="v">' +
            escapeHtml(jalaliDl) + ' · ' + di.daysLeft + ' روز · نیاز ≈ ' + fmt(Math.round(di.needMonthly)) + ' ت/ماه</span></div>';
        } else if(jalaliDl){
          deadlineHtml = '<div class="gc-row"><span class="k">مهلت</span><span class="v">' + escapeHtml(jalaliDl) + '</span></div>';
        }
      }

      const expanded = isGoalExpanded(g.id);
      const detailsHtml = proj.achieved
        ? '<p class="an-ok" style="margin:0 0 10px;font-size:12px;">به مبلغ هدف رسیده‌اید.</p>' +
          '<div class="gc-rows">' +
          '<div class="gc-row"><span class="k">مانده تا هدف</span><span class="v">' + fmt(proj.remaining) + ' ت</span></div>' +
          deadlineHtml + '</div>'
        : '<div class="gc-rows">' +
          '<div class="gc-row"><span class="k">مانده تا هدف</span><span class="v">' + fmt(proj.remaining) + ' ت</span></div>' +
          '<div class="gc-row"><span class="k">پس‌انداز ماهانه (واقع‌بینانه)</span><span class="v">' +
          (proj.scReal.reachable && model.monthlyReal > 0 ? fmt(Math.round(model.monthlyReal)) + ' ت' : '—') +
          '</span></div>' + deadlineHtml + '</div>' +
          '<div class="goal-scenarios">' +
            scBlock('محافظه‌کارانه', proj.scCons, model.monthlyCons) +
            scBlock('واقع‌بینانه', proj.scReal, model.monthlyReal) +
            scBlock('خوش‌بینانه', proj.scOpt, model.monthlyOpt) +
          '</div>' + condHtml + confHtml;

      return '<div class="goal-card' + (proj.achieved ? ' achieved' : '') + (expanded ? ' expanded' : '') +
        '" data-goal-id="' + g.id + '">' +
        '<div class="gc-summary" role="button" tabindex="0" aria-expanded="' + (expanded ? 'true' : 'false') +
        '" data-goal-toggle="' + g.id + '" title="باز/بسته کردن جزئیات">' +
        '<div class="gc-top">' +
          '<h3 class="gc-title">' + escapeHtml(g.title || 'بدون عنوان') + '</h3>' +
          '<div style="display:flex;align-items:center;gap:6px;">' +
            '<span class="gc-badge">' + badge + '</span>' +
            '<span class="gc-chev" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></span>' +
          '</div>' +
        '</div>' +
        '<div class="gc-summary-metrics">' +
          '<div><span class="sm-k">هدف</span> · <span class="sm-v">' + fmt(proj.target) + ' ت</span></div>' +
          '<div><span class="sm-k">سرمایه فعلی</span> · <span class="sm-v">' + fmt(proj.current) + ' ت</span></div>' +
        '</div>' +
        '<div class="goal-progress" style="margin:4px 0 0;"><div class="gp-label"><span>پیشرفت</span><span>' +
          proj.progress.toFixed(1) + '٪</span></div>' +
        '<div class="gp-track"><div class="gp-fill" style="width:' + Math.min(100, proj.progress).toFixed(2) +
        '%"></div></div></div>' +
        (g.deadline ? '<div class="gc-meta" style="margin:6px 0 0;">مهلت: ' + escapeHtml(formatGoalDeadlineDisplay(g.deadline)) + '</div>' : '') +
        '</div>' +
        '<div class="goal-body"><div class="goal-body-inner">' + detailsHtml +
        '<div class="gc-actions">' +
        '<button type="button" class="btn ghost goal-edit-btn" data-id="' + g.id + '">ویرایش</button>' +
        '<button type="button" class="btn ghost goal-del-btn" data-id="' + g.id + '" style="color:var(--red)">حذف</button>' +
        '</div></div></div></div>';
    }).join('');
  }catch(err){
    console.error('renderFinancialGoals', err);
    listEl.innerHTML = '<div class="goals-empty">نمایش اهداف در دسترس نیست.</div>';
  }
}

function bindGoalUi(){
  // Event Delegation — همیشه کار می‌کند حتی اگر دکمه بعداً re-render شود
  if(window.__goalsUiBound) return;
  window.__goalsUiBound = true;
  document.addEventListener('click', (e)=>{
    const t = e.target;
    if(!t || !t.closest) return;
    if(t.closest('#goalAddBtn')){
      e.preventDefault();
      openGoalForm(null);
      return;
    }
    if(t.closest('#goalCancelBtn')){
      e.preventDefault();
      closeGoalForm();
      return;
    }
    if(t.closest('#goalSaveBtn')){
      e.preventDefault();
      saveGoalFromForm();
      return;
    }
    const ed = t.closest('.goal-edit-btn');
    if(ed){
      e.preventDefault();
      e.stopPropagation();
      openGoalForm(ed.getAttribute('data-id'));
      return;
    }
    const del = t.closest('.goal-del-btn');
    if(del){
      e.preventDefault();
      e.stopPropagation();
      deleteGoal(del.getAttribute('data-id'));
      return;
    }
    const tog = t.closest('[data-goal-toggle]');
    if(tog){
      e.preventDefault();
      const id = tog.getAttribute('data-goal-toggle');
      const card = tog.closest('.goal-card');
      const next = !isGoalExpanded(id);
      setGoalExpanded(id, next);
      if(card){
        card.classList.toggle('expanded', next);
        tog.setAttribute('aria-expanded', next ? 'true' : 'false');
      }
      return;
    }
  });
  if(!window.__goalsKeyBound){
    window.__goalsKeyBound = true;
    document.addEventListener('keydown', (e)=>{
      const tog = e.target && e.target.closest && e.target.closest('[data-goal-toggle]');
      if(!tog) return;
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        tog.click();
      }
    });
  }
}
// اتصال فوری + پس از DOMContentLoaded برای اطمینان
bindGoalUi();
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', bindGoalUi, { once: true });
}


/* --- Forecast / analysis --- */
function renderForecastSnapshots(){
  const el = $('fcSnapList');
  if(!el) return;
  const list = (fcSnapshots || []).filter(s => s && (s.kind === 'month-end' || s.monthKey));
  if(!list.length){
    el.innerHTML = '';
    return;
  }
  const sorted = [...list].sort((a,b)=>{
    const ka = String(a.monthKey || a.date || '');
    const kb = String(b.monthKey || b.date || '');
    return ka < kb ? 1 : (ka > kb ? -1 : 0);
  });
  const needScroll = sorted.length > 7;
  const items = sorted.map(s=>{
    const p = safeNum(s.pressure, 0);
    const col = progressColor(p);
    const label = s.monthLabel || toJalaliStr(s.date) || s.monthKey || '—';
    return `<div class="fc-snap-item"><span class="d">${label}</span><span class="p" style="color:${col}">${p.toFixed(1)}٪</span></div>`;
  }).join('');
  el.innerHTML = '<div class="fc-snap-title">تاریخچه فشار مالی ماهانه</div>' +
    `<div id="fcSnapScroll" class="scroll-list${needScroll?' scrollable':''}">${items}</div>`;
}


/* ================= تحلیل وضعیت مالی (متنی) ================= */
function renderFinancialAnalysis(){
  const el = $('financeAnalysis');
  if(!el) return;
  try{
    const lines = [];
    const total = safeNum(typeof computeTotal === 'function' ? computeTotal() : 0, 0);
    const cash = safeNum(typeof computeCash === 'function' ? computeCash() : 0, 0);
    const invest = safeNum(typeof computeInvest === 'function' ? computeInvest() : 0, 0);
    const card = safeNum(assets && assets.card, 0);

    const [jy, jm, jd] = currentJalaliParts();
    const monthKey = jy + '-' + String(jm).padStart(2, '0');
    const monthName = (JMONTHS[jm-1] || '') + ' ' + jy;

    const st = computeMonthSpendStats(monthKey, {
      closedMonth: false,
      balanceForResources: card
    });

    if(total <= 0 && st.paymentCount === 0 && st.sumReceipt === 0){
      el.innerHTML = '<div class="analysis-block"><div class="an-h"><span class="an-pip"></span>وضعیت کلی</div><p class="an-muted">دادهٔ کافی برای تحلیل ثبت نشده است. با ثبت تراکنش‌ها و موجودی‌ها، این بخش به‌روز می‌شود.</p></div>';
      return;
    }

    lines.push('<div class="analysis-block"><div class="an-h"><span class="an-pip"></span>وضعیت کلی</div>');
    lines.push('<p>جمع دارایی‌ها حدود <b>' + fmt(total) + '</b> تومان است' +
      (cash || invest ? ' <span class="analysis-chip">نقد ' + fmt(cash) + '</span> <span class="analysis-chip">سرمایه ' + fmt(invest) + '</span>' : '') +
      '</p><p>موجودی ثبت‌شده کارت: <b>' + fmt(card) + '</b> تومان.</p></div>');

    // --- هزینه ماه با صفرهای واقعی ---
    lines.push('<div class="analysis-block"><div class="an-h"><span class="an-pip gold"></span>روند ' + monthName + '</div>');
    if(st.paymentCount === 0 && st.sumReceipt === 0){
      lines.push('<p class="an-muted">در این ماه هنوز دریافتی یا پرداختی ثبت نشده. ' +
        st.elapsedDays + ' روز سپری‌شده بدون خرج به‌عنوان صفر در آمار لحاظ می‌شود.</p></div>');
    } else {
      lines.push('<p>تا روز <b>' + st.elapsedDays + '</b> از <b>' + st.totalDays + '</b> · ' +
        'خرج واقعی <b>' + fmt(st.sumPay) + '</b> ت · دریافتی <b>' + fmt(st.sumReceipt) + '</b> ت</p>');
      lines.push('<p><span class="analysis-chip">' + st.daysWithSpend + ' روز دارای خرج</span> ' +
        '<span class="analysis-chip">' + st.daysZero + ' روز بدون خرج</span> ' +
        '<span class="analysis-chip">باقی ' + st.remainingDays + ' روز</span></p>');
      lines.push('<p>میانگین روزانه (با صفرها): <b>' + fmt(Math.round(st.avgDaily)) + '</b> ت' +
        (st.daysWithSpend > 0 ? ' · میانگین روزهای دارای خرج: <b>' + fmt(Math.round(st.avgOnSpendDays)) + '</b> ت' : '') +
        '</p>');
      if(st.extrapolate){
        lines.push('<p>خرج پیش‌بینی‌شده ماه: <b>' + fmt(st.projectedMonth) + '</b> ت' +
          (st.confidence < 0.5 ? ' <span class="an-muted">(پوشش ماه هنوز کم است — غیرقطعی)</span>' : '') +
          '</p>');
      } else if(st.elapsedDays < 2 && st.paymentCount > 0){
        lines.push('<p class="an-muted">داده کمتر از دو روز سپری‌شده؛ تعمیم به کل ماه انجام نشد.</p>');
      }
      const net = st.sumReceipt - st.sumPay;
      if(st.paymentCount && st.sumReceipt){
        if(net > 0) lines.push('<p class="an-ok">خالص ماه تا امروز مثبت ≈ ' + fmt(net) + ' ت</p>');
        else if(net < 0) lines.push('<p><span class="analysis-chip warn">خالص منفی ≈ ' + fmt(Math.abs(net)) + ' ت</span></p>');
        else lines.push('<p class="an-muted">دریافتی و پرداخت تقریباً برابرند.</p>');
      }
      lines.push('</div>');

      // شدت / نوسان / روند
      lines.push('<div class="analysis-block"><div class="an-h"><span class="an-pip"></span>شاخص‌های مصرف</div>');
      const pressurePip = st.pressure >= 100 ? 'warn' : (st.pressure >= 70 ? 'gold' : 'ok');
      lines.push('<p>فشار مالی (خرج پیش‌بینی ÷ توان): <b>' + st.pressure.toFixed(1) + '٪</b></p>');
      if(st.elapsedDays >= 2){
        lines.push('<p class="an-muted">نوسان روزانه (انحراف معیار): ' + fmt(Math.round(st.stdev)) + ' ت' +
          (st.avgDaily > 0 ? ' · ضریب تغییرات ' + (st.cv * 100).toFixed(0) + '٪' : '') + '</p>');
        if(st.trend === 'up'){
          lines.push('<p class="an-warn">روند هزینه افزایشی است (شیب مثبت نسبت به میانگین).</p>');
        } else if(st.trend === 'down'){
          lines.push('<p class="an-ok">روند هزینه کاهشی است.</p>');
        } else {
          lines.push('<p class="an-muted">روند هزینه نسبتاً پایدار است.</p>');
        }
      }
      if(isFinite(st.incomeRatio) && st.sumReceipt > 0){
        lines.push('<p>نسبت خرج به دریافتی تا امروز: <b>' + (st.incomeRatio * 100).toFixed(0) + '٪</b></p>');
      }
      // سرعت مصرف بودجه کارت نسبت به روزهای باقی‌مانده
      if(card > 0 && st.avgDaily > 0 && st.remainingDays > 0){
        const daysCover = card / st.avgDaily;
        lines.push('<p class="an-muted">با آهنگ فعلی، موجودی کارت حدود <b>' +
          Math.round(daysCover) + '</b> روز پوشش می‌دهد' +
          (daysCover < st.remainingDays ? ' — کمتر از باقی‌مانده ماه' : '') + '.</p>');
      }
      lines.push('</div>');
    }

    // الگوی دسته از توضیحات پرداخت (دفتر ماه جاری)
    const payments = (Array.isArray(notebook) ? notebook : []).filter(e =>
      e && e.type === 'payment' && safeNum(e.amount) > 0 &&
      (!e.date || isoToJalaliMonthKey(String(e.date).slice(0,10)) === monthKey)
    );
    const catMap = {};
    payments.forEach(e => {
      const note = String(e.desc || e.note || '').trim();
      if(!note) return;
      const k = note.split(/\s+/)[0].slice(0, 24);
      catMap[k] = (catMap[k] || 0) + safeNum(e.amount, 0);
    });
    const cats = Object.keys(catMap).map(k => ({k, v: catMap[k]})).sort((a,b)=> b.v - a.v);
    if(cats.length){
      const top = cats[0];
      const share = st.sumPay > 0 ? (top.v / st.sumPay) * 100 : 0;
      lines.push('<div class="analysis-block"><div class="an-h"><span class="an-pip' +
        (share >= 40 ? ' warn' : '') + '"></span>الگوی هزینه</div>');
      lines.push('<p>بیشترین سهم تقریبی: «' + escapeHtml(top.k) + '» ≈ ' + fmt(top.v) +
        ' ت (' + share.toFixed(0) + '٪)</p>');
      if(share >= 40){
        lines.push('<p class="an-warn">سهم بالاست؛ خریدهای غیرضروری این حوزه را کم کنید یا سقف هفتگی بگذارید.</p>');
      } else if(cats.length >= 2){
        lines.push('<p class="an-muted">بعدی: «' + escapeHtml(cats[1].k) + '» ≈ ' + fmt(cats[1].v) + ' ت</p>');
      }
      lines.push('</div>');
    } else if(payments.length){
      lines.push('<div class="analysis-block"><div class="an-h"><span class="an-pip"></span>الگوی هزینه</div><p class="an-muted">برای تشخیص دسته، هنگام پرداخت توضیح کوتاه بنویسید.</p></div>');
    }

    // برآورد کارت تا پایان ماه
    lines.push('<div class="analysis-block"><div class="an-h"><span class="an-pip ok"></span>برآورد تا پایان ماه <span class="an-muted" style="font-weight:500">(تقریبی)</span></div>');
    if(st.elapsedDays < 2){
      lines.push('<p class="an-muted">داده کمتر از دو روز سپری‌شده است؛ مبنای مطمئن فقط موجودی فعلی کارت (' + fmt(card) + ' ت) است.</p></div>');
    } else {
      const extraPay = Math.max(0, st.projectedMonth - st.sumPay);
      const extraDep = Math.max(0, st.projectedReceipt - st.sumReceipt);
      const est = card - extraPay + extraDep;
      lines.push('<p>با ادامهٔ آهنگ فعلی (میانگین با روزهای صفر)، موجودی کارت تا پایان ماه حدود <b>' +
        fmt(Math.max(0, Math.round(est))) + '</b> تومان برآورد می‌شود' +
        (st.confidence < 0.45 ? ' — غیرقطعی' : '') + '.</p>');
      if(est < card * 0.85 && st.daysWithSpend >= 1){
        lines.push('<p class="an-warn">روند خرج نسبت به کارت تند است؛ پرداخت‌های تکرارشونده را مرور کنید.</p>');
      }
      if(st.pressure >= 100){
        lines.push('<p class="an-warn">احتمال فشار بودجه تا پایان ماه بالاست (خرج پیش‌بینی‌شده از توان مالی بیشتر است).</p>');
      }
      lines.push('</div>');
    }

    const loans = (Array.isArray(notebook) ? notebook : []).filter(e => e && (e.type === 'lent' || e.type === 'borrowed') && !e.settled);
    if(loans.length){
      const lent = loans.filter(e => e.type === 'lent').reduce((s,e)=>s+safeNum(e.amount),0);
      const borrowed = loans.filter(e => e.type === 'borrowed').reduce((s,e)=>s+safeNum(e.amount),0);
      lines.push('<div class="analysis-block"><div class="an-h"><span class="an-pip warn"></span>قرض‌های باز</div>');
      lines.push('<p class="an-muted">طلب ≈ ' + fmt(lent) + ' ت · بدهی ≈ ' + fmt(borrowed) + ' ت</p></div>');
    }

    lines.push('<p class="an-muted">منبع: فقط داده‌های ثبت‌شده در همین برنامه. روز بدون پرداخت در بازهٔ سپری‌شده = صفر واقعی.</p>');
    el.innerHTML = lines.join('');
  }catch(err){
    console.error('renderFinancialAnalysis', err);
    el.innerHTML = '<p class="an-muted">تحلیل در دسترس نیست. بعد از ثبت چند تراکنش دوباره تلاش کنید.</p>';
  }
}


function renderForecast(){
  try{
    if(!$('fcMonth') || !$('fcExpense')) return;

    const [jy, jm, jd] = currentJalaliParts();
    const monthLabel = (JMONTHS[jm-1] || '') + ' ' + jy;
    const monthKey = jy + '-' + String(jm).padStart(2, '0');

    $('fcMonth').textContent = monthLabel;

    // موجودی کارت فقط برای ردیف «موجودی» (UI جدا)
    const currentBal = safeNum(assets && assets.card, 0);
    if($('fcBalance')) $('fcBalance').textContent = fmt(currentBal) + ' ت';

    // منابع مالی = جمع کل دارایی معتبر (همان computeTotal / جمع کل صفحه خانه)
    const totalAssets = Math.max(0, safeNum(typeof computeTotal === 'function' ? computeTotal() : 0, 0));

    const st = computeMonthSpendStats(monthKey, {
      closedMonth: false,
      balanceForResources: totalAssets
    });

    if($('fcRemain')) $('fcRemain').textContent = String(st.remainingDays);
    if($('fcCount')) $('fcCount').textContent = String(st.paymentCount);
    if($('fcDays')) $('fcDays').textContent = String(st.daysWithSpend);
    // خرج ماهانه پیش‌بینی‌شده — فقط از paymentهای واقعی ماه (منطق computeMonthSpendStats)
    if($('fcExpense')) $('fcExpense').textContent = fmt(st.projectedMonth) + ' ت';

    // منابع مالی: بدون افزودن درآمد فرضی — برابر جمع کل دارایی
    const resources = totalAssets;
    const capacity = resources * 0.8;
    let pressure = 0;
    if(capacity > 1e-9) pressure = (st.projectedMonth / capacity) * 100;
    else if(st.projectedMonth > 0) pressure = 100;
    pressure = safeNum(pressure, 0);
    if(pressure < 0) pressure = 0;
    if(pressure > 100) pressure = 100;

    if($('fcResources')) $('fcResources').textContent = fmt(Math.round(resources)) + ' ت';
    if($('fcCapacity')) $('fcCapacity').textContent = fmt(Math.round(capacity)) + ' ت';
    if($('fcPressure')) $('fcPressure').textContent = pressure.toFixed(1) + '٪';

    const barPct = Math.min(100, Math.max(0, pressure));
    const color = progressColor(barPct);
    if($('fcProgress')){
      $('fcProgress').style.width = barPct + '%';
      $('fcProgress').style.background = color;
    }
    if($('fcPctLabel')){
      $('fcPctLabel').textContent = pressure.toFixed(1) + '٪';
      $('fcPctLabel').style.color = color;
    }

    const deficit = Math.max(0, st.projectedMonth - capacity);
    if($('fcDeficitRow') && $('fcDeficit')){
      if(deficit > 0 && st.projectedMonth > 0){
        $('fcDeficitRow').style.display = '';
        $('fcDeficit').textContent = fmt(Math.round(deficit)) + ' ت';
      } else {
        $('fcDeficitRow').style.display = 'none';
        $('fcDeficit').textContent = '—';
      }
    }

    // یادداشت وضعیت — تفکیک صفر واقعی / داده کم / تعمیم
    if($('fcNote')){
      if(st.paymentCount === 0){
        $('fcNote').textContent = 'هنوز پرداختی در این ماه ثبت نشده. پیش‌بینی هزینه صفر است.';
      } else if(!st.extrapolate){
        $('fcNote').textContent = 'خرج ماه = مجموع پرداختی‌های ثبت‌شده (' + st.paymentCount + ' تراکنش).';
      } else {
        const trendHint = st.trend === 'up' ? ' · روند افزایشی' : (st.trend === 'down' ? ' · روند کاهشی' : '');
        const base = 'میانگین روزانه ' + fmt(Math.round(st.avgDaily)) +
          ' ت × ' + st.totalDays + ' روز ماه (از روی ' + st.elapsedDays + ' روز سپری‌شده)' + trendHint;
        if(deficit > 0){
          $('fcNote').textContent = 'خرج پیش‌بینی‌شده از توان مالی بیشتر است. ' + base + '.';
        } else {
          $('fcNote').textContent = base + '.';
        }
      }
    }

    // snapshot فشار (منطق قبلی: با ≥۱۵ پرداخت یکتا)
    try{
      const monthEvents = (Array.isArray(fcEvents) ? fcEvents : []).filter(e =>
        e && e.date && isoToJalaliMonthKey(String(e.date).slice(0,10)) === monthKey
      );
      const pays = monthEvents.filter(e => e.type === 'payment' && safeNum(e.amount) > 0);
      if(typeof maybeCreateSnapshot === 'function') maybeCreateSnapshot(pays, pressure);
    }catch(_e){}

    if(typeof renderForecastSnapshots === 'function') renderForecastSnapshots();
  }catch(err){
    console.error('renderForecast', err);
    try{
      if($('fcExpense')) $('fcExpense').textContent = '۰ ت';
      if($('fcCapacity')) $('fcCapacity').textContent = '۰ ت';
      if($('fcResources')) $('fcResources').textContent = '۰ ت';
      if($('fcPressure')) $('fcPressure').textContent = '۰٪';
      if($('fcPctLabel')) $('fcPctLabel').textContent = '۰٪';
      if($('fcProgress')) $('fcProgress').style.width = '0%';
      if($('fcNote')) $('fcNote').textContent = 'محاسبه در دسترس نیست.';
    }catch(_e){}
  }
}


function renderLoans(){
  const el = $('loanList');
  const remainEl = $('loanRemain');
  if(!el) return;

  const loans = (notebook || []).filter(e => e && (e.type === 'lent' || e.type === 'borrowed'));
  // فعال‌ها اول، تسویه‌شده‌ها آخر؛ داخل هر گروه جدیدتر بالاتر
  loans.sort((a,b)=>{
    const as = a.settled ? 1 : 0, bs = b.settled ? 1 : 0;
    if(as !== bs) return as - bs;
    const ka = (a.date||'') + (a.time||'00:00');
    const kb = (b.date||'') + (b.time||'00:00');
    return ka < kb ? 1 : -1;
  });

  // رفع باگ محاسباتی: قبلاً «قرض داده» و «قرض گرفته» بدون در نظر گرفتن جهت بدهی جمع می‌شدند
  // (یعنی طلب از دیگران و بدهی به دیگران با هم جمع می‌شد که عددی گمراه‌کننده تولید می‌کرد).
  // این‌جا مبلغ خالص (طلب منهای بدهی) با همان علامتی که در nbDelta() استفاده می‌شود محاسبه می‌شود.
  const openLoans = loans.filter(e => !e.settled);
  const lentOpen = openLoans.filter(e => e.type === 'lent').reduce((s,e) => s + safeNum(e.amount, 0), 0);
  const borrowedOpen = openLoans.filter(e => e.type === 'borrowed').reduce((s,e) => s + safeNum(e.amount, 0), 0);
  const remain = lentOpen - borrowedOpen;
  if(remainEl){
    const remainLbl = document.querySelector('.loan-remain .lbl');
    if(remain > 0){
      remainEl.textContent = '+' + fmt(remain) + ' ت';
      remainEl.style.color = 'var(--green)';
      if(remainLbl) remainLbl.textContent = 'خالص طلب از دیگران (تسویه‌نشده)';
    } else if(remain < 0){
      remainEl.textContent = '−' + fmt(Math.abs(remain)) + ' ت';
      remainEl.style.color = 'var(--red)';
      if(remainLbl) remainLbl.textContent = 'خالص بدهی به دیگران (تسویه‌نشده)';
    } else {
      remainEl.textContent = '۰ ت';
      remainEl.style.color = '';
      if(remainLbl) remainLbl.textContent = 'قرض باقی‌مانده (تسویه‌نشده)';
    }
  }

  if(loans.length === 0){
    el.innerHTML = '<div class="empty">قرضی ثبت نشده</div>';
    return;
  }

  el.innerHTML = loans.map(e=>{
    const t = NB_TYPES[e.type] || {label: e.type, color: 'var(--ink-dim)'};
    const person = e.person ? e.person : '—';
    const settled = !!e.settled;
    const settledTxt = settled && e.settledDate
      ? `تسویه: ${toJalaliStr(e.settledDate)}`
      : (settled ? 'تسویه‌شده' : 'تسویه‌نشده');
    const settleBadge = settled
      ? `<span class="loan-settle-badge">تسویه شده · ${e.settledDate ? (toJalaliStr(e.settledDate)||e.settledDate) : '—'}</span>`
      : '';
    return `<div class="loan-item${settled ? ' settled' : ''}" data-id="${e.id}">
      <label class="loan-check-wrap" title="علامت تسویه">
        <input type="checkbox" class="loan-check" data-id="${e.id}" ${settled ? 'checked' : ''}>
        <span class="loan-check-ui" aria-hidden="true"></span>
      </label>
      <div class="loan-body">
        <div class="loan-top">
          <span class="loan-title">${t.label} — ${escapeHtml(person)}</span>
          <span class="loan-amt" style="color:${settled ? 'var(--ink-dim)' : t.color}">${fmt(safeNum(e.amount))} ت</span>
        </div>
        <div class="loan-meta">${toJalaliStr(e.date)||''}${e.desc ? ' · ' + escapeHtml(e.desc) : ''}</div>
        ${settleBadge}
      </div>
    </div>`;
  }).join('');

  el.querySelectorAll('.loan-check').forEach(chk=>{
    chk.addEventListener('change', ()=>{
      const id = chk.dataset.id;
      const entry = notebook.find(x => String(x.id) === String(id));
      if(!entry) return;
      applyLoanSettlement(entry, !!chk.checked);
      persist();
      renderNotebook();
      if(typeof render === 'function') render();
    });
  });
}

function applyLoanSettlement(entry, settling){
  if(!entry || (entry.type !== 'lent' && entry.type !== 'borrowed')) return;
  if(settling){
    if(entry.settled) return;
    if(entry.applied && !entry.settledApplied){
      const total = safeNum(entry.amount, 0);
      const paid = Math.min(total, Math.max(0, safeNum(entry.paidAmount, 0)));
      const rem = Math.max(0, total - paid);
      let d = 0;
      if(entry.type === 'lent') d = rem;
      else if(entry.type === 'borrowed') d = -rem;
      if(Math.abs(d) > 0.5){
        assets.card = safeNum(assets.card, 0) + d;
        entry.settleCardDelta = d;
        entry.settledApplied = true;
      }
    }
    entry.settled = true;
    entry.settledDate = todayISO();
  } else {
    if(!entry.settled) return;
    if(entry.settledApplied && entry.settleCardDelta){
      assets.card = safeNum(assets.card, 0) - safeNum(entry.settleCardDelta, 0);
      entry.settledApplied = false;
      entry.settleCardDelta = 0;
    }
    entry.settled = false;
    entry.settledDate = null;
  }
}


/* --- Notebook (تراکنش‌های ثبت‌شده) --- */
function renderNotebook(){
  try{ if(typeof renderBankCards === 'function') renderBankCards(); }catch(e){ console.error(e); }
  try{ if(typeof renderLoans === 'function') renderLoans(); }catch(e){ console.error(e); }
  const el = $('nbList');
  if(!el) return;
  if(!Array.isArray(notebook)) notebook = [];
  const monthKey = currentNbMonthKey();
  const visibleNb = notebook.filter(e => {
    if(!e) return false;
    if((e.type === 'lent' || e.type === 'borrowed') && !e.settled) return true;
    if(!e.date) return true;
    const k = isoToJalaliMonthKey(e.date);
    if(!k) return true;
    return k === monthKey;
  });
  if(visibleNb.length === 0){
    el.innerHTML = '<div class="empty">در این ماه تراکنشی ثبت نشده</div>';
  } else {
    const sorted = [...visibleNb].sort((a,b)=>{
      const ka = (a.date||'') + (a.time||'00:00'), kb = (b.date||'') + (b.time||'00:00');
      return ka < kb ? 1 : -1;
    });
    const filtered = sorted.filter(e => nbFilterMatch(e.type, currentNbFilter));
    if(filtered.length === 0){
      el.innerHTML = '<div class="empty">در این دسته تراکنشی یافت نشد</div>';
    } else {
      // گروه‌بندی بر اساس روز — هر تاریخ قابل collapse با کلیک روی خود تاریخ
      const groups = [];
      let cur = null;
      filtered.forEach(e=>{
        const dayKey = e.date || '__nodate__';
        if(!cur || cur.key !== dayKey){
          cur = {key: dayKey, label: e.date ? (toJalaliStr(e.date) || 'تاریخ نامشخص') : 'تاریخ نامشخص', items: []};
          groups.push(cur);
        }
        cur.items.push(e);
      });
      let html = '';
      groups.forEach(g=>{
        const collapsed = !(typeof nbDayExpanded !== 'undefined' && nbDayExpanded.has(g.key));
        const cnt = g.items.length;
        const countTxt = cnt === 1 ? '۱ تراکنش' : (cnt.toLocaleString('fa-IR') + ' تراکنش');
        html += `<div class="nb-day-group${collapsed ? ' is-collapsed' : ''}" data-day="${escapeHtml(g.key)}">
          <div class="nb-day-head" role="button" tabindex="0" aria-expanded="${collapsed ? 'false' : 'true'}">
            <span class="nb-day-head-main">
              <span class="nb-day-chev" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></span>
              <span class="nb-day-label">${escapeHtml(g.label)}</span>
            </span>
            <span class="nb-day-count">${countTxt}</span>
          </div>
          <div class="nb-day-body">`;
        g.items.forEach(e=>{
          const t = NB_TYPES[e.type] || {label: e.type||'?', color: 'var(--ink-dim)', sign: 0};
          const icon = NB_ICONS[e.type] || NB_ICONS.transfer;
          const sign = t.sign > 0 ? '+' : (t.sign < 0 ? '−' : '');
          const personTxt = e.person ? ' — ' + escapeHtml(e.person) : '';
          const settled = (e.type === 'lent' || e.type === 'borrowed') && e.settled;
          const cardChip = (e.cardName || e.cardLast4)
            ? `<span class="nb-card-chip2">${escapeHtml(e.cardName||'کارت')}${e.cardLast4 ? ' · •••• ' + escapeHtml(String(e.cardLast4)) : ''}</span>`
            : '';
          html += `<div class="nb-card" data-type="${escapeHtml(e.type||'')}" data-id="${e.id}">
          <span class="nb-card-icon">${icon}</span>
          <div class="nb-card-body">
            <div class="nb-card-top">
              <span class="nb-card-title">${t.label}${personTxt}</span>
              <span class="nb-card-amount">${sign}${fmt(e.amount)} ت</span>
            </div>
            ${e.desc ? `<div class="nb-card-desc">${escapeHtml(e.desc)}</div>` : ''}
            <div class="nb-card-meta">
              ${e.time ? `<span class="nb-card-time">${e.time}</span>` : ''}
              ${cardChip}
              ${settled ? '<span class="nb-card-settled">تسویه شده</span>' : ''}
            </div>
          </div>
          <button type="button" class="del nb-card-del" data-id="${e.id}" aria-label="حذف">×</button>
        </div>`;
        });
        html += `</div></div>`;
      });
      el.innerHTML = html;
      // کلیک روی تاریخ → collapse/expand
      el.querySelectorAll('.nb-day-head').forEach(head=>{
        const toggle = ()=>{
          const group = head.closest('.nb-day-group');
          if(!group) return;
          const key = group.getAttribute('data-day') || '';
          const nowCollapsed = group.classList.toggle('is-collapsed');
          head.setAttribute('aria-expanded', nowCollapsed ? 'false' : 'true');
          if(typeof nbDayExpanded !== 'undefined'){
            if(nowCollapsed) nbDayExpanded.delete(key); else nbDayExpanded.add(key);
            try{ localStorage.setItem('nb-day-expanded', JSON.stringify([...nbDayExpanded])); }catch(e){}
          }
        };
        head.addEventListener('click', (e)=>{ e.preventDefault(); toggle(); });
        head.addEventListener('keydown', (e)=>{
          if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggle(); }
        });
      });
    }
    el.querySelectorAll('.del').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const entry = notebook.find(x=>String(x.id)===btn.dataset.id);
        showConfirmModal('حذف این تراکنش؟', entry ? `${NB_TYPES[entry.type].label} — ${fmt(entry.amount)} تومان` : '', ()=>{
          if(entry && entry.applied && (entry.type === 'deposit' || entry.type === 'payment')){
            const sign = (NB_TYPES[entry.type] && NB_TYPES[entry.type].sign) || 0;
            const amt = safeNum(entry.amount, 0);
            if(sign !== 0 && amt > 0){
              assets.card = safeNum(assets.card, 0) - (sign * amt);
              if(!Array.isArray(txs)) txs = [];
              txs.push({date: todayISO(), key:'card', delta: -(sign * amt), note: 'حذف ' + ((NB_TYPES[entry.type] && NB_TYPES[entry.type].label) || entry.type) + (entry.desc ? ' — ' + entry.desc : '')});
              if(typeof pushSeriesPoint === 'function') pushSeriesPoint();
            }
          }
          notebook = notebook.filter(x=>String(x.id)!==btn.dataset.id);
          fcEvents = fcEvents.filter(x=>String(x.id)!==btn.dataset.id);
          let ok = false;
          try{ ok = !!persist(); }catch(e){ console.error(e); }
          // به‌روزرسانی فوری تمام UI وابسته (داشبورد، دارایی، کارت، پیش‌بینی، …)
          try{
            if(typeof render === 'function') render();
            else {
              if(typeof renderNotebook === 'function') renderNotebook();
              if(typeof renderForecast === 'function') renderForecast();
              if(typeof renderBankCards === 'function') renderBankCards();
              if(typeof renderAssetCards === 'function') renderAssetCards();
            }
          }catch(e){ console.error(e); }
          showToast(ok ? 'تراکنش حذف شد' : 'حذف اعمال شد', !ok);
        });
      });
    });
  }

  // خلاصه دسته‌ها — فقط ماه جاری (+ قرض باز)
  const sums = {deposit:0, payment:0, lent:0, borrowed:0};
  visibleNb.forEach(e=>{
    if(!sums.hasOwnProperty(e.type)) return;
    if((e.type === 'lent' || e.type === 'borrowed') && e.settled) return;
    sums[e.type] += safeNum(e.amount, 0);
  });
  const sumKeys = ['deposit','payment','lent','borrowed'];
  if($('nbSummaryGrid')){
    $('nbSummaryGrid').innerHTML = sumKeys.map(k=>{
      const meta = NB_TYPES[k] || {label:k, color:'var(--ink-dim)'};
      return `<div class="nb-stat">
      <div class="lbl">${meta.label}</div>
      <div class="val" style="color:${meta.color}">${fmt(sums[k]||0)} ت</div>
    </div>`;
    }).join('');
  }

  const base = safeNum(assets.card, 0);
  const delta = typeof nbDelta === 'function' ? nbDelta() : 0;
  if($('nbBase')) $('nbBase').textContent = fmt(base) + ' ت';
  if($('nbDelta')) $('nbDelta').textContent = (delta>=0?'+':'') + fmt(delta) + ' ت';
  if($('nbResult')) $('nbResult').textContent = fmt(base + delta) + ' ت';
  try{ if(typeof renderForecast === 'function') renderForecast(); }catch(e){ console.error(e); }
}

document.querySelectorAll('#nbFilters .nb-filter').forEach(btn=>{
  btn.addEventListener('click', (e)=>{
    if(e) { e.preventDefault(); e.stopPropagation(); }
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    document.querySelectorAll('#nbFilters .nb-filter').forEach(b=>{ b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
    btn.classList.add('active'); btn.setAttribute('aria-selected','true');
    currentNbFilter = btn.dataset.nbfilter || btn.getAttribute('data-nbfilter') || 'all';
    renderNotebook();
    // جلوگیری از پرش اسکرول به بالا هنگام تعویض دسته
    try{ window.scrollTo(0, y); }catch(_e){}
    requestAnimationFrame(()=>{ try{ window.scrollTo(0, y); }catch(_e){} });
  });
});

/* ================= EVENTS ================= */




function clearNcForm(){
  if($('ncLabel')) $('ncLabel').value = '';
  if($('ncManualValue')) $('ncManualValue').value = '';
  if($('ncGoldGram')) $('ncGoldGram').value = '';
  if($('ncGoldSoot')) $('ncGoldSoot').value = '';
  if($('ncSilverGram')) $('ncSilverGram').value = '';
  if($('ncUsdAmount')) $('ncUsdAmount').value = '';
  if(typeof updateGoldSumUI === 'function') updateGoldSumUI();
}

if($('ncAddBtn')){
  $('ncAddBtn').addEventListener('click', ()=>{
    const category = $('ncCategory').value;
    const label = ($('ncLabel').value || '').trim();
    const manualValue = parseMoney($('ncManualValue').value);
    if(isNaN(manualValue) || manualValue < 0){ showToast('ارزش دفتری معتبر نیست', true); return; }
    const addGram = category === 'gold' ? parseDec($('ncGoldGram') && $('ncGoldGram').value) : 0;
    const addSoot = category === 'gold' ? parseDec($('ncGoldSoot') && $('ncGoldSoot').value) : 0;
    const addSilverG = category === 'silver' ? parseDec($('ncSilverGram') && $('ncSilverGram').value) : 0;
    const addUsd = category === 'usd' ? parseDec($('ncUsdAmount') && $('ncUsdAmount').value) : 0;
    // برای طلا/نقره/دلار یا مقدار واحد یا ارزش دفتری لازم است
    if(category === 'gold' && !(goldTotalGrams(addGram, addSoot) > 0) && !(manualValue > 0)){
      showToast('وزن طلا (گرم/سوت) یا ارزش دفتری را وارد کنید', true); return;
    }
    if(category === 'silver' && !(addSilverG > 0) && !(manualValue > 0)){
      showToast('گرم نقره یا ارزش دفتری را وارد کنید', true); return;
    }
    if(category === 'usd' && !(addUsd > 0) && !(manualValue > 0)){
      showToast('مقدار دلار یا ارزش دفتری را وارد کنید', true); return;
    }
    if(category !== 'gold' && category !== 'silver' && category !== 'usd' && !(manualValue > 0)){
      showToast('ارزش تومانی را وارد کنید', true); return;
    }
    const existing = noncash.find(x => x && x.category === category);
    if(existing){
      existing.manualValue = safeNum(existing.manualValue, 0) + (manualValue > 0 ? manualValue : 0);
      if(label) existing.label = label;
      if(category === 'gold'){
        existing.grams = safeNum(existing.grams, 0) + addGram;
        existing.soot = safeNum(existing.soot, 0) + addSoot;
        existing.totalGrams = goldTotalGrams(existing.grams, existing.soot);
      } else if(category === 'silver'){
        existing.grams = safeNum(existing.grams, 0) + addSilverG;
        existing.totalGrams = existing.grams;
      } else if(category === 'usd'){
        existing.usdAmount = safeNum(existing.usdAmount, 0) + addUsd;
      }
      existing.updatedAt = todayISO();
      if(persist()){
        clearNcForm();
        showToast('به موجودی قبلی همان دسته اضافه شد');
        renderNonCash();
      } else {
        showToast('ذخیره ناموفق — دوباره تلاش کنید', true);
      }
    } else {
      const row = { id: Date.now(), category, label, manualValue: manualValue > 0 ? manualValue : 0, updatedAt: todayISO() };
      if(category === 'gold'){
        row.grams = addGram;
        row.soot = addSoot;
        row.totalGrams = goldTotalGrams(addGram, addSoot);
      } else if(category === 'silver'){
        row.grams = addSilverG;
        row.totalGrams = addSilverG;
      } else if(category === 'usd'){
        row.usdAmount = addUsd;
      }
      noncash.push(row);
      if(persist()){
        clearNcForm();
        showToast('دارایی غیرنقد جدید اضافه شد');
        renderNonCash();
      } else {
        showToast('ذخیره ناموفق — دوباره تلاش کنید', true);
      }
    }
  });
}
if($('ncCategory')){
  $('ncCategory').addEventListener('change', updateGoldSumUI);
  updateGoldSumUI();
}
if($('ncGoldGram')) $('ncGoldGram').addEventListener('input', updateGoldSumUI);
if($('ncGoldSoot')) $('ncGoldSoot').addEventListener('input', updateGoldSumUI);

/* --- Event: Snapp profit submit --- */
if($('addLogBtn')) $('addLogBtn').addEventListener('click', ()=>{
  const date = selectedLogDateISO();
  const profit = parseMoney($('logProfit') && $('logProfit').value);
  if(!date || isNaN(profit) || profit<=0){ showToast('تاریخ و سود را به‌درستی وارد کنید', true); return; }
  if(!Array.isArray(logs)) logs = [];
  if(!Array.isArray(txs)) txs = [];
  if(!assets || typeof assets !== 'object') assets = {};
  const balanceBefore = safeNum(assets.snapp, 0);
  logs.push({date, profit, balanceBefore});
  assets.snapp = balanceBefore + profit;
  txs.push({date, key:'snapp', delta: profit, note: 'سود روزانه اسنپ'});
  if(typeof pushSeriesPoint === 'function') pushSeriesPoint();
  if(typeof checkMilestones === 'function') checkMilestones('snapp', balanceBefore, assets.snapp);
  let ok = false;
  try{ ok = !!persist(); }catch(e){ console.error(e); }
  if(!ok){
    try{ localStorage.setItem(STORE_KEY, JSON.stringify(getStatePayload())); ok = true; }catch(e2){ console.error(e2); }
  }
  if($('logProfit')) $('logProfit').value = '';
  showToast(ok ? 'سود ثبت شد' : 'سود اعمال شد (ذخیره پایدار ناموفق)', !ok);
  // فوراً UI و محاسبات را به‌روز کن
  try{ if(typeof render === 'function') render(); }catch(e){ console.error(e); }
});

/* ---- کارت‌های بانکی (فقط بخش تراکنش‌ها) ---- */
function normalizeBcLast4(v){
  return String(v == null ? '' : v).replace(/\D/g, '').slice(-4);
}

/* --- Bank cards: default, balance display, carousel --- */
function ensureDefaultBankCard(){
  if(!Array.isArray(bankCards)) bankCards = [];
  if(!bankCards.length){ window.defaultBankCardId = null; return null; }
  let defs = bankCards.filter(c => c && c.isDefault);
  if(defs.length > 1){
    defs.slice(1).forEach(c => { c.isDefault = false; });
    defs = [defs[0]];
  }
  if(!defs.length){
    bankCards[0].isDefault = true;
    defs = [bankCards[0]];
  }
  window.defaultBankCardId = defs[0].id;
  return defs[0];
}
function isDefaultBankCard(cardOrId){
  if(cardOrId == null) return false;
  const id = (typeof cardOrId === 'object') ? cardOrId.id : cardOrId;
  const c = findBankCard(id);
  if(!c) return false;
  return !!(c.isDefault || String(c.id) === String(window.defaultBankCardId || ''));
}
function getBankCardDisplayBalance(card){
  if(!card) return 0;
  if(isDefaultBankCard(card)) return safeNum(assets && assets.card, 0);
  return safeNum(card.balance, 0);
}
function setDefaultBankCard(id){
  if(!Array.isArray(bankCards)) return;
  const target = findBankCard(id);
  if(!target){ showToast('کارت پیدا نشد', true); return; }
  bankCards.forEach(c => { c.isDefault = String(c.id) === String(id); });
  window.defaultBankCardId = target.id;
  // محاسبات اصلی همچنان assets.card — بدون جابه‌جایی موجودی
  if(persist()){ showToast('کارت پیش‌فرض تنظیم شد'); renderBankCards(); if(typeof renderNotebook==='function') renderNotebook(); }
  else { showToast('کارت پیش‌فرض تنظیم شد'); renderBankCards(); }
}

function findBankCard(id){
  if(id == null || id === '') return null;
  return (bankCards || []).find(c => String(c.id) === String(id)) || null;
}
function snapshotBankCard(card){
  if(!card) return null;
  return {
    cardId: card.id,
    cardName: String(card.name || '').slice(0, 40),
    cardLast4: normalizeBcLast4(card.last4),
    cardColor: String(card.color || BC_COLORS[0])
  };
}
function openBcForm(card){
  const form = document.getElementById('bcForm');
  if(!form) return;
  form.classList.add('open');
  form.style.display = 'block';
  form.setAttribute('aria-hidden', 'false');
  if(card){
    const eid = document.getElementById('bcEditId'); if(eid) eid.value = String(card.id);
    const ft = document.getElementById('bcFormTitle'); if(ft) ft.textContent = 'ویرایش کارت';
    const nm = document.getElementById('bcName'); if(nm) nm.value = card.name || '';
    const l4 = document.getElementById('bcLast4'); if(l4) l4.value = normalizeBcLast4(card.last4);
    _bcSelectedColor = card.color || BC_COLORS[0];
  } else {
    const eid = document.getElementById('bcEditId'); if(eid) eid.value = '';
    const ft = document.getElementById('bcFormTitle'); if(ft) ft.textContent = 'کارت جدید';
    const nm = document.getElementById('bcName'); if(nm) nm.value = '';
    const l4 = document.getElementById('bcLast4'); if(l4) l4.value = '';
    _bcSelectedColor = BC_COLORS[0];
  }
  if(typeof renderBcColorRow === 'function') renderBcColorRow();
  const isDef = card ? (typeof isDefaultBankCard === 'function' && isDefaultBankCard(card)) : (!(bankCards||[]).length);
  if($('bcIsDefault')) $('bcIsDefault').checked = !!isDef;
  if($('bcBalance')){
    if(card && !isDef){
      const b = safeNum(card.balance, 0);
      $('bcBalance').value = b ? Number(b).toLocaleString('en-US') : '';
    } else if(card && isDef){
      const b = safeNum(assets && assets.card, 0);
      $('bcBalance').value = b ? Number(b).toLocaleString('en-US') : '';
    } else {
      $('bcBalance').value = '';
    }
  }
  if($('bcBalanceWrap')) $('bcBalanceWrap').style.opacity = isDef ? '0.75' : '1';
  try{ form.scrollIntoView({behavior:'smooth', block:'nearest'}); }catch(e){}
}
function closeBcForm(){
  const form = document.getElementById('bcForm');
  if(!form) return;
  form.classList.remove('open');
  form.style.display = 'none';
  form.setAttribute('aria-hidden', 'true');
  const eid = document.getElementById('bcEditId'); if(eid) eid.value = '';
}
function renderBcColorRow(){
  const row = $('bcColorRow');
  if(!row) return;
  row.innerHTML = BC_COLORS.map(c => {
    const active = c === _bcSelectedColor ? ' active' : '';
    return `<button type="button" class="bc-color-swatch${active}" data-bc-color="${c}" style="background:${c}" aria-label="رنگ"></button>`;
  }).join('');
}
function fillNbCardSelect(){
  const sel = $('nbCardSelect');
  if(!sel) return;
  const prev = sel.value;
  const list = Array.isArray(bankCards) ? bankCards : [];
  sel.innerHTML = '<option value="">بدون کارت</option>' + list.map(c => {
    const last = normalizeBcLast4(c.last4);
    const label = escapeHtml(c.name || 'کارت') + (last ? ' · •••• ' + last : '');
    return `<option value="${c.id}">${label}</option>`;
  }).join('');
  if(prev && list.some(c => String(c.id) === String(prev))) sel.value = prev;
}
function updateNbCardVisibility(){
  try{
    const type = ($('nbType') && $('nbType').value) || '';
    const show = (type === 'payment' || type === 'deposit' || type === 'transfer');
    if($('nbCardWrap')) $('nbCardWrap').style.display = show ? 'block' : 'none';
  }catch(e){}
}
/** 3D tilt + glare فقط روی دسکتاپ — موبایل کاملاً غیرفعال */
function bindBcTilt(car){
  if(!car || car._bcTiltBound) return;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const maxTilt = 7; // درجه — نرم و حرفه‌ای
  function canTilt(){ return fine.matches && !reduce.matches && !car.classList.contains('is-dragging'); }
  car.addEventListener('pointermove', (e)=>{
    if(e.pointerType === 'touch' || e.pointerType === 'pen') return;
    if(!canTilt()) return;
    const slide = e.target.closest && e.target.closest('.bc-slide');
    if(!slide || !car.contains(slide)) return;
    const r = slide.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const ry = (px - 0.5) * 2 * maxTilt;
    const rx = (0.5 - py) * 2 * maxTilt;
    slide.style.setProperty('--tilt-x', rx.toFixed(2) + 'deg');
    slide.style.setProperty('--tilt-y', ry.toFixed(2) + 'deg');
    slide.style.setProperty('--glare-x', (px * 100).toFixed(1) + '%');
    slide.style.setProperty('--glare-y', (py * 100).toFixed(1) + '%');
  });
  car.addEventListener('pointerleave', ()=>{
    car.querySelectorAll('.bc-slide').forEach(s=>{
      s.style.setProperty('--tilt-x', '0deg');
      s.style.setProperty('--tilt-y', '0deg');
    });
  });
  // وقتی از روی یک کارت خارج می‌شویم
  car.addEventListener('pointerout', (e)=>{
    const slide = e.target.closest && e.target.closest('.bc-slide');
    if(!slide) return;
    const to = e.relatedTarget;
    if(to && slide.contains(to)) return;
    slide.style.setProperty('--tilt-x', '0deg');
    slide.style.setProperty('--tilt-y', '0deg');
  });
  car._bcTiltBound = true;
}
function bcMonogram(name){
  const clean = String(name || '').trim().replace(/^کارت\s+/, '');
  return clean ? clean.charAt(0).toUpperCase() : '؟';
}
function bcPatternKey(card){
  const s = String((card && (card.id != null ? card.id : card.name)) || '');
  let h = 0;
  for(let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const patterns = ['p0', 'p1', 'p2', 'none'];
  return patterns[h % patterns.length];
}
function renderBankCards(){
  const car = $('bcCarousel');
  const nav = $('bcNav');
  const dots = $('bcDots');
  if(!car) return;
  if(!Array.isArray(bankCards)) bankCards = [];
  fillNbCardSelect();
  updateNbCardVisibility();
  if(bankCards.length === 0){
    car.innerHTML = '<div class="bc-empty" style="flex:1 1 100%">هنوز کارتی ثبت نشده است. با «افزودن کارت» شروع کنید.</div>';
    if(nav) nav.style.display = 'none';
    return;
  }
  ensureDefaultBankCard();
  car.innerHTML = bankCards.map(c => {
    const last = normalizeBcLast4(c.last4);
    const color = c.color || BC_COLORS[0];
    const monogram = escapeHtml(bcMonogram(c.name));
    const bankName = escapeHtml(c.name || 'کارت');
    const pattern = bcPatternKey(c);
    const isDef = isDefaultBankCard(c);
    const balStr = fmt(getBankCardDisplayBalance(c));
    const defBadge = isDef
      ? `<span class="bc-default-icon" title="کارت پیش‌فرض" aria-label="کارت پیش‌فرض"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2.5l2.9 6.1 6.7.7-5 4.6 1.4 6.6L12 17.8 6 20.5l1.4-6.6-5-4.6 6.7-.7L12 2.5z"/></svg></span>`
      : '';
    const defBtn = isDef ? '' : `<button type="button" class="bc-icon-btn" data-bc-default="${c.id}" title="تنظیم به‌عنوان پیش‌فرض" aria-label="تنظیم به‌عنوان پیش‌فرض"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.2 6.6H21l-5.4 4 2.1 6.5L12 16.6 6.3 20l2.1-6.5L3 9.6h6.8L12 3z"/></svg></button>`;
    return `<article class="bc-slide${isDef ? ' is-default' : ''}" data-bc-id="${c.id}" data-bc-pattern="${pattern}" style="--bc-accent:${color}">
      <span class="bc-orb bc-orb-1" aria-hidden="true"></span>
      <span class="bc-orb bc-orb-2" aria-hidden="true"></span>
      <span class="bc-orb bc-orb-3" aria-hidden="true"></span>
      <span class="bc-rings" aria-hidden="true"></span>
      <span class="bc-glare" aria-hidden="true"></span>
      <div class="bc-slide-top">
        <div class="bc-issuer">
          <span class="bc-issuer-badge" aria-hidden="true">${monogram}</span>
          <div class="bc-issuer-meta">
            <span class="bc-issuer-name">${bankName}</span>
            <span class="bc-issuer-sub">کارت بانکی</span>
          </div>
        </div>
        <div class="bc-slide-actions">
          ${defBadge}${defBtn}
          <button type="button" class="bc-icon-btn" data-bc-edit="${c.id}" title="ویرایش" aria-label="ویرایش">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
          </button>
          <button type="button" class="bc-icon-btn" data-bc-del="${c.id}" title="حذف" aria-label="حذف">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
      </div>
      <div class="bc-slide-chip-row">
        <span class="bc-chip" aria-hidden="true"></span>
        <span class="bc-nfc" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M8.5 8.5a5 5 0 0 1 0 7"/><path d="M11.5 5.5a9 9 0 0 1 0 13"/><path d="M14.5 2.5a13 13 0 0 1 0 19"/></svg>
        </span>
      </div>
      <div class="bc-balance">
        <div class="bc-balance-label">موجودی</div>
        <div class="bc-balance-amt"><span class="bc-balance-num">${balStr}</span><span class="bc-balance-unit">تومان</span></div>
      </div>
      <div class="bc-slide-bottom">
        <div class="bc-holder">
          <span class="bc-holder-label">صاحب کارت</span>
          <span class="bc-holder-name">${bankName}</span>
        </div>
        <div class="bc-last4">
          <span class="bc-last4-label">۴ رقم آخر</span>
          <span class="bc-last4-num">•••• ${last || '----'}</span>
        </div>
      </div>
    </article>`;
  }).join('');
  if(nav) nav.style.display = bankCards.length > 1 ? 'flex' : 'none';
  if(dots){
    dots.innerHTML = bankCards.map((_, i) => `<span class="bc-dot${i === _bcSlideIndex ? ' active' : ''}" data-bc-dot="${i}"></span>`).join('');
  }
  // 3D tilt فقط دسکتاپ (pointer fine)
  if(typeof bindBcTilt === 'function') bindBcTilt(car);

  function bcSnapToIndex(carEl, index, smooth){
    const slides = carEl.querySelectorAll('.bc-slide');
    if(!slides.length) return;
    const i = Math.max(0, Math.min(index|0, slides.length - 1));
    _bcSlideIndex = i;
    const slide = slides[i];
    const left = slide.offsetLeft - (carEl.clientWidth - slide.offsetWidth) / 2;
    const target = Math.max(0, left);
    try{
      if(smooth) carEl.scrollTo({left: target, behavior: 'smooth'});
      else carEl.scrollLeft = target;
    }catch(_e){ try{ carEl.scrollLeft = target; }catch(__e){} }
    const dotsEl = $('bcDots');
    if(dotsEl){
      dotsEl.querySelectorAll('.bc-dot').forEach((d, di)=> d.classList.toggle('active', di === i));
    }
  }
  function bcNearestIndex(carEl){
    const slides = carEl.querySelectorAll('.bc-slide');
    if(!slides.length) return 0;
    const mid = carEl.scrollLeft + carEl.clientWidth / 2;
    let best = 0, bestDist = Infinity;
    slides.forEach((s, i)=>{
      const center = s.offsetLeft + s.offsetWidth / 2;
      const d = Math.abs(center - mid);
      if(d < bestDist){ bestDist = d; best = i; }
    });
    return best;
  }

  if(!car._bcBound){
    car._bcBound = true;
    car.addEventListener('click', (e)=>{
      if(car._bcDidDrag){ e.preventDefault(); e.stopPropagation(); return; }
      const editBtn = e.target.closest && e.target.closest('[data-bc-edit]');
      if(editBtn){
        const card = findBankCard(editBtn.getAttribute('data-bc-edit'));
        if(card) openBcForm(card);
        return;
      }
      const delBtn = e.target.closest && e.target.closest('[data-bc-del]');
      if(delBtn){
        const id = delBtn.getAttribute('data-bc-del');
        const card = findBankCard(id);
        showConfirmModal(
          'حذف این کارت؟',
          card ? ((card.name || 'کارت') + (card.last4 ? ' · •••• ' + normalizeBcLast4(card.last4) : '')) : '',
          ()=>{
            const wasDefault = card && (card.isDefault || String(card.id) === String(window.defaultBankCardId || ''));
            bankCards = (bankCards || []).filter(c => String(c.id) !== String(id));
            if(wasDefault && bankCards.length){
              bankCards[0].isDefault = true;
              window.defaultBankCardId = bankCards[0].id;
              // موجودی اصلی بدون تغییر می‌ماند
            } else if(!bankCards.length){
              window.defaultBankCardId = null;
            }
            if(_bcSlideIndex >= bankCards.length) _bcSlideIndex = Math.max(0, bankCards.length - 1);
            if(persist()){ showToast('کارت حذف شد'); renderBankCards(); }
          }
        );
        return;
      }
      const defBtn = e.target.closest && e.target.closest('[data-bc-default]');
      if(defBtn){
        e.preventDefault(); e.stopPropagation();
        const id = defBtn.getAttribute('data-bc-default');
        if(typeof setDefaultBankCard === 'function') setDefaultBankCard(id);
        return;
      }
      const dot = e.target.closest && e.target.closest('[data-bc-dot]');
      if(dot && car.contains(dot) === false){
        // dots are outside carousel sometimes
      }
    });
    // dots click (nav is sibling)
    document.addEventListener('click', (e)=>{
      const dot = e.target.closest && e.target.closest('#bcDots [data-bc-dot]');
      if(!dot) return;
      const i = parseInt(dot.getAttribute('data-bc-dot'), 10);
      if(!isFinite(i)) return;
      const carEl = $('bcCarousel');
      if(carEl) bcSnapToIndex(carEl, i, true);
    });

    // Drag/swipe — pointer events, RTL-safe (carousel direction:ltr)
    let ptr = null;
    car.addEventListener('pointerdown', (e)=>{
      if(e.button != null && e.button !== 0) return;
      if(e.target.closest && (e.target.closest('button') || e.target.closest('a') || e.target.closest('input'))) return;
      ptr = {id: e.pointerId, x: e.clientX, scroll: car.scrollLeft, moved: false};
      car._bcDidDrag = false;
      try{ car.setPointerCapture(e.pointerId); }catch(_e){}
      car.classList.add('is-dragging');
    });
    car.addEventListener('pointermove', (e)=>{
      if(!ptr || e.pointerId !== ptr.id) return;
      const dx = e.clientX - ptr.x;
      if(Math.abs(dx) > 6){
        ptr.moved = true;
        car._bcDidDrag = true;
      }
      if(ptr.moved){
        car.scrollLeft = ptr.scroll - dx;
      }
    });
    const endPtr = (e)=>{
      if(!ptr || (e && e.pointerId !== ptr.id)) return;
      const moved = ptr.moved;
      ptr = null;
      car.classList.remove('is-dragging');
      try{ if(e) car.releasePointerCapture(e.pointerId); }catch(_e){}
      if(moved){
        const best = bcNearestIndex(car);
        bcSnapToIndex(car, best, true);
        setTimeout(()=>{ car._bcDidDrag = false; }, 120);
      } else {
        car._bcDidDrag = false;
      }
    };
    car.addEventListener('pointerup', endPtr);
    car.addEventListener('pointercancel', endPtr);
    car.addEventListener('lostpointercapture', endPtr);
  }

  // فقط در صورت نیاز اسکرول کن (جلوگیری از پرش هنگام re-render)
  requestAnimationFrame(()=>{
    const slides = car.querySelectorAll('.bc-slide');
    if(!slides.length) return;
    if(_bcSlideIndex >= slides.length) _bcSlideIndex = slides.length - 1;
    const slide = slides[_bcSlideIndex];
    if(!slide) return;
    const left = slide.offsetLeft - (car.clientWidth - slide.offsetWidth) / 2;
    const target = Math.max(0, left);
    if(Math.abs(car.scrollLeft - target) > 8){
      try{ car.scrollLeft = target; }catch(_e){}
    }
  });

}

// Event delegation — پایدار حتی اگر عناصر بعداً در DOM ظاهر شوند
document.addEventListener('click', (e)=>{
  const t = e.target;
  if(!t || !t.closest) return;
  if(t.closest('#bcAddOpenBtn')){ e.preventDefault(); openBcForm(null); return; }
  if(t.closest('#bcCancelBtn')){ e.preventDefault(); closeBcForm(); return; }
  const sw = t.closest('[data-bc-color]');
  if(sw && sw.closest('#bcColorRow')){
    e.preventDefault();
    _bcSelectedColor = sw.getAttribute('data-bc-color') || BC_COLORS[0];
    renderBcColorRow();
    return;
  }
  if(t.closest('#bcSaveBtn')){
    e.preventDefault();
    const name = ((document.getElementById('bcName') && document.getElementById('bcName').value) || '').trim();
    const last4 = normalizeBcLast4(document.getElementById('bcLast4') && document.getElementById('bcLast4').value);
    if(!name){ showToast('نام کارت را وارد کنید', true); return; }
    if(last4.length !== 4){ showToast('۴ رقم آخر کارت را وارد کنید', true); return; }
    const editId = ((document.getElementById('bcEditId') && document.getElementById('bcEditId').value) || '').trim();
    if(!Array.isArray(bankCards)) bankCards = [];
    const makeDefault = !!( $('bcIsDefault') && $('bcIsDefault').checked );
    const balInput = parseMoney(($('bcBalance') && $('bcBalance').value) || '');
    const balVal = (isFinite(balInput) && !isNaN(balInput) && balInput >= 0) ? balInput : 0;
    if(editId){
      const card = findBankCard(editId);
      if(!card){ showToast('کارت پیدا نشد', true); return; }
      card.name = name.slice(0, 40);
      card.last4 = last4;
      card.color = _bcSelectedColor || BC_COLORS[0];
      if(makeDefault){
        bankCards.forEach(c => { c.isDefault = String(c.id) === String(card.id); });
        window.defaultBankCardId = card.id;
        // موجودی اصلی سیستم تغییر نمی‌کند مگر کاربر در UI دارایی‌ها تغییر دهد
      } else {
        card.isDefault = false;
        card.balance = balVal;
        if(!(bankCards || []).some(c => c.isDefault) && bankCards.length){
          const other = bankCards.find(c => String(c.id) !== String(card.id));
          if(other){ other.isDefault = true; window.defaultBankCardId = other.id; }
          else { card.isDefault = true; window.defaultBankCardId = card.id; }
        }
      }
    } else {
      const newId = Date.now() + Math.floor(Math.random() * 1000);
      const isFirst = !(bankCards || []).length;
      bankCards.push({
        id: newId,
        name: name.slice(0, 40),
        last4,
        color: _bcSelectedColor || BC_COLORS[0],
        balance: (makeDefault || isFirst) ? 0 : balVal,
        isDefault: makeDefault || isFirst
      });
      if(makeDefault || isFirst){
        bankCards.forEach(c => { c.isDefault = String(c.id) === String(newId); });
        window.defaultBankCardId = newId;
      }
      _bcSlideIndex = bankCards.length - 1;
    }
    ensureDefaultBankCard();
    const saved = typeof persist === 'function' ? persist() : true;
    showToast(editId ? (saved ? 'کارت به‌روز شد' : 'کارت به‌روز شد (ذخیره پایدار بعداً)') : (saved ? 'کارت اضافه شد' : 'کارت اضافه شد (ذخیره پایدار بعداً)'));
    closeBcForm();
    renderBankCards();
  }
});
document.addEventListener('input', (e)=>{
  if(e.target && e.target.id === 'bcLast4'){
    e.target.value = normalizeBcLast4(e.target.value);
  }
});

/* --- Event: notebook form / filters --- */
/* ---- تراکنش‌ها ---- */
function updateNbPersonVisibility(){
  try{
    const type = ($('nbType') && $('nbType').value) || '';
    const needsPerson = (type === 'lent' || type === 'borrowed');
    if($('nbPersonWrap')) $('nbPersonWrap').style.display = needsPerson ? 'block' : 'none';
    updateNbCardVisibility();
  }catch(e){}
}
if($('nbType')){
  $('nbType').addEventListener('change', updateNbPersonVisibility);
  updateNbPersonVisibility();
}

if($('nbAddBtn')) $('nbAddBtn').addEventListener('click', (ev)=>{
  try{
    if(ev){ ev.preventDefault(); ev.stopPropagation(); }
    const type = ($('nbType') && $('nbType').value) || 'payment';
    if(!NB_TYPES[type]){ showToast('نوع تراکنش نامعتبر است', true); return; }
    const person = ($('nbPerson') && $('nbPerson').value || '').trim();
    const amount = parseMoney($('nbAmount') && $('nbAmount').value);
    const time = ($('nbTime') && $('nbTime').value) || todayDate().toTimeString().slice(0,5);
    let date = getJalaliPickerISO('nbDateDay','nbDateMonth','nbDateYear');
    if(!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) date = todayISO();
    const desc = ($('nbDesc') && $('nbDesc').value || '').trim();
    const needsPerson = (type === 'lent' || type === 'borrowed');

    if(isNaN(amount) || amount <= 0){ showToast('مبلغ معتبر وارد کنید', true); return; }
    if(needsPerson && !person){ showToast('برای قرض، نام شخص را وارد کنید', true); return; }

    const entryId = Date.now() + Math.floor(Math.random()*1000);
    const entry = {
      id: entryId, type, amount, time, date, desc,
      person: needsPerson ? person : '',
      applied: false,
    };
    if(type === 'lent' || type === 'borrowed'){
      entry.settled = false;
      entry.settledDate = null;
      entry.paidAmount = 0;
    }
    // اسنپ‌شات کارت در لحظهٔ ثبت — ویرایش/حذف بعدی کارت این تراکنش را عوض نمی‌کند
    if(type === 'payment' || type === 'deposit' || type === 'transfer'){
      const cardId = ($('nbCardSelect') && $('nbCardSelect').value) || '';
      const card = findBankCard(cardId);
      const snap = snapshotBankCard(card);
      if(snap){
        entry.cardId = snap.cardId;
        entry.cardName = snap.cardName;
        entry.cardLast4 = snap.cardLast4;
        entry.cardColor = snap.cardColor;
      }
    }
    if(!Array.isArray(notebook)) notebook = [];
    // دریافتی: بلافاصله روی موجودی کارت اعمال شود (یک‌بار، با پرچم applied)
    if(type === 'deposit'){
      const amt = safeNum(amount, 0);
      assets.card = safeNum(assets.card, 0) + amt;
      entry.applied = true;
      if(!Array.isArray(txs)) txs = [];
      txs.push({date: date || todayISO(), key:'card', delta: amt, note: 'دریافتی' + (desc ? ' — ' + desc : '')});
      if(typeof pushSeriesPoint === 'function') pushSeriesPoint();
    }
    notebook.push(entry);
    if(type === 'payment' || type === 'deposit'){
      if(!Array.isArray(fcEvents)) fcEvents = [];
      fcEvents.push({id: entryId, type, amount, date, time});
    }
    // همیشه UI را به‌روز کن — حتی اگر persist به‌خاطر رمز/قفل false شود
    if($('nbAmount')) $('nbAmount').value = '';
    if($('nbPerson')) $('nbPerson').value = '';
    if($('nbDesc')) $('nbDesc').value = '';
    const saved = persist();
    showToast(saved ? 'تراکنش ثبت شد' : 'تراکنش ثبت شد (ذخیره پایدار ناموفق)', !saved);
    if(typeof renderNotebook === 'function') renderNotebook();
    else if(typeof render === 'function') render();
    if(typeof renderForecast === 'function') renderForecast();
  }catch(err){
    console.error('nbAdd', err);
    showToast('خطا در ثبت تراکنش: ' + (err && err.message ? err.message : err), true);
  }
});

$('snapshotBtn').addEventListener('click', ()=>{
  const date = todayISO();
  history = history.filter(h=>h.date !== date);
  history.push({date, total: computeTotal()});
  if(persist()){ showToast('نقطه امروز ثبت شد'); render(); }
});

$('exportBtn').addEventListener('click', async ()=>{
  try{
    const body = await buildBackupBlob();
    const encrypted = !!(sessionCryptoKey && loadPinRecord());
    const blob = new Blob([body], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'daftar-mali-backup-' + todayISO() + (encrypted ? '-enc' : '') + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast(encrypted ? 'پشتیبان رمزشده دانلود شد' : 'پشتیبان بدون رمز دانلود شد');
  }catch(err){ showToast('خطا در ساخت پشتیبان', true); }
});
$('importBtn').addEventListener('click', ()=> $('importFile').click());
$('importFile').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = async (ev)=>{
    try{
      const parsed = await parseBackupText(ev.target.result);
      let d;
      if(parsed.encrypted){
        let pin = ($('pinCurrent') && $('pinCurrent').value) || '';
        if(!pin) pin = window.prompt('پشتیبان رمز شده است. رمز عبور را وارد کنید:') || '';
        if(!pin){ showToast('برای بازگردانی رمزدار، رمز لازم است', true); e.target.value=''; return; }
        try{ d = await decryptEnvelope(parsed.env, pin); }
        catch(err){ showToast('رمز اشتباه یا فایل آسیب‌دیده', true); e.target.value=''; return; }
      } else {
        d = parsed.data;
      }
      // بازگردانی کامل و تمیز — بدون مخلوط شدن با state قبلی
      if(d.assets && typeof d.assets === 'object'){
        assets = Object.assign({}, assets, d.assets);
        // نرمال‌سازی مبالغ دارایی
        Object.keys(assets).forEach(k=>{ assets[k] = safeNum(assets[k], 0); });
      }
      logs = Array.isArray(d.logs) ? d.logs : [];
      txs = Array.isArray(d.txs) ? d.txs : [];
      history = Array.isArray(d.history) ? d.history : [];
      noncash = Array.isArray(d.noncash) ? d.noncash : [];
      netSeries = Array.isArray(d.netSeries) ? d.netSeries : [];
      notebook = Array.isArray(d.notebook) ? d.notebook : [];
      // fcEvents: فقط پرداخت/دریافتی معتبر با مبلغ و تاریخ
      fcEvents = Array.isArray(d.fcEvents) ? d.fcEvents.filter(e =>
        e && (e.type === 'payment' || e.type === 'deposit') &&
        safeNum(e.amount) > 0 && e.date
      ).map(e => ({
        id: e.id, type: e.type, amount: safeNum(e.amount), date: String(e.date).slice(0,10), time: e.time || ''
      })) : [];
      fcSnapshots = Array.isArray(d.fcSnapshots) ? d.fcSnapshots : [];
      milestonesClaimed = (d.milestonesClaimed && typeof d.milestonesClaimed === 'object') ? d.milestonesClaimed : {};
      notes = Array.isArray(d.notes) ? d.notes : [];
      financialGoals = Array.isArray(d.financialGoals) ? d.financialGoals.map(g => ({
        id: g.id,
        title: String(g.title || '').slice(0, 80),
        targetAmount: Math.max(0, safeNum(g.targetAmount, 0)),
        deadline: g.deadline ? String(g.deadline).slice(0, 10) : null,
        createdAt: g.createdAt || Date.now(),
        updatedAt: g.updatedAt || Date.now()
      })) : [];
      bankCards = Array.isArray(d.bankCards) ? d.bankCards.filter(c => c && c.id != null).map(c => ({
        id: c.id,
        name: String(c.name || '').slice(0, 40),
        last4: String(c.last4 || '').replace(/\D/g, '').slice(-4),
        color: String(c.color || BC_COLORS[0]),
        balance: safeNum(c.balance, 0),
        isDefault: !!c.isDefault
      })) : [];
      if(typeof ensureDefaultBankCard === 'function') ensureDefaultBankCard();
      if(d.assetDefs && d.assetDefs.length) ASSET_DEFS = d.assetDefs;
      ensureCoreAssets();
      initMilestonesBaseline();
      if(typeof ensureNotebookMonth === 'function') ensureNotebookMonth();
      persist();
      render();
      if(typeof renderForecast === 'function') renderForecast();
      showToast('بازگردانی شد');
      e.target.value = '';
    }catch(err){ showToast('فایل نامعتبر است', true); }
  };
  reader.readAsText(file);
});



/* ================= TRANSFER ================= */
$('tfBtn').addEventListener('click', ()=>{
  const fromKey = $('tfFrom').value;
  const toKey = $('tfTo').value;
  const amount = parseMoney($('tfAmount').value);
  if(!fromKey || !toKey){ showToast('مبدأ و مقصد را انتخاب کنید', true); return; }
  if(fromKey === toKey){ showToast('مبدأ و مقصد نباید یکی باشند', true); return; }
  if(isNaN(amount) || amount <= 0){ showToast('مبلغ معتبر وارد کنید', true); return; }
  const fromBal = safeNum(assets[fromKey], 0);
  if(amount > fromBal){ showToast('موجودی مبدأ کافی نیست', true); return; }
  const fromDef = ASSET_DEFS.find(d => d.key === fromKey);
  const toDef = ASSET_DEFS.find(d => d.key === toKey);
  const fromName = fromDef ? fromDef.name : fromKey;
  const toName = toDef ? toDef.name : toKey;

  const prevFrom = fromBal;
  const prevTo = safeNum(assets[toKey], 0);
  assets[fromKey] = prevFrom - amount;
  assets[toKey] = prevTo + amount;

  const note = `انتقال از ${fromName} به ${toName}`;
  txs.push({date: todayISO(), key: fromKey, delta: -amount, note});
  txs.push({date: todayISO(), key: toKey, delta: amount, note});

  const entryId = Date.now();
  notebook.push({
    id: entryId,
    type: 'transfer',
    amount,
    time: todayDate().toTimeString().slice(0,5),
    date: todayISO(),
    desc: note,
    person: '',
    fromKey, toKey,
  });

  pushSeriesPoint();
  checkMilestones(toKey, prevTo, assets[toKey]);
  if(persist()){
    $('tfAmount').value = '';
    showToast(`${fmt(amount)} از ${fromName} به ${toName} منتقل شد`);
    render();
  } else {
    showToast('انتقال ناموفق — ذخیره انجام نشد', true);
  }
});

/* ================= NEW ASSET ================= */
const NEW_ASSET_PALETTE = ['#f472b6','#fb923c','#4ade80','#38bdf8','#c084fc','#f87171','#2dd4bf'];
$('newAssetBtn').addEventListener('click', ()=>{
  const name = $('newAssetName').value.trim();
  const cat = $('newAssetCat').value;
  const amount = parseMoney($('newAssetAmount').value) || 0;
  if(!name){ showToast('نامی برای دارایی وارد کنید', true); return; }
  if(ASSET_DEFS.some(d=>d.name === name)){ showToast('دارایی‌ای با همین نام از قبل وجود دارد', true); return; }
  const key = 'custom_' + Date.now();
  const color = NEW_ASSET_PALETTE[ASSET_DEFS.length % NEW_ASSET_PALETTE.length];
  ASSET_DEFS.push({key, name, cat, color});
  assets[key] = amount;
  if(amount > 0) txs.push({date: todayISO(), key, delta: amount, note: name + ' (دارایی جدید)'});
  pushSeriesPoint();
  // دارایی جدید: baseline بدون جشن (موجودی اولیه را عبور‌کرده حساب کن)
  if(cat === 'سرمایه‌گذاری'){
    buildRoundMilestones(amount).forEach(m => { if(m <= amount) claimMilestone(key, m); });
  }
  if(persist()){
    $('newAssetName').value=''; $('newAssetAmount').value='';
    showToast(`دارایی «${name}» اضافه شد`);
    render();
  } else {
    showToast('ذخیره ناموفق — دوباره تلاش کنید', true);
  }
});



/* ================= NOTES (دفترچه یادداشت) ================= */
