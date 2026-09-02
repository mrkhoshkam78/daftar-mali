/* ==========================================================================
   app-notes.js — دفترچه یادداشت (state UI، فیلتر، تقویم، مودال، Markdown)
   وابستگی: بعد از app-core.js و app-ui.js | قبل از app-boot.js
   نام‌های عمومی (renderNotes, openNoteEditor, notes, …) و رفتار حفظ شوند.
   ========================================================================== */

/* --- Constants & UI state --- */
const NOTE_CATS = [
  {id:'daily',   label:'روزمره',  color:'#60a5fa'},
  {id:'idea',    label:'ایده',    color:'#a78bfa'},
  {id:'plan',    label:'برنامه',  color:'#34d399'},
  {id:'goal',    label:'هدف',     color:'#fbbf24'},
  {id:'finance', label:'مالی',    color:'#f472b6'},
  {id:'other',   label:'سایر',    color:'#94a3b8'},
];
let notesFilterCat = 'all';
let notesFilterTags = []; // multi-tag AND filter
let notesQuery = '';
let notesSortMode = 'updated';
let notesPinnedOnly = false;
let notesViewMode = 'list'; // list | cal
let notesLayoutMode = 'vertical'; // vertical | horizontal
let notesCalCursor = null; // Date for calendar month
let notesCalSelectedISO = null;
let noteDraftTags = [];
const NOTES_UI_KEY = 'daftar-notes-ui';
/* --- Persist notes UI prefs (search/filter/view) --- */
function loadNotesUiState(){
  try{
    const raw = sessionStorage.getItem(NOTES_UI_KEY);
    if(!raw) return;
    const o = JSON.parse(raw);
    if(!o || typeof o !== 'object') return;
    if(typeof o.query === 'string') notesQuery = o.query;
    if(typeof o.cat === 'string') notesFilterCat = o.cat;
    if(Array.isArray(o.tags)) notesFilterTags = o.tags;
    if(typeof o.pinned === 'boolean') notesPinnedOnly = o.pinned;
    if(typeof o.sort === 'string') notesSortMode = o.sort;
    if(typeof o.view === 'string') notesViewMode = o.view;
    if(o.layout === 'horizontal' || o.layout === 'vertical') notesLayoutMode = o.layout;
  }catch(e){}
}
function saveNotesUiState(){
  try{
    sessionStorage.setItem(NOTES_UI_KEY, JSON.stringify({
      query: notesQuery,
      cat: notesFilterCat,
      tags: notesFilterTags,
      pinned: notesPinnedOnly,
      sort: notesSortMode,
      view: notesViewMode,
      layout: notesLayoutMode
    }));
  }catch(e){}
}
function updateNotesSearchChrome(){
  const wrap = document.getElementById('notesSearchWrap');
  const inp = document.getElementById('notesSearch');
  if(wrap && inp) wrap.classList.toggle('has-query', !!(inp.value || '').trim());
}
function renderNotesActiveFilters(){
  const el = document.getElementById('notesActiveFilters');
  if(!el) return;
  const chips = [];
  if((notesQuery || '').trim()){
    chips.push('<span class="naf-chip">جستجو: ' + escapeHtml(notesQuery.trim()) +
      ' <button type="button" data-naf="query" aria-label="حذف">×</button></span>');
  }
  if(notesFilterCat && notesFilterCat !== 'all'){
    chips.push('<span class="naf-chip">دسته: ' + escapeHtml(noteCatMeta(notesFilterCat).label) +
      ' <button type="button" data-naf="cat" aria-label="حذف">×</button></span>');
  }
  (notesFilterTags || []).forEach(t => {
    chips.push('<span class="naf-chip">#' + escapeHtml(t) +
      ' <button type="button" data-naf="tag" data-tag="' + escapeHtml(t) + '" aria-label="حذف">×</button></span>');
  });
  if(notesPinnedOnly){
    chips.push('<span class="naf-chip">فقط سنجاق‌شده <button type="button" data-naf="pin" aria-label="حذف">×</button></span>');
  }
  el.innerHTML = chips.join('');
}
function renderNotesResultMeta(filteredLen){
  const el = document.getElementById('notesResultMeta');
  if(!el) return;
  const total = Array.isArray(notes) ? notes.length : 0;
  const active = (notesQuery && notesQuery.trim()) || (notesFilterCat && notesFilterCat !== 'all') ||
    (notesFilterTags && notesFilterTags.length) || notesPinnedOnly;
  if(!total){ el.innerHTML = ''; return; }
  if(active) el.innerHTML = 'نمایش <b>' + filteredLen + '</b> از <b>' + total + '</b> یادداشت';
  else el.innerHTML = '<b>' + total + '</b> یادداشت';
}
loadNotesUiState();


