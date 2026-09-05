/* ==========================================================================
   app-boot.js — قیمت‌ها، PIN/قفل، initialization نهایی
   وابستگی: آخرین ماژول (بعد از core / ui / notes)
   ترتیب startup در انتهای فایل عمداً ثابت است — تغییر ندهید.
   ========================================================================== */

/* --- Market prices (shared state; used by non-cash UI) --- */
let _marketPrices = null;
let _pricesApiLoading = null;

/* --- Prices API load & cache --- */
function loadPricesApiScript(){
  if(window.PricesAPI) return Promise.resolve(window.PricesAPI);
  if(_pricesApiLoading) return _pricesApiLoading;
  _pricesApiLoading = new Promise((resolve, reject)=>{
    const s = document.createElement('script');
    s.src = 'prices-api.js';
    s.async = true;
    s.onload = ()=> window.PricesAPI ? resolve(window.PricesAPI) : reject(new Error('PricesAPI load failed'));
    s.onerror = ()=> reject(new Error('بارگذاری prices-api.js ناموفق — فایل را کنار index.html بگذارید'));
    document.head.appendChild(s);
  });
  return _pricesApiLoading;
}

async function ensureMarketPrices(force){
  if(!force && _marketPrices && _marketPrices.updatedAt && (Date.now() - _marketPrices.updatedAt < 5*60*1000)){
    renderMarketPricesUI();
    if(typeof renderNonCash === 'function') renderNonCash();
    return _marketPrices;
  }
  const meta = $('ncPricesMeta');
  if(meta) meta.textContent = 'در حال دریافت قیمت…';
  try{
    const api = await loadPricesApiScript();
    const data = await api.fetchMarketPrices({ timeoutMs: 14000 });
    _marketPrices = data;
    try{ sessionStorage.setItem('daftar-market-prices', JSON.stringify(data)); }catch(e){}
    renderMarketPricesUI();
    if(typeof renderNonCash === 'function') renderNonCash();
    return data;
  }catch(err){
    console.error('market prices', err);
    // حفظ قیمت قبلی — هیچ مقدار ساختگی نمایش نده
    if(_marketPrices && _marketPrices.updatedAt){
      if(meta) meta.textContent = 'خطا در بروزرسانی — قیمت قبلی حفظ شد: ' + (err && err.message ? err.message : 'نامشخص');
      renderMarketPricesUI();
      if(typeof renderNonCash === 'function') renderNonCash();
      return _marketPrices;
    }
    try{
      const raw = sessionStorage.getItem('daftar-market-prices');
      if(raw){
        const cached = JSON.parse(raw);
        if(cached && (cached.goldPerGramToman != null || cached.usdToman != null || cached.silverPerGramToman != null)){
          _marketPrices = cached;
          renderMarketPricesUI();
          if(typeof renderNonCash === 'function') renderNonCash();
          if(meta) meta.textContent = 'آفلاین — از آخرین قیمت ذخیره‌شده';
          return _marketPrices;
        }
      }
    }catch(e){}
    if(meta) meta.textContent = 'خطا: ' + (err && err.message ? err.message : 'نامشخص');
    return null;
  }
}

function renderMarketPricesUI(){
  const p = _marketPrices;
  if(!p) return;
  if($('ncPriceGold')) $('ncPriceGold').textContent = p.goldPerGramToman != null ? (fmt(Math.round(p.goldPerGramToman)) + ' ت') : '—';
  if($('ncPriceSilver')) $('ncPriceSilver').textContent = p.silverPerGramToman != null ? (fmt(Math.round(p.silverPerGramToman)) + ' ت') : '—';
  if($('ncPriceUsd')) $('ncPriceUsd').textContent = p.usdToman != null ? (fmt(Math.round(p.usdToman)) + ' ت') : '—';
  if($('ncPricesMeta')){
    const t = p.updatedAt ? new Date(p.updatedAt).toLocaleString('fa-IR') : '—';
    $('ncPricesMeta').textContent = 'آخرین بروزرسانی: ' + t + (p.source ? ' · ' + p.source : '');
  }
}

