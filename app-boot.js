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
const PIN_FAIL_KEY = 'daftar-pin-fails';
const PIN_LOCKUNTIL_KEY = 'daftar-pin-lockuntil';
const PIN_MAX_FAILS = 5;
const PIN_LOCK_MS = 30000;
const PBKDF2_ITERS = 120000;

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
  if(!rec) return;
  if(window._pendingEncStore){
    sessionStorage.removeItem(UNLOCK_FLAG);
    showLockScreen();
    return;
  }
  if(sessionStorage.getItem(UNLOCK_FLAG)!=='1') showLockScreen();
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
      clearFails();sessionStorage.setItem(UNLOCK_FLAG,'1');$('lockScreen').style.display='none';$('lockInput').value='';$('lockErr').textContent='';
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
    sessionStorage.setItem(UNLOCK_FLAG, '1');
    clearFails();
    $('pinCurrent').value=''; $('pinNew').value='';
    showToast('رمز ذخیره شد — قفل ورود فعال است؛ داده به‌صورت JSON ذخیره می‌شود');
    refreshPinStatus();
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
checkLock();
loadAll();
ensureCoreAssets();
scheduleDateRollover();
updateTopbarDate();