function noteCatMeta(id){
  return NOTE_CATS.find(c => c.id === id) || NOTE_CATS[NOTE_CATS.length-1];
}

function normalizeTag(t){
  return String(t||'').trim().replace(/\s+/g,' ').slice(0,32);
}
function tagsEqual(a,b){
  return normalizeTag(a).toLowerCase() === normalizeTag(b).toLowerCase();
}
function uniqTags(list){
  const out = [];
  (list||[]).forEach(t=>{
    const n = normalizeTag(t);
    if(!n) return;
    if(!out.some(x => tagsEqual(x,n))) out.push(n);
  });
  return out;
}

/** Minimal safe Markdown → HTML */
/* --- Markdown helpers --- */
function renderMarkdown(src){
  let s = String(src||'');
  s = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // fenced code
  s = s.replace(/```([\s\S]*?)```/g, (_,code)=> '<pre><code>'+code.trim()+'</code></pre>');
  // headings
  s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  s = s.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  s = s.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  // blockquote
  s = s.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  // lists
  s = s.replace(/^(?:[-*] .+(\n|$))+?/gm, block=>{
    const items = block.trim().split(/\n/).map(l=> l.replace(/^[-*] /,'')).filter(Boolean);
    return '<ul>'+items.map(i=>'<li>'+i+'</li>').join('')+'</ul>';
  });
  s = s.replace(/^(?:\d+\. .+(\n|$))+?/gm, block=>{
    const items = block.trim().split(/\n/).map(l=> l.replace(/^\d+\. /,'')).filter(Boolean);
    return '<ol>'+items.map(i=>'<li>'+i+'</li>').join('')+'</ol>';
  });
  // inline
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  // paragraphs
  s = s.split(/\n{2,}/).map(p=>{
    if(/^<(h[123]|ul|ol|pre|blockquote)/.test(p.trim())) return p;
    return '<p>'+p.replace(/\n/g,'<br>')+'</p>';
  }).join('');
  return s;
}