function liveValueForNoncash(item){
  if(!_marketPrices || !item) return null;
  const cat = item.category;
  if(cat === 'gold'){
    // اولویت با گرم+سوت (فرمول فعلی)؛ در نبود، totalGrams ذخیره‌شده
    let g = goldTotalGrams(item.grams, item.soot);
    if(!(g > 0)) g = safeNum(item.totalGrams, 0);
    if(g > 0 && _marketPrices.goldPerGramToman != null && isFinite(_marketPrices.goldPerGramToman)){
      return g * _marketPrices.goldPerGramToman;
    }
    return null;
  }
  if(cat === 'silver'){
    const g = safeNum(item.totalGrams, 0) || safeNum(item.grams, 0);
    if(g > 0 && _marketPrices.silverPerGramToman != null && isFinite(_marketPrices.silverPerGramToman)){
      return g * _marketPrices.silverPerGramToman;
    }
    return null;
  }
  if(cat === 'usd'){
    const usdAmt = safeNum(item.usdAmount, 0);
    if(usdAmt > 0 && _marketPrices.usdToman != null && isFinite(_marketPrices.usdToman)){
      return usdAmt * _marketPrices.usdToman;
    }
    return null;
  }
  return null;
}

if($('ncPricesRefreshBtn')){
  $('ncPricesRefreshBtn').addEventListener('click', ()=> ensureMarketPrices(true));
}


/* ================= PIN LOCK ================= */
const USERNAME_KEY = 'daftar-login-username';
const DEFAULT_USERNAME = 'admin';
const PIN_KEY = 'daftar-pin-hash';
const UNLOCK_FLAG = 'daftar-unlocked';
const SESSION_KEY = 'daftar-session-v1';
const LAST_VISIT_KEY = 'daftar-last-visit';
const PIN_FAIL_KEY = 'daftar-pin-fails';
const PIN_LOCKUNTIL_KEY = 'daftar-pin-lockuntil';
const PIN_MAX_FAILS = 5;
const PIN_LOCK_MS = 30000;
const PBKDF2_ITERS = 120000;

/* ========== Session / Last Visit (local, single source) ========== */
function readLastVisitTs(){
  try{
    const v = parseInt(localStorage.getItem(LAST_VISIT_KEY) || '', 10);
    return (v && isFinite(v) && v > 0) ? v : null;
  }catch(e){ return null; }
}
function writeLastVisitTs(ts){
  try{ localStorage.setItem(LAST_VISIT_KEY, String(ts)); }catch(e){}
}
function readSession(){
  try{
    const raw = sessionStorage.getItem(SESSION_KEY);
    if(!raw) return null;
    const s = JSON.parse(raw);
    if(s && s.authenticated === true && s.status === 'active' && s.profileId) return s;
    // stale / ناقص
    try{ sessionStorage.removeItem(SESSION_KEY); }catch(_e){}
  }catch(e){
    try{ sessionStorage.removeItem(SESSION_KEY); }catch(_e){}
  }
  return null;
}
function writeSession(sess){
  try{ sessionStorage.setItem(SESSION_KEY, JSON.stringify(sess)); }catch(e){}
}
function clearSession(){
  try{ sessionStorage.removeItem(SESSION_KEY); }catch(e){}
  try{ sessionStorage.removeItem(UNLOCK_FLAG); }catch(e){}
  // جلوگیری از بازیابی ناخواسته Session موازی
  try{ sessionStorage.removeItem('daftar-session'); }catch(e){}
  try{ sessionStorage.removeItem('daftar-auth'); }catch(e){}
}
function isSessionActive(){
  const s = readSession();
  if(s && s.authenticated === true && s.status === 'active') return true;
  // فقط اگر Session معتبر نبود ولی پرچم قدیمی هست (مهاجرت Refresh)
  try{
    if(sessionStorage.getItem(UNLOCK_FLAG) === '1'){
      // بدون SESSION_KEY واقعی — فقط با restore ساخته می‌شود؛ اینجا true موقت
      return true;
    }
  }catch(e){}
  return false;
}
/**
 * ورود موفق: Previous Last Visit را برای نمایش Session فریز می‌کند،
 * سپس زمان ورود فعلی را به‌عنوان Last Visit بعدی ذخیره می‌کند.
 * Refresh این تابع را صدا نمی‌زند.
 */