function stripMd(s){
  return String(s||'').replace(/[#>*_`\[\]]/g,' ').replace(/\s+/g,' ').trim();
}

function formatNoteDateTime(isoDate, time){
  const d = isoDate ? toJalaliStr(isoDate) : '';
  const t = time || '';
  if(d && t) return d + ' · ' + t;
  return d || t || '—';
}

function noteScheduleISO(note){
  // تاریخ نمایش/تقویم از زمان سیستم ذخیره‌شده (ایجاد یا ویرایش)
  if(!note) return '';
  const src = note.updatedAt || note.createdAt || '';
  if(!src) return '';
  // ISO یا YYYY-MM-DD
  if(src.length >= 10 && src[4]==='-' && src[7]==='-') return src.slice(0,10);
  try{
    const d = new Date(src);
    if(!isNaN(d.getTime())) return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
  }catch(e){}
  return '';
}
function nowSystemTimeHM(){
  const d = todayDate();
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}
function formatNoteStamp(note){
  if(!note) return '—';
  const iso = noteScheduleISO(note);
  let time = '';
  try{
    const src = note.updatedAt || note.createdAt;
    if(src){
      const d = new Date(src);
      if(!isNaN(d.getTime())) time = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    }
  }catch(e){}
  return formatNoteDateTime(iso, time);
}


let noteModalMode = 'read'; // read | edit
let noteModalCurrentId = null;

/* --- Note modal: read / edit --- */
function openNoteModal(){
  const m = $('noteModal');
  if(!m) return;
  m.classList.add('open');
  m.setAttribute('aria-hidden', 'false');
  document.body.classList.add('note-modal-open');
}
function closeNoteModal(){
  const m = $('noteModal');
  if(!m) return;
  m.classList.remove('open', 'mode-read', 'mode-edit');
  m.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('note-modal-open');
  noteModalCurrentId = null;
  noteModalMode = 'read';
  $('noteEditId').value = '';
  $('noteTitle').value = '';
  $('noteBody').value = '';
  noteDraftTags = [];
  if(typeof renderNoteTagList === 'function') renderNoteTagList();
}

function setNoteModalMode(mode){
  const m = $('noteModal');
  if(!m) return;
  noteModalMode = mode === 'edit' ? 'edit' : 'read';
  m.classList.toggle('mode-edit', noteModalMode === 'edit');
  m.classList.toggle('mode-read', noteModalMode === 'read');
}

function fillNoteReadView(note){
  if(!note) return;
  const cat = noteCatMeta(note.cat);
  $('noteModalTitle').textContent = note.title || 'بدون عنوان';
  const tags = uniqTags(note.tags||[]).map(t => '<span class="note-mini-tag">#'+escapeHtml(t)+'</span>').join(' ');
  $('noteModalMeta').innerHTML =
    '<span class="note-badge"><span style="background:'+cat.color+';width:6px;height:6px;border-radius:50%;display:inline-block;"></span>'+escapeHtml(cat.label)+'</span>' +
    '<span>'+escapeHtml(formatNoteStamp(note))+'</span>' +
    (tags ? '<span style="display:inline-flex;flex-wrap:wrap;gap:4px;">'+tags+'</span>' : '');
  $('noteReadContent').innerHTML = renderMarkdown(note.body || '');
  const pinBtn = $('noteModalPin');
  if(pinBtn){
    pinBtn.style.color = note.pinned ? 'var(--blue-light)' : '';
    pinBtn.querySelector('svg') && pinBtn.querySelector('svg').setAttribute('fill', note.pinned ? 'currentColor' : 'none');
  }
}

function openNoteReader(note){
  if(!note) return;
  noteModalCurrentId = String(note.id);
  fillNoteReadView(note);
  setNoteModalMode('read');
  openNoteModal();
}

function openNoteEditor(note){
  renderNoteCatPicks();
  noteModalCurrentId = note ? String(note.id) : null;
  $('noteEditId').value = note ? String(note.id) : '';
  $('noteTitle').value = note ? (note.title || '') : '';
  $('noteBody').value = note ? (note.body || '') : '';
  noteDraftTags = uniqTags(note && note.tags ? note.tags : []);
  renderNoteTagList();
  const cat = note ? (note.cat || 'daily') : 'daily';
  document.querySelectorAll('#noteCatPicks .note-cat-pick').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.cat === cat);
  });
  if($('noteDeleteBtn')) $('noteDeleteBtn').style.display = note ? 'block' : 'none';
  if($('noteMetaAuto')){
    $('noteMetaAuto').innerHTML = note
      ? ('ایجاد: <b>' + escapeHtml(formatNoteStamp({createdAt: note.createdAt, updatedAt: note.createdAt})) + '</b> · آخرین ویرایش: <b>' + escapeHtml(formatNoteStamp(note)) + '</b>')
      : ('تاریخ و ساعت هنگام ذخیره از زمان سیستم · امروز: <b>' + escapeHtml(formatNoteDateTime(todayISO(), nowSystemTimeHM())) + '</b>');
  }
  if(note){
    $('noteModalTitle').textContent = 'ویرایش · ' + (note.title || 'بدون عنوان');
  } else {
    $('noteModalTitle').textContent = 'یادداشت جدید';
    $('noteModalMeta').innerHTML = '<span class="note-badge">جدید</span>';
    $('noteReadContent').innerHTML = '';
  }
  setNoteMdTab('write');
  setNoteModalMode('edit');
  openNoteModal();
}

function closeNoteEditor(){
  // از حالت ویرایش: اگر یادداشت موجود بود به خواندن برگرد، وگرنه بستن
  const id = ($('noteEditId').value || noteModalCurrentId || '').trim();
  if(id){
    const note = notes.find(x => String(x.id) === String(id));
    if(note){ openNoteReader(note); return; }
  }
  closeNoteModal();
}


function setNoteMdTab(mode){
  const writeBtn = $('noteMdWrite'), prevBtn = $('noteMdPreview');
  const ta = $('noteBody'), box = $('noteMdPreviewBox');
  if(writeBtn) writeBtn.classList.toggle('active', mode==='write');
  if(prevBtn) prevBtn.classList.toggle('active', mode==='preview');
  if(ta) ta.style.display = mode==='write' ? 'block' : 'none';
  if(box){
    box.classList.toggle('open', mode==='preview');
    if(mode==='preview') box.innerHTML = renderMarkdown(ta ? ta.value : '');
  }
}

function getActiveNoteCat(){
  const a = document.querySelector('#noteCatPicks .note-cat-pick.active');
  return a ? a.dataset.cat : 'daily';
}

function renderNoteCatPicks(){
  const el = $('noteCatPicks');
  if(!el) return;
  el.innerHTML = NOTE_CATS.map(c =>
    `<button type="button" class="note-cat-pick" data-cat="${c.id}"><span class="dotc" style="background:${c.color};width:8px;height:8px;border-radius:50%;display:inline-block;"></span>${c.label}</button>`
  ).join('');
  el.querySelectorAll('.note-cat-pick').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      el.querySelectorAll('.note-cat-pick').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  if(!el.querySelector('.note-cat-pick.active')){
    const first = el.querySelector('.note-cat-pick');
    if(first) first.classList.add('active');
  }
}

function renderNoteTagList(){
  const el = $('noteTagList');
  if(!el) return;
  if(!noteDraftTags.length){ el.innerHTML = ''; return; }
  el.innerHTML = noteDraftTags.map((t,i)=>
    `<span class="note-tag-item">${escapeHtml(t)}<button type="button" data-rm-tag="${i}" aria-label="حذف تگ">×</button></span>`
  ).join('');
  el.querySelectorAll('[data-rm-tag]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      noteDraftTags.splice(parseInt(btn.dataset.rmTag,10), 1);
      renderNoteTagList();
    });
  });
}

function addDraftTag(raw){
  const n = normalizeTag(raw);
  if(!n) return;
  if(noteDraftTags.some(t => tagsEqual(t,n))){ showToast('تگ تکراری است', true); return; }
  noteDraftTags.push(n);
  renderNoteTagList();
  if($('noteTagInput')) $('noteTagInput').value = '';
}

function collectAllTags(){
  const set = [];
  (notes||[]).forEach(n=>{
    (n.tags||[]).forEach(t=>{
      const x = normalizeTag(t);
      if(x && !set.some(s => tagsEqual(s,x))) set.push(x);
    });
  });
  return set.sort((a,b)=> a.localeCompare(b, 'fa'));
}

/* --- Filters, tags, calendar, list render --- */
function renderNotesCatBar(){
  const el = $('notesCatBar');
  if(!el) return;
  const all = [{id:'all', label:'همه', color:'var(--blue-light)'}, ...NOTE_CATS];
  el.innerHTML = all.map(c => {
    const active = notesFilterCat === c.id ? ' active' : '';
    const dot = c.id==='all' ? '' : `<span class="dotc" style="background:${c.color}"></span>`;
    return `<button type="button" class="notes-cat-chip${active}" data-cat="${c.id}">${dot}${c.label}</button>`;
  }).join('');
  el.querySelectorAll('.notes-cat-chip').forEach(btn=>{
    btn.addEventListener('click', ()=>{ notesFilterCat = btn.dataset.cat; renderNotes(); });
  });
}

function renderNotesTagBar(){
  const el = $('notesTagBar');
  if(!el) return;
  const tags = collectAllTags();
  if(!tags.length){ el.innerHTML = ''; return; }
  el.innerHTML = tags.map(t=>{
    const on = notesFilterTags.some(x => tagsEqual(x,t)) ? ' active' : '';
    return `<button type="button" class="notes-tag-chip${on}" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</button>`;
  }).join('');
  el.querySelectorAll('.notes-tag-chip').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const t = btn.dataset.tag;
      if(notesFilterTags.some(x => tagsEqual(x,t))){
        notesFilterTags = notesFilterTags.filter(x => !tagsEqual(x,t));
      } else {
        notesFilterTags.push(t);
      }
      renderNotes();
    });
  });
}

function getFilteredNotes(){
  let list = Array.isArray(notes) ? notes.slice() : [];
  if(notesPinnedOnly) list = list.filter(n => n && n.pinned);
  if(notesFilterCat && notesFilterCat !== 'all') list = list.filter(n => n && n.cat === notesFilterCat);
  if(notesFilterTags.length){
    list = list.filter(n => {
      const nt = n.tags || [];
      return notesFilterTags.every(ft => nt.some(t => tagsEqual(t, ft)));
    });
  }
  if(notesViewMode === 'cal' && notesCalSelectedISO){
    list = list.filter(n => noteScheduleISO(n) === notesCalSelectedISO);
  }
  const qRaw = (notesQuery || '').trim().toLowerCase();
  if(qRaw){
    const tokens = qRaw.split(/\s+/).filter(Boolean);
    list = list.filter(n => {
      if(!n) return false;
      const cat = noteCatMeta(n.cat).label;
      const hay = [n.title, n.body, cat, ...(n.tags||[])].map(x => String(x||'').toLowerCase()).join(' ');
      return tokens.every(tok => hay.includes(tok));
    });
  }
  list.sort((a,b)=>{
    const pin = (b.pinned?1:0) - (a.pinned?1:0);
    if(pin) return pin;
    if(notesSortMode === 'oldest') return String(a.createdAt||'') < String(b.createdAt||'') ? -1 : 1;
    if(notesSortMode === 'newest') return String(a.createdAt||'') < String(b.createdAt||'') ? 1 : -1;
    return String(a.updatedAt||'') < String(b.updatedAt||'') ? 1 : -1;
  });
  return list;
}