function createActiveSession(){
  const previous = readLastVisitTs(); // قبل از بازنویسی
  const now = Date.now();
  const sess = {
    authenticated: true,
    profileId: 'owner-profile',
    startedAt: now,
    status: 'active',
    previousLastVisit: previous // null = اولین ورود
  };
  writeSession(sess);
  try{ sessionStorage.setItem(UNLOCK_FLAG, '1'); }catch(e){}
  writeLastVisitTs(now); // برای ورود بعدی
  return sess;
}
/** بازیابی Session پس از Refresh — بدون ثبت بازدید جدید */
function restoreOrMigrateSession(){
  let s = readSession();
  // Session ذخیره‌شده معتبر
  if(s && s.authenticated === true && s.status === 'active') return s;
  // Session ناقص/نامعتبر را پاک کن تا stale نماند
  if(s){
    try{ sessionStorage.removeItem(SESSION_KEY); }catch(e){}
  }
  // مهاجرت سازگاری: فقط UNLOCK_FLAG از نسخه قبل — بدون ثبت Login جدید
  // previousLastVisit را از LAST_VISIT_KEY نخوان (آن زمان ورود فعلی است نه قبلی)
  try{
    if(sessionStorage.getItem(UNLOCK_FLAG) === '1'){
      s = {
        authenticated: true,
        profileId: 'owner-profile',
        startedAt: Date.now(),
        status: 'active',
        previousLastVisit: null
      };
      writeSession(s);
      return s;
    }
  }catch(e){}
  return null;
}
function getSessionPreviousLastVisit(){
  const s = readSession();
  if(s && ('previousLastVisit' in s)) return s.previousLastVisit;
  return readLastVisitTs();
}
function formatLastVisitFa(ts){
  if(ts == null || !isFinite(ts)) return 'اولین بازدید';
  try{
    const d = new Date(ts);
    if(isNaN(d.getTime())) return 'اولین بازدید';
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayDiff = Math.round((startToday - startThat) / 86400000);
    const timeStr = d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    if(dayDiff === 0) return 'امروز، ' + timeStr;
    if(dayDiff === 1) return 'دیروز، ' + timeStr;
    if(dayDiff > 1 && dayDiff < 7) return dayDiff + ' روز پیش، ' + timeStr;
    const dateStr = d.toLocaleDateString('fa-IR', { year: 'numeric', month: 'short', day: 'numeric' });
    return dateStr + '، ' + timeStr;
  }catch(e){ return '—'; }
}
function updateLastVisitUI(){
  try{
    const el = document.getElementById('menuLastVisit');
    if(!el) return;
    const prev = getSessionPreviousLastVisit();
    if(prev == null){
      el.textContent = 'اولین بازدید';
      el.classList.add('is-first');
    } else {
      el.textContent = 'آخرین بازدید: ' + formatLastVisitFa(prev);
      el.classList.remove('is-first');
    }
  }catch(e){}
}
function performLogout(){
  // فقط Session و Auth موقت — پروفایل، مالی، last-visit history حفظ می‌شوند
  clearSession();
  try{ sessionCryptoKey = null; }catch(e){}
  try{
    if(typeof closeMenu === 'function') closeMenu();
  }catch(e){}
  const rec = (typeof loadPinRecord === 'function') ? loadPinRecord() : null;
  if(rec){
    // با PIN: تا Login بعدی قفل بماند (Refresh هم وارد نمی‌کند)
    showLockScreen();
  } else {
    // بدون PIN: قفل اجباری نداریم؛ Session غیرفعال می‌ماند
    if(typeof showToast === 'function') showToast('نشست بسته شد');
  }
  updateLastVisitUI();
  if(rec && typeof showToast === 'function') showToast('از حساب خارج شدید');
}