function renderNotesCalendar(){
  const wrap = $('notesCal');
  const grid = $('notesCalGrid');
  const title = $('notesCalTitle');
  if(!wrap || !grid) return;
  wrap.classList.toggle('open', notesViewMode === 'cal');
  if(notesViewMode !== 'cal') return;
  if(!notesCalCursor) notesCalCursor = todayDate();
  const y = notesCalCursor.getFullYear();
  const m = notesCalCursor.getMonth();
  const [jy, jm] = gregorianToJalali(y, m+1, 1);
  if(title) title.textContent = (JMONTHS[jm-1]||'') + ' ' + jy;

  const first = new Date(y, m, 1);
  const startPad = first.getDay(); // 0 Sun
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const todayIso = todayISO();
  const counts = {};
  (notes||[]).forEach(n=>{
    const d = noteScheduleISO(n);
    if(d) counts[d] = (counts[d]||0)+1;
  });

  const dows = ['ی','د','س','چ','پ','ج','ش']; // approximate labels
  let html = dows.map(d=>`<div class="notes-cal-dow">${d}</div>`).join('');
  for(let i=0;i<startPad;i++) html += `<button type="button" class="notes-cal-day muted" disabled></button>`;
  for(let day=1; day<=daysInMonth; day++){
    const iso = y + '-' + pad2(m+1) + '-' + pad2(day);
    const has = counts[iso] ? ' has' : '';
    const sel = notesCalSelectedISO === iso ? ' selected' : '';
    const tod = iso === todayIso ? ' today' : '';
    const dot = counts[iso] ? '<span class="dot"></span>' : '';
    html += `<button type="button" class="notes-cal-day${has}${sel}${tod}" data-iso="${iso}"><span class="num">${day}</span>${dot}</button>`;
  }
  grid.innerHTML = html;
  grid.querySelectorAll('[data-iso]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const iso = btn.dataset.iso;
      notesCalSelectedISO = (notesCalSelectedISO === iso) ? null : iso;
      renderNotes();
    });
  });
}

function renderNotes(){
  const grid = $('notesGrid');
  if(!grid) return;
  grid.classList.toggle('notes-layout-horizontal', notesLayoutMode === 'horizontal');
  grid.classList.toggle('notes-layout-vertical', notesLayoutMode !== 'horizontal');
  const layoutBtnV = $('notesLayoutVertical');
  const layoutBtnH = $('notesLayoutHorizontal');
  if(layoutBtnV) layoutBtnV.classList.toggle('active', notesLayoutMode !== 'horizontal');
  if(layoutBtnH) layoutBtnH.classList.toggle('active', notesLayoutMode === 'horizontal');

  // همگام‌سازی UI جستجو با state
  if($('notesSearch') && document.activeElement !== $('notesSearch')){
    $('notesSearch').value = notesQuery || '';
  }
  if($('notesSort')) $('notesSort').value = notesSortMode || 'updated';
  if($('notesPinnedOnly')) $('notesPinnedOnly').checked = !!notesPinnedOnly;
  updateNotesSearchChrome();
  renderNotesCatBar();
  renderNotesTagBar();
  renderNotesCalendar();
  const list = getFilteredNotes();
  renderNotesActiveFilters();
  renderNotesResultMeta(list.length);
  saveNotesUiState();
  if(!list.length){
    grid.innerHTML = `<div class="notes-empty" style="grid-column:1/-1">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 3h8l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M15 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>
      یادداشتی با این فیلتر پیدا نشد
    </div>`;
    return;
  }
  grid.innerHTML = list.map((n,i)=>{
    const cat = noteCatMeta(n.cat);
    const pinCls = n.pinned ? ' pinned' : '';
    const pinOn = n.pinned ? ' on' : '';
    const delay = Math.min(i, 8) * 30;
    const tags = uniqTags(n.tags||[]).slice(0,5).map(t=>`<span class="note-mini-tag">#${escapeHtml(t)}</span>`).join('');
    const when = formatNoteStamp(n);
    const bodyTxt = escapeHtml(stripMd(n.body||''));
    return `<article class="note-card note-card--compact${pinCls}" data-id="${n.id}" style="--note-accent:${cat.color};animation-delay:${delay}ms">
      <div class="note-card-head">
        <div class="note-card-title">${escapeHtml(n.title || 'بدون عنوان')}</div>
        <div class="note-card-actions">
          <button type="button" class="note-copy-btn" data-copy="${n.id}" title="کپی محتوا" aria-label="کپی محتوا">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></svg>
          </button>
          <button type="button" class="note-pin${pinOn}" data-pin="${n.id}" title="سنجاق" aria-label="سنجاق">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${n.pinned?'currentColor':'none'}" stroke="currentColor" stroke-width="1.8"><path d="M12 17v5M8 3h8l-1 7h3l-6 6-6-6h3L8 3z"/></svg>
          </button>
        </div>
      </div>
      <div class="note-card-body">${bodyTxt}</div>
      ${tags ? `<div class="note-card-tags">${tags}</div>` : ''}
      <div class="note-card-foot">
        <span class="note-badge"><span class="note-badge-dot" style="background:${cat.color}"></span>${escapeHtml(cat.label)}</span>
        <span class="note-card-when">${when}</span>
      </div>
    </article>`;
  }).join('');

  grid.querySelectorAll('.note-card').forEach(card=>{
    card.addEventListener('click', (e)=>{
      if(e.target.closest && (e.target.closest('[data-pin]') || e.target.closest('[data-copy]'))) return;
      const note = notes.find(x => String(x.id) === String(card.dataset.id));
      if(note) openNoteReader(note);
    });
  });
  grid.querySelectorAll('[data-pin]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const note = notes.find(x => String(x.id) === String(btn.dataset.pin));
      if(!note) return;
      note.pinned = !note.pinned;
      note.updatedAt = new Date().toISOString();
      if(persist()){ showToast(note.pinned ? 'سنجاق شد' : 'سنجاق برداشته شد'); renderNotes(); }
    });
  });
  grid.querySelectorAll('[data-copy]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      e.preventDefault();
      const note = notes.find(x => String(x.id) === String(btn.dataset.copy));
      if(note) copyNoteContent(note, btn);
    });
  });
}

function buildNotePlainText(note){
  // فقط متن اصلی محتوا — بدون عنوان، تگ، تاریخ، HTML یا متادیتا
  if(!note) return '';
  let body = String(note.body == null ? '' : note.body);
  // حذف تگ HTML احتمالی
  body = body.replace(/<[^>]*>/g, ' ');
  // نرمال‌سازی فاصله و خطوط
  body = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  body = body.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  return body.trim();
}

function copyTextFallback(text){
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, ta.value.length);
  let ok = false;
  try{ ok = document.execCommand('copy'); }catch(e){ ok = false; }
  document.body.removeChild(ta);
  return ok;
}

async function copyNoteContent(note, btnEl){
  const text = buildNotePlainText(note);
  if(!text){
    if(typeof showToast === 'function') showToast('محتوایی برای کپی نیست', true);
    return false;
  }
  let ok = false;
  try{
    if(navigator.clipboard && typeof navigator.clipboard.writeText === 'function'){
      await navigator.clipboard.writeText(text);
      ok = true;
    }
  }catch(e){ ok = false; }
  if(!ok) ok = copyTextFallback(text);
  if(ok){
    if(typeof showToast === 'function') showToast('کپی شد ✓');
    if(btnEl){
      btnEl.classList.add('copied');
      const prev = btnEl.getAttribute('title') || '';
      btnEl.setAttribute('title', 'کپی شد ✓');
      setTimeout(()=>{
        btnEl.classList.remove('copied');
        if(prev) btnEl.setAttribute('title', prev);
      }, 1400);
    }
  } else {
    if(typeof showToast === 'function') showToast('کپی ممکن نشد', true);
    else alert('کپی ممکن نشد');
  }
  return ok;
}