function bufToHex(buf){
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function hexToBuf(hex){
  const arr = new Uint8Array(hex.length/2);
  for(let i=0;i<arr.length;i++) arr[i] = parseInt(hex.substr(i*2,2), 16);
  return arr;
}
function randomSaltHex(bytes){
  const a = new Uint8Array(bytes || 16);
  crypto.getRandomValues(a);
  return bufToHex(a);
}
async function pbkdf2Hash(pin, saltHex){
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(String(pin)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt: hexToBuf(saltHex),
    iterations: PBKDF2_ITERS,
    hash: 'SHA-256'
  }, keyMaterial, 256);
  return bufToHex(bits);
}
// سازگاری با هش قدیمی SHA-256 بدون salt
async function legacySha256(pin){
  const enc = new TextEncoder().encode(String(pin));
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return bufToHex(buf);
}
/* --- PIN / lock crypto helpers --- */
function loadPinRecord(){
  const raw = localStorage.getItem(PIN_KEY);
  if(!raw) return null;
  try{
    const obj = JSON.parse(raw);
    if(obj && obj.v === 2 && obj.salt && obj.hash) return obj;
  }catch(e){}
  // فرمت قدیمی: فقط رشته هش
  return {v:1, hash: raw, salt: null};
}
function savePinRecord(rec){
  localStorage.setItem(PIN_KEY, JSON.stringify(rec));
}
async function verifyPin(pin){
  const rec = loadPinRecord();
  if(!rec) return false;
  if(rec.v === 2){
    const h = await pbkdf2Hash(pin, rec.salt);
    return h === rec.hash;
  }
  // مهاجرت از نسخه ۱
  const legacy = await legacySha256(pin);
  if(legacy === rec.hash){
    const salt = randomSaltHex(16);
    const hash = await pbkdf2Hash(pin, salt);
    savePinRecord({v:2, salt, hash, dataSalt: randomSaltHex(16)});
    return true;
  }
  return false;
}
async function storeNewPin(pin){
  const salt = randomSaltHex(16);
  const hash = await pbkdf2Hash(pin, salt);
  const dataSalt = randomSaltHex(16);
  savePinRecord({v:2, salt, hash, dataSalt});
}
function isEncryptedEnvelope(obj){
  return !!(obj && obj.enc === true && obj.ct && obj.iv && obj.salt);
}
async function deriveAesKey(pin, dataSaltHex){
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(String(pin)), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {name:'PBKDF2', salt:hexToBuf(dataSaltHex), iterations:DATA_KDF_ITERS, hash:'SHA-256'},
    keyMaterial,
    {name:'AES-GCM', length:256},
    false,
    ['encrypt','decrypt']
  );
}
async function ensureSessionKey(pin){
  let rec = loadPinRecord();
  if(!rec || rec.v !== 2) return null;
  if(!rec.dataSalt){
    rec = Object.assign({}, rec, {dataSalt: randomSaltHex(16)});
    savePinRecord(rec);
  }
  sessionCryptoKey = await deriveAesKey(pin, rec.dataSalt);
  return sessionCryptoKey;
}
async function encryptPayload(payload, key){
  const rec = loadPinRecord();
  let dataSalt = rec && rec.dataSalt ? rec.dataSalt : randomSaltHex(16);
  if(rec && !rec.dataSalt) savePinRecord(Object.assign({}, rec, {dataSalt:dataSalt}));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(payload));
  const ctBuf = await crypto.subtle.encrypt({name:'AES-GCM', iv:iv}, key, plain);
  return {
    v:3, enc:true, alg:'AES-GCM', kdf:'PBKDF2-SHA256', iter:DATA_KDF_ITERS,
    salt:dataSalt, iv:bufToHex(iv), ct:bufToHex(ctBuf)
  };
}
async function decryptEnvelope(env, pin){
  if(!isEncryptedEnvelope(env)) throw new Error('not encrypted');
  const key = await deriveAesKey(pin, env.salt);
  const plainBuf = await crypto.subtle.decrypt(
    {name:'AES-GCM', iv:hexToBuf(env.iv)},
    key,
    hexToBuf(env.ct)
  );
  return JSON.parse(new TextDecoder().decode(plainBuf));
}
async function unlockDataLayer(pin){
  await ensureSessionKey(pin);
  if(window._pendingEncStore){
    try{
      const data = await decryptEnvelope(window._pendingEncStore, pin);
      applyStatePayload(data);
      window._pendingEncStore = null;
      // مهاجرت fcEvents بعد از بارگذاری واقعی
      if((!fcEvents || !fcEvents.length) && notebook && notebook.length){
        notebook.forEach(e=>{
          if(e && (e.type === 'payment' || e.type === 'deposit')){
            fcEvents.push({id:e.id, type:e.type, amount:e.amount, date:e.date, time:e.time||''});
          }
        });
      }
      if(typeof ensureNotebookMonth === 'function') ensureNotebookMonth();
      await writeStore(getStatePayload());
    }catch(err){
      sessionCryptoKey = null;
      throw err;
    }
  } else {
    await writeStore(getStatePayload());
  }
}
async function buildBackupBlob(){
  // بکاپ همیشه JSON خام برای بازیابی مطمئن
  const payload = getStatePayload();
  return JSON.stringify(payload, null, 2);
}
async function parseBackupText(raw){
  const d = JSON.parse(raw);
  if(isEncryptedEnvelope(d) || (d && d.magic === BACKUP_MAGIC && d.enc)){
    return {encrypted:true, env:d};
  }
  return {encrypted:false, data:d};
}
function getFailState(){
  const fails = parseInt(sessionStorage.getItem(PIN_FAIL_KEY)||'0', 10) || 0;
  const until = parseInt(sessionStorage.getItem(PIN_LOCKUNTIL_KEY)||'0', 10) || 0;
  return {fails, until};
}
function registerFail(){
  const st = getFailState();
  const fails = st.fails + 1;
  sessionStorage.setItem(PIN_FAIL_KEY, String(fails));
  if(fails >= PIN_MAX_FAILS){
    sessionStorage.setItem(PIN_LOCKUNTIL_KEY, String(Date.now() + PIN_LOCK_MS));
    sessionStorage.setItem(PIN_FAIL_KEY, '0');
  }
}
function clearFails(){
  sessionStorage.removeItem(PIN_FAIL_KEY);
  sessionStorage.removeItem(PIN_LOCKUNTIL_KEY);
}
function lockRemainingMs(){
  const until = parseInt(sessionStorage.getItem(PIN_LOCKUNTIL_KEY)||'0', 10) || 0;
  return Math.max(0, until - Date.now());
}