function escapeHtml(s){
  return String(s||'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}


if($('analysisToggle') && $('analysisBody')){
  $('analysisToggle').addEventListener('click', ()=>{
    const body = $('analysisBody');
    const btn = $('analysisToggle');
    const open = !body.classList.contains('open');
    body.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if(open && typeof renderFinancialAnalysis === 'function') renderFinancialAnalysis();
  });
}


/* --- Event bindings (notes toolbar / modal) --- */
if($('notesNewBtn')){
  $('notesNewBtn').addEventListener('click', (e)=>{
    if(e){ e.preventDefault(); e.stopPropagation(); }
    try{
      if(typeof openNoteEditor === 'function') openNoteEditor(null);
      else showToast('ویرایشگر یادداشت در دسترس نیست', true);
    }catch(err){
      console.error(err);
      showToast('خطا در باز کردن یادداشت جدید', true);
    }
  });
}

if($('noteModalClose')) $('noteModalClose').addEventListener('click', closeNoteModal);
if($('noteModalClose2')) $('noteModalClose2').addEventListener('click', closeNoteModal);
if($('noteModal')){
  $('noteModal').addEventListener('click', (e)=>{ if(e.target === $('noteModal')) closeNoteModal(); });
}
if($('noteModalCopyBtn')){
  $('noteModalCopyBtn').addEventListener('click', ()=>{
    const id = noteModalCurrentId || ($('noteEditId') && $('noteEditId').value);
    const note = (notes || []).find(x => String(x.id) === String(id));
    if(note) copyNoteContent(note, $('noteModalCopyBtn'));
    else if(typeof showToast === 'function') showToast('یادداشتی انتخاب نشده', true);
  });
}
if($('noteModalEditBtn')){
  $('noteModalEditBtn').addEventListener('click', ()=>{
    const id = noteModalCurrentId;
    const note = notes.find(x => String(x.id) === String(id));
    if(note) openNoteEditor(note);
  });
}
if($('noteModalPin')){
  $('noteModalPin').addEventListener('click', ()=>{
    const id = noteModalCurrentId;
    const note = notes.find(x => String(x.id) === String(id));
    if(!note) return;
    note.pinned = !note.pinned;
    note.updatedAt = new Date().toISOString();
    if(persist()){
      showToast(note.pinned ? 'سنجاق شد' : 'سنجاق برداشته شد');
      fillNoteReadView(note);
      renderNotes();
    }
  });
}
document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape' && $('noteModal') && $('noteModal').classList.contains('open')) closeNoteModal();
});

if($('noteCancelBtn')) $('noteCancelBtn').addEventListener('click', closeNoteEditor);
if($('noteSaveBtn')){
  $('noteSaveBtn').addEventListener('click', ()=>{
    const title = ($('noteTitle').value || '').trim();
    const body = ($('noteBody').value || '').trim();
    if(!title && !body){ showToast('عنوان یا متن را وارد کنید', true); return; }
    const cat = getActiveNoteCat();
    const tags = uniqTags(noteDraftTags);
    const now = new Date().toISOString();
    const id = ($('noteEditId').value || '').trim();
    if(id){
      const note = notes.find(x => String(x.id) === id);
      if(!note){ showToast('یادداشت پیدا نشد', true); return; }
      note.title = title; note.body = body; note.cat = cat; note.tags = tags;
      note.updatedAt = now;
    } else {
      notes.push({
        id: Date.now(), title, body, cat, tags,
        pinned: false, createdAt: now, updatedAt: now
      });
    }
    if(!Array.isArray(notes)) notes = [];
    let ok = false;
    try{ ok = !!persist(); }catch(err){ console.error(err); ok = false; }
    if(!ok){
      try{
        localStorage.setItem(STORE_KEY, JSON.stringify(getStatePayload()));
        ok = true;
      }catch(err2){
        console.error(err2);
        showToast('ذخیره ناموفق — حافظه مرورگر در دسترس نیست', true);
        return;
      }
    }
    showToast('ذخیره شد');
    if(typeof renderNotes === 'function') renderNotes();
    const savedId = id || String(notes[notes.length-1] && notes[notes.length-1].id);
    const saved = notes.find(x => String(x.id) === String(savedId));
    if(saved && typeof openNoteReader === 'function') openNoteReader(saved);
    else if(typeof closeNoteModal === 'function') closeNoteModal();
  });
}
if($('noteDeleteBtn')){
  $('noteDeleteBtn').addEventListener('click', ()=>{
    const id = String(($('noteEditId') && $('noteEditId').value) || noteModalCurrentId || '').trim();
    if(!id){ showToast('یادداشت مشخص نیست', true); return; }
    if(!Array.isArray(notes)) notes = [];
    const note = notes.find(x => String(x.id) === id);
    showConfirmModal('حذف این یادداشت؟', note ? (note.title || 'بدون عنوان') : '', ()=>{
      const before = notes.length;
      notes = notes.filter(x => String(x.id) !== id);
      if(notes.length === before){ showToast('یادداشت پیدا نشد', true); return; }
      let ok = persist();
      if(!ok){
        try{ localStorage.setItem(STORE_KEY, JSON.stringify(getStatePayload())); ok = true; }catch(err){ console.error(err); }
      }
      showToast(ok ? 'حذف شد' : 'حذف از حافظه انجام شد؛ ذخیره پایدار ناموفق', !ok);
      if(typeof closeNoteModal === 'function') closeNoteModal();
      if(typeof closeNoteEditor === 'function') { try{ /* editor closed via modal */ }catch(e){} }
      if(typeof renderNotes === 'function') renderNotes();
    });
  });
}
if($('notesSearch')){
  let tmr = null;
  $('notesSearch').value = notesQuery || '';
  updateNotesSearchChrome();
  $('notesSearch').addEventListener('input', ()=>{
    clearTimeout(tmr);
    tmr = setTimeout(()=>{
      notesQuery = $('notesSearch').value || '';
      updateNotesSearchChrome();
      renderNotes();
    }, 120);
  });
}
if($('notesSearchClear')){
  $('notesSearchClear').addEventListener('click', ()=>{
    notesQuery = '';
    if($('notesSearch')) $('notesSearch').value = '';
    updateNotesSearchChrome();
    renderNotes();
  });
}
if($('notesClearFilters')){
  $('notesClearFilters').addEventListener('click', ()=>{
    notesQuery = '';
    notesFilterCat = 'all';
    notesFilterTags = [];
    notesPinnedOnly = false;
    if($('notesSearch')) $('notesSearch').value = '';
    if($('notesPinnedOnly')) $('notesPinnedOnly').checked = false;
    updateNotesSearchChrome();
    renderNotes();
  });
}
document.addEventListener('click', (e)=>{
  const btn = e.target && e.target.closest && e.target.closest('[data-naf]');
  if(!btn) return;
  const kind = btn.getAttribute('data-naf');
  if(kind === 'query'){ notesQuery = ''; if($('notesSearch')) $('notesSearch').value = ''; }
  else if(kind === 'cat'){ notesFilterCat = 'all'; }
  else if(kind === 'pin'){ notesPinnedOnly = false; if($('notesPinnedOnly')) $('notesPinnedOnly').checked = false; }
  else if(kind === 'tag'){
    const tag = btn.getAttribute('data-tag');
    notesFilterTags = (notesFilterTags || []).filter(x => !tagsEqual(x, tag));
  }
  updateNotesSearchChrome();
  renderNotes();
});
if($('notesSort')){
  $('notesSort').addEventListener('change', ()=>{
    notesSortMode = $('notesSort').value || 'updated';
    renderNotes();
  });
}
if($('notesPinnedOnly')){
  $('notesPinnedOnly').addEventListener('change', ()=>{
    notesPinnedOnly = !!$('notesPinnedOnly').checked;
    renderNotes();
  });
}
if($('noteMdWrite')) $('noteMdWrite').addEventListener('click', ()=> setNoteMdTab('write'));
if($('noteMdPreview')) $('noteMdPreview').addEventListener('click', ()=> setNoteMdTab('preview'));
if($('noteTagAddBtn')) $('noteTagAddBtn').addEventListener('click', ()=> addDraftTag($('noteTagInput') && $('noteTagInput').value));
if($('noteTagInput')){
  $('noteTagInput').addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){ e.preventDefault(); addDraftTag($('noteTagInput').value); }
  });
}
function setNotesView(mode){
  notesViewMode = mode === 'cal' ? 'cal' : 'list';
  if($('notesViewList')) $('notesViewList').classList.toggle('active', notesViewMode==='list');
  if($('notesViewCal')) $('notesViewCal').classList.toggle('active', notesViewMode==='cal');
  if(notesViewMode === 'list') notesCalSelectedISO = null;
  renderNotes();
}
if($('notesViewList')) $('notesViewList').addEventListener('click', ()=> setNotesView('list'));
if($('notesViewCal')) $('notesViewCal').addEventListener('click', ()=> setNotesView('cal'));
if($('notesCalPrev')){
  $('notesCalPrev').addEventListener('click', ()=>{
    if(!notesCalCursor) notesCalCursor = todayDate();
    notesCalCursor = new Date(notesCalCursor.getFullYear(), notesCalCursor.getMonth()-1, 1);
    renderNotes();
  });
}
if($('notesCalNext')){
  $('notesCalNext').addEventListener('click', ()=>{
    if(!notesCalCursor) notesCalCursor = todayDate();
    notesCalCursor = new Date(notesCalCursor.getFullYear(), notesCalCursor.getMonth()+1, 1);
    renderNotes();
  });
}
if($('noteCatPicks')) renderNoteCatPicks();




/* چیدمان عمودی / افقی یادداشت‌ها */
/* --- Layout toggle (vertical / horizontal) --- */
function setNotesLayout(mode){
  notesLayoutMode = (mode === 'horizontal') ? 'horizontal' : 'vertical';
  try{ if(typeof saveNotesUiState === 'function') saveNotesUiState(); }catch(e){}
  if(typeof renderNotes === 'function') renderNotes();
}
document.addEventListener('click', function(e){
  const t = e.target && e.target.closest && e.target.closest('#notesLayoutVertical, #notesLayoutHorizontal');
  if(!t) return;
  e.preventDefault();
  setNotesLayout(t.id === 'notesLayoutHorizontal' ? 'horizontal' : 'vertical');
});