function getOwnerDisplayName(){
  try{
    if(typeof ownerProfile === 'object' && ownerProfile && String(ownerProfile.name||'').trim()){
      return String(ownerProfile.name).trim().slice(0, 60);
    }
  }catch(e){}
  return '';
}
/** Username امنیتی — مستقل از نام نمایشی مالک، متعلق به همان پروفایل */
function getLoginUsername(){
  try{
    if(typeof ownerProfile === 'object' && ownerProfile && String(ownerProfile.username||'').trim()){
      return String(ownerProfile.username).trim().slice(0, 32);
    }
  }catch(e){}
  try{
    const legacy = String(localStorage.getItem(USERNAME_KEY)||'').trim();
    if(legacy) return legacy;
  }catch(e){}
  return DEFAULT_USERNAME;
}
function saveLoginUsername(value){
  const username=String(value||'').trim().slice(0, 32);
  if(username.length < 3) return false;
  try{
    if(typeof ownerProfile !== 'object' || !ownerProfile) ownerProfile = { name: '', username: '', avatar: '' };
    ownerProfile.username = username;
    try{ localStorage.setItem(USERNAME_KEY, username); }catch(e){}
    if(typeof persist === 'function') persist();
    if(typeof renderOwnerProfile === 'function') renderOwnerProfile();
    if(typeof syncOwnerNameDependents === 'function') syncOwnerNameDependents();
  }catch(e){ return false; }
  return true;
}
/* --- Lock screen & session gate --- */
function refreshPinStatus(){
  const rec=loadPinRecord(),username=getLoginUsername();
  if($('loginUsername'))$('loginUsername').value=username;
  $('pinStatus').textContent=rec?`رمز فعال · AES-GCM · کاربر: ${username}`:'بدون رمز — داده و بکاپ به‌صورت JSON ذخیره می‌شوند';
}
function showLockScreen(){
  $('lockScreen').style.display='flex';$('lockUsername').value='';$('lockInput').value='';$('lockErr').textContent='';
  setTimeout(()=>$('lockUsername').focus(),50);
}
async function checkLock(){
  const rec = loadPinRecord();
  // داده رمزشدهٔ pending → Session نامعتبر + قفل
  if(window._pendingEncStore){
    clearSession();
    showLockScreen();
    return;
  }
  // بازیابی Session پس از Refresh — بدون Login جدید و بدون تغییر Last Visit
  const sess = restoreOrMigrateSession();
  if(sess && sess.authenticated === true && sess.status === 'active'){
    try{ updateLastVisitUI(); }catch(e){}
    return;
  }
  // بدون PIN: قفل اجباری نیست
  if(!rec){
    try{ updateLastVisitUI(); }catch(e){}
    return;
  }
  // PIN فعال و Session معتبر نیست → ورود
  showLockScreen();
}
function triggerLoginError(){const box=$('lockBox');if(!box)return;box.classList.remove('login-error');void box.offsetWidth;box.classList.add('login-error');}
$('lockUnlockBtn').addEventListener('click',async()=>{
  const wait=lockRemainingMs();
  if(wait>0){$('lockErr').textContent=`تلاش بیش از حد — ${Math.ceil(wait/1000)} ثانیه صبر کنید`;triggerLoginError();return;}
  const username=String($('lockUsername').value||'').trim(),entered=$('lockInput').value;
  if(!username||username.length<3){$('lockErr').textContent='نام کاربری را وارد کنید';triggerLoginError();return;}
  if(!entered){$('lockErr').textContent='رمز عبور را وارد کنید';triggerLoginError();return;}
  try{
    const ok=username.toLowerCase()===getLoginUsername().toLowerCase()&&await verifyPin(entered);
    if(ok){
      try{ await unlockDataLayer(entered); }
      catch(err){ $('lockErr').textContent='دادهٔ رمزگذاری‌شده باز نشد — رمز یا فایل ذخیره را بررسی کنید'; triggerLoginError(); return; }
      clearFails();
      // Login موفق: Previous Last Visit فریز + ثبت زمان ورود فعلی + Session فعال
      createActiveSession();
      $('lockScreen').style.display='none';$('lockInput').value='';$('lockErr').textContent='';
      updateLastVisitUI();
      render();
    }
    else{registerFail();$('lockInput').value='';const left=PIN_MAX_FAILS-(getFailState().fails||0),rem=lockRemainingMs();triggerLoginError();$('lockErr').textContent=rem>0?`ورود ناموفق — ${Math.ceil(rem/1000)} ثانیه قفل شد`:`نام کاربری یا رمز عبور اشتباه است (تلاش باقی‌مانده: ${Math.max(left,1)})`;}
  }catch(err){$('lockErr').textContent='خطا در بررسی اطلاعات ورود';triggerLoginError();}
});
$('lockUsername').addEventListener('keydown',e=>{if(e.key==='Enter')$('lockInput').focus();});
$('lockInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('lockUnlockBtn').click();});
if($('loginUsername')){
  $('loginUsername').readOnly=false;
  $('loginUsername').addEventListener('change',()=>{
    const value=($('loginUsername').value||'').trim();
    if(value.length<3||value.length>32){showToast('نام کاربری باید بین ۳ تا ۳۲ کاراکتر باشد',true);$('loginUsername').value=getLoginUsername();return;}
    if(saveLoginUsername(value)){refreshPinStatus();showToast('نام کاربری ذخیره شد');}
  });
}

$('pinSetBtn').addEventListener('click', async ()=>{
  const current = $('pinCurrent').value;
  const next = $('pinNew').value;
  let usernameInput = ($('loginUsername') && $('loginUsername').value.trim()) || getLoginUsername();
  const rec = loadPinRecord();
  if(!usernameInput || usernameInput.length < 3){ showToast('نام کاربری معتبر (حداقل ۳ کاراکتر) وارد کنید', true); return; }
  saveLoginUsername(usernameInput);
  if(!next || String(next).length < 4){ showToast('رمز جدید حداقل ۴ کاراکتر باشد', true); return; }
  if(rec){
    const ok = await verifyPin(current);
    if(!ok){ showToast('رمز فعلی درست نیست', true); return; }
  }
  try{
    await storeNewPin(next);
    await ensureSessionKey(next);
    await writeStore(getStatePayload());
    createActiveSession();
    clearFails();
    $('pinCurrent').value=''; $('pinNew').value='';
    showToast('رمز ذخیره شد — قفل ورود فعال است؛ داده به‌صورت JSON ذخیره می‌شود');
    refreshPinStatus();
    updateLastVisitUI();
  }catch(err){ showToast('ذخیره رمز ناموفق بود', true); }
});
$('pinRemoveBtn').addEventListener('click', async ()=>{
  const rec = loadPinRecord();
  if(!rec){ showToast('رمزی تنظیم نشده'); return; }
  const current = $('pinCurrent').value;
  const ok = await verifyPin(current);
  if(!ok){ showToast('رمز فعلی درست نیست', true); return; }
  showConfirmModal(
    'حذف رمز عبور؟',
    'قفل ورود برای این دفتر غیرفعال می‌شود.',
    async ()=>{
      try{
        sessionCryptoKey = null;
        localStorage.removeItem(PIN_KEY);
        clearSession();
        localStorage.setItem(STORE_KEY, JSON.stringify(getStatePayload()));
        clearFails();
        $('pinCurrent').value='';
        showToast('رمز حذف شد — ذخیره بدون رمز');
        refreshPinStatus();
      }catch(err){ showToast('حذف رمز ناموفق', true); }
    }
  );
});

/* --- Startup sequence (order fixed) --- */
// پاکسازی یک‌باره تنظیمات قدیمی گیت‌هاب (این قابلیت حذف شده)
['daftar-gh-owner','daftar-gh-repo','daftar-gh-token'].forEach(k=>{
  try{ localStorage.removeItem(k); }catch(e){}
});

/* init: PIN UI → lock gate → load state → assets → date clock */
refreshPinStatus();
// Logout از منو
if($('menuLogoutBtn')){
  $('menuLogoutBtn').addEventListener('click', function(e){
    e.preventDefault();
    if(typeof showConfirmModal === 'function'){
      showConfirmModal('آیا قصد خروج دارید؟', 'نشست فعلی بسته می‌شود. داده‌های مالی و پروفایل حفظ می‌شوند.', function(){
        performLogout();
      }, 'خروج');
    } else if(window.confirm('آیا قصد خروج دارید؟')){
      performLogout();
    }
  });
}
// همگام UI آخرین بازدید پس از آماده شدن DOM
try{ updateLastVisitUI(); }catch(e){}

checkLock();
loadAll();
ensureCoreAssets();
scheduleDateRollover();
updateTopbarDate();

/* ================= AUTO BACKUP (IndexedDB, local-only) ================= */
const AUTO_BACKUP_CFG_KEY = 'daftar-auto-backup-cfg';
const AUTO_BACKUP_DB = 'daftar-auto-backup-db';
const AUTO_BACKUP_STORE = 'backups';
const AUTO_BACKUP_MAX = 5;

function loadAutoBackupCfg(){
  try{
    const raw = localStorage.getItem(AUTO_BACKUP_CFG_KEY);
    if(!raw) return { enabled: false, interval: 'weekly', lastRun: 0 };
    const o = JSON.parse(raw);
    return {
      enabled: !!o.enabled,
      interval: (o.interval === 'daily' ? 'daily' : 'weekly'),
      lastRun: parseInt(o.lastRun, 10) || 0
    };
  }catch(e){ return { enabled: false, interval: 'weekly', lastRun: 0 }; }
}
function saveAutoBackupCfg(cfg){
  try{ localStorage.setItem(AUTO_BACKUP_CFG_KEY, JSON.stringify(cfg)); }catch(e){}
}
function openBackupDb(){
  return new Promise(function(resolve, reject){
    if(!window.indexedDB){ reject(new Error('no idb')); return; }
    const req = indexedDB.open(AUTO_BACKUP_DB, 1);
    req.onupgradeneeded = function(){
      const db = req.result;
      if(!db.objectStoreNames.contains(AUTO_BACKUP_STORE)){
        db.createObjectStore(AUTO_BACKUP_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = function(){ resolve(req.result); };
    req.onerror = function(){ reject(req.error); };
  });
}
async function saveBackupToIdb(payload){
  const db = await openBackupDb();
  return new Promise(function(resolve, reject){
    let settled = false;
    const done = function(err, id){
      if(settled) return;
      settled = true;
      try{ db.close(); }catch(e){}
      if(err) reject(err); else resolve(id);
    };
    const tx = db.transaction(AUTO_BACKUP_STORE, 'readwrite');
    const store = tx.objectStore(AUTO_BACKUP_STORE);
    const id = 'ab_' + Date.now();
    const ts = Date.now();
    // اول همه را بخوان، بعد put + حذف قدیمی‌ها در همان transaction
    const getAll = store.getAll();
    getAll.onsuccess = function(){
      try{
        const rows = (getAll.result || []).slice();
        store.put({ id: id, ts: ts, data: payload });
        rows.push({ id: id, ts: ts });
        rows.sort(function(a,b){ return (b.ts||0)-(a.ts||0); });
        rows.slice(AUTO_BACKUP_MAX).forEach(function(r){
          if(r && r.id) store.delete(r.id);
        });
      }catch(e){ done(e); }
    };
    getAll.onerror = function(){ done(getAll.error || new Error('idb getAll')); };
    tx.oncomplete = function(){ done(null, id); };
    tx.onerror = function(){ done(tx.error || new Error('idb tx')); };
    tx.onabort = function(){ done(tx.error || new Error('idb abort')); };
  });
}
async function checkStorageWarning(){
  const el = document.getElementById('storageWarn');
  if(!el) return;
  try{
    if(navigator.storage && navigator.storage.estimate){
      const est = await navigator.storage.estimate();
      const usage = est.usage || 0;
      const quota = est.quota || 1;
      const ratio = usage / quota;
      if(ratio >= 0.85){
        el.style.display = '';
        el.textContent = 'هشدار: فضای ذخیره‌سازی مرورگر نزدیک به پر شدن است (' + Math.round(ratio*100) + '٪). یک پشتیبان دستی دانلود کنید.';
      } else {
        el.style.display = 'none';
        el.textContent = '';
      }
    }
  }catch(e){}
}
async function runAutoBackupIfDue(){
  const cfg = loadAutoBackupCfg();
  updateAutoBackupStatusUI(cfg);
  await checkStorageWarning();
  if(!cfg.enabled) return;
  const intervalMs = cfg.interval === 'daily' ? 86400000 : 604800000;
  const now = Date.now();
  if(cfg.lastRun && (now - cfg.lastRun) < intervalMs) return;
  try{
    if(typeof getStatePayload !== 'function') return;
    const payload = getStatePayload();
    // فقط کپی داده — بدون تغییر state اصلی
    await saveBackupToIdb(JSON.parse(JSON.stringify(payload)));
    cfg.lastRun = now;
    saveAutoBackupCfg(cfg);
    updateAutoBackupStatusUI(cfg);
  }catch(e){ console.error('auto backup', e); }
}
function updateAutoBackupStatusUI(cfg){
  cfg = cfg || loadAutoBackupCfg();
  const el = document.getElementById('autoBackupStatus');
  const tog = document.getElementById('autoBackupToggle');
  const sel = document.getElementById('autoBackupInterval');
  if(tog) tog.checked = !!cfg.enabled;
  if(sel) sel.value = cfg.interval === 'daily' ? 'daily' : 'weekly';
  if(!el) return;
  if(!cfg.enabled){
    el.textContent = 'وضعیت: غیرفعال';
    return;
  }
  let last = 'هنوز اجرا نشده';
  if(cfg.lastRun){
    try{ last = new Date(cfg.lastRun).toLocaleString('fa-IR'); }catch(e){}
  }
  el.textContent = 'وضعیت: فعال · بازه: ' + (cfg.interval === 'daily' ? 'روزانه' : 'هفتگی') + ' · آخرین اجرا: ' + last;
}
function bindAutoBackupUI(){
  if(window.__autoBackupBound) return;
  window.__autoBackupBound = true;
  const tog = document.getElementById('autoBackupToggle');
  const sel = document.getElementById('autoBackupInterval');
  function persistCfg(){
    const cfg = loadAutoBackupCfg();
    cfg.enabled = !!(tog && tog.checked);
    cfg.interval = (sel && sel.value === 'daily') ? 'daily' : 'weekly';
    saveAutoBackupCfg(cfg);
    updateAutoBackupStatusUI(cfg);
    if(cfg.enabled) runAutoBackupIfDue();
  }
  if(tog) tog.addEventListener('change', persistCfg);
  if(sel) sel.addEventListener('change', persistCfg);
  updateAutoBackupStatusUI();
}
// init after DOM
if(typeof document !== 'undefined'){
  const bootAuto = function(){ bindAutoBackupUI(); setTimeout(function(){ runAutoBackupIfDue(); }, 1500); };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootAuto);
  else bootAuto();
}
