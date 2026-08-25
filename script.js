const $ = id => document.getElementById(id);
const fmt = n => {
  const v = Number(n);
  if(!isFinite(v) || isNaN(v)) return '0';
  return Math.round(v).toLocaleString('en-US');
};
// اعداد فارسی/عربی (۰-۹ و ٠-٩) را به رقم لاتین تبدیل می‌کند تا با کیبورد فارسی سیستم، ورودی به‌اشتباه صفر/ناقص پارس نشود
const FA_AR_DIGITS = {'۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
  '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
const normalizeDigits = str => String(str||'').replace(/[۰-۹٠-٩]/g, ch => FA_AR_DIGITS[ch] || ch);
const parseMoney = str => {
  const v = parseFloat(normalizeDigits(str).replace(/,/g,'').replace(/[^\d.]/g,''));
  return (isFinite(v) && !isNaN(v)) ? v : NaN;
};

/* ================= LANGUAGE & FONT ================= */
const LANG_KEY = 'daftar-language';
const FONT_KEY = 'daftar-font';
const VALID_LANGS = ['fa','en'];
const VALID_FONTS = ['Vazirmatn','Noto Sans Arabic','IBM Plex Sans Arabic','Cairo'];
const FONT_STACKS = {
  'Vazirmatn': "'Vazirmatn',sans-serif",
  'Noto Sans Arabic': "'Noto Sans Arabic',sans-serif",
  'IBM Plex Sans Arabic': "'IBM Plex Sans Arabic',sans-serif",
  'Cairo': "'Cairo',sans-serif"
};
const I18N = {
  'مبحث درآمد':'Income Ledger','انصراف':'Cancel','حذف کن':'Delete','🔒 دفتر مالی قفل است':'🔒 Financial Ledger Locked',
  'برای ادامه، رمز عبور را وارد کنید':'Enter your password to continue','باز کردن':'Unlock','خانه':'Home','دارایی‌ها':'Assets',
  'دارایی غیرنقد':'Non-cash Assets','سود اسنپ':'Snapp Profit','تراکنش‌ها':'Transactions','تاریخچه':'History','تنظیمات':'Settings',
  'جمع کل دارایی (نقدی + سرمایه‌گذاری)':'Total Assets (Cash + Investments)','سرمایه‌گذاری:':'Investments:','نقدینگی:':'Cash:',
  'آمار دارایی‌ها':'Asset Statistics','سهم هر دارایی از مجموع نقدینگی و سرمایه‌گذاری را در یک نگاه ببینید.':'Each asset\'s share of the total ledger',
  'جمع کل':'Total','روی هر دارایی بزن تا جزئیاتش را ببینی':'Tap an asset to see its details','روند کلی دارایی':'Overall Asset Trend',
  'روند تغییر ارزش کل دارایی را در بازه زمانی انتخاب‌شده دنبال کنید.':'Change in total assets over the selected period',
  '۲۴ ساعت':'24 Hours','۱ هفته':'1 Week','۱ ماه':'1 Month','۱ سال':'1 Year',
  'داده کافی برای این بازه هنوز ثبت نشده — با هر تغییر دارایی یه نقطه جدید اضافه می‌شه':'Not enough data for this range yet — a new point is added whenever an asset changes',
  'این نمودار فقط از لحظه‌ای که این ویژگی اضافه شد نقطه ثبت می‌کنه؛ سابقه قبل از اون رو نداره.':'This chart only records points since this feature was added; earlier history is unavailable.',
  'پیش‌بینی مالی ماهانه':'Monthly Financial Forecast','برآورد هزینه ماه بر پایه پرداخت‌های اخیر؛ دریافتی‌ها فقط برای سنجش توان مالی لحاظ می‌شوند.':'Expenses are based on the last 15 payments this month; income is used only to calculate financial capacity.',
  'ماه:':'Month:','موجودی:':'Balance:','تراکنش:':'Transactions:','روز داده:':'Data Days:','روز باقی‌مانده:':'Days Remaining:',
  'خرج ماهانه پیش‌بینی‌شده':'Projected Monthly Expense','منابع مالی':'Financial Resources','توان مالی (۸۰٪ منابع)':'Financial Capacity (80% of Resources)',
  'نسبت فشار مالی':'Financial Pressure Ratio','کسری بودجه':'Budget Deficit','فشار مالی':'Financial Pressure',
  'با ثبت پرداخت‌های جدید، این پیش‌بینی خودکار به‌روز می‌شود.':'This forecast updates automatically when new payments are recorded.',
  'مبلغ تغییر را وارد کنید و با + یا − موجودی را به‌روزرسانی کنید؛ حذف با × انجام می‌شود.':'Enter an amount and press + or − · Remove with ×',
  'یک دارایی جدید به فهرست نقدینگی یا سرمایه‌گذاری اضافه کنید.':'Add New Cash/Investment Asset','نام دارایی':'Asset Name','دسته':'Category','سرمایه‌گذاری':'Investment',
  'نقدینگی':'Cash','موجودی اولیه (تومان — اختیاری)':'Initial Balance (Toman — optional)','افزودن دارایی جدید':'Add New Asset',
  'دارایی‌های غیرنقد':'Non-cash Assets','افزودن مورد جدید از فرم پایین؛ برای اصلاح همان مورد از دکمه ویرایش استفاده کنید (جایگزین می‌شود، نه اضافه).':'Estimated value — not included in official total assets',
  'ارزش کل دارایی‌های غیرنقد':'Total Non-cash Asset Value','تومان':'Toman','تخمینی · غیررسمی':'Estimated · unofficial','افزودن مورد جدید':'Add New Item',
  'طلا':'Gold','نقره':'Silver','دلار':'US Dollar','سکه':'Coin','حساب سپرده':'Deposit Account','بورس':'Stock Market','سایر':'Other',
  'توضیح کوتاه':'Short Description','ارزش تقریبی (تومان)':'Approximate Value (Toman)','افزودن':'Add',
  'ثبت سود روزانه اسنپ':'Record Daily Snapp Profit','تاریخ (شمسی)':'Date (Jalali)','سود آن روز (تومان)':'Daily Profit (Toman)',
  'ثبت سود، خودکار همین مبلغ رو هم به موجودی اسنپ اضافه می‌کنه.':'Recording profit also automatically adds the same amount to the Snapp balance.',
  'ثبت سود':'Record Profit','میانگین نرخ روزانه':'Average Daily Rate','نرخ روزانه':'Daily Rate','سود پیش‌بینی فردا':'Projected Tomorrow Profit',
  'سود مرکب ۳۰ روز آینده':'30-Day Compound Profit','موجودی پس از ۳۰ روز':'Balance After 30 Days','ثبت تراکنش جدید':'New Transaction',
  'نوع تراکنش':'Transaction Type','دریافتی':'Income','پرداخت':'Payment','قرض داده':'Lent','قرض گرفته':'Borrowed','شخص':'Person',
  'مبلغ (تومان)':'Amount (Toman)','ساعت':'Time','توضیحات':'Description','ثبت تراکنش':'Record Transaction','قرض‌ها':'Loans',
  'قرض‌های داده‌شده و گرفته‌شده را ثبت کنید و وضعیت تسویه هر مورد را مشخص کنید.':'Lent and borrowed money — mark settlement status',
  'قرض باقی‌مانده (تسویه‌نشده)':'Outstanding Loans','تراکنش‌های ثبت‌شده':'Recorded Transactions','خلاصه دسته‌ها':'Category Summary',
  'محاسبه‌گر پایین صفحه (جدا از دارایی رسمی کارت)':'Calculator Below (Separate from Official Card Asset)','پایه — موجودی فعلی کارت':'Base — Current Card Balance',
  'جمع تراکنش‌های این بخش':'Total Transactions Here','موجودی محاسبه‌شده':'Calculated Balance','ثبت موجودی کارت':'Save Card Balance',
  'تاریخچه تغییرات دارایی':'Asset Change History','تغییرات دارایی را بر اساس زمان یا نوع تغییر فیلتر کنید؛ لیست‌های طولانی قابل اسکرول هستند.':'Filter and sort records — the list becomes scrollable above 15 items',
  'جدیدترین':'Newest','قدیمی‌ترین':'Oldest','نمایش کسری‌ها':'Show Deficits','نمایش دریافتی‌ها':'Show Income','تاریخچه جمع کل دارایی':'Total Asset History',
  'ثبت وضعیت امروز':'Record Today\'s Status','🎨 تم':'🎨 Theme','ظاهر موردعلاقه‌تان را انتخاب کنید؛ انتخاب شما ذخیره می‌شود.':'Choose the app\'s overall appearance',
  'سرمه‌ای (پیش‌فرض)':'Navy (Default)','مشکی پلاتینیومی':'Platinum Black','مشکی طلایی':'Black & Gold','روشن':'Light',
  'انیمیشن':'Animation','برای عملکرد روان‌تر روی دستگاه‌های ضعیف، انیمیشن‌های تعاملی را خاموش کنید.':'Disable animations on lower-end devices',
  'انیمیشن‌های تعاملی':'Interactive Animations','ورود صفحه، منو، هاور کارت‌ها و پالس‌ها':'Page entry, menus, card hovers and pulses',
  '🔒 امنیت':'🔒 Security','🔓 رمز عبوری تنظیم نشده':'🔓 No password set','رمز فعلی':'Current Password','رمز جدید (حداقل ۴ رقم)':'New Password (min. 4 digits)',
  'تنظیم / تغییر رمز':'Set / Change Password','حذف رمز عبور':'Remove Password','پشتیبان‌گیری دستی (فایل)':'Manual Backup (File)',
  'دانلود فایل پشتیبان (JSON)':'Download Backup (JSON)','بازگردانی از فایل پشتیبان':'Restore from Backup','هدف رسید':'Goal Reached','🌐 زبان':'🌐 Language','زبان رابط کاربری را انتخاب کنید؛ فارسی پیش‌فرض است و English بر پایه استاندارد آمریکایی نمایش داده می‌شود.':'Choose the language used throughout the app','زبان':'Language','فارسی پیش‌فرض است · انگلیسی با استاندارد آمریکایی':'Persian is the default · English uses American English','فونت':'Font','فونت رابط کاربری را انتخاب کنید؛ انتخاب شما در کل برنامه اعمال و ذخیره می‌شود.':'Choose the font used throughout the interface','فونت سایت':'Site Font','Vazirmatn فونت پیش‌فرض فعلی است':'Vazirmatn is the current default font'
};
  I18N['نام کاربری ورود']='Login Username';
  I18N['نام کاربری برای ورود به دفتر؛ پیش‌فرض «admin» است.']='Username used to enter the ledger; default is “admin”.';
  I18N['نام کاربری']='Username'; I18N['رمز عبور']='Password';
  I18N['برای ورود، نام کاربری و رمز عبور خود را وارد کنید']='Enter your username and password to continue'; I18N['ورود']='Sign In';
  I18N['نام کاربری یا رمز عبور اشتباه است']='Incorrect username or password'; I18N['نام کاربری باید بین ۳ تا ۳۲ کاراکتر باشد']='Username must be 3–32 characters'; I18N['نام کاربری ذخیره شد']='Username saved';
  I18N['نرخ مؤثر سالانه (مرکب)']='Effective Annual Rate (compound)'; I18N['نرخ اسمی سالانه']='Nominal Annual Rate'; I18N['سود کل تا الان']='Total profit to date'; I18N['موجودی فعلی اسنپ']='Current Snapp balance'; I18N['ثبت موجودی نهایی کارت؟']='Save final card balance?'; I18N['آخرین تغییرات']='Latest changes'; I18N['شروع سابقه']='Start of history'; I18N['کاهش دارایی']='Asset decrease'; I18N['افزایش دارایی']='Asset increase';
  I18N['سهم هر دارایی از مجموع نقدینگی و سرمایه‌گذاری را در یک نگاه ببینید.']='See each asset’s share of total cash and investments at a glance.';
  I18N['روند تغییر ارزش کل دارایی را در بازه زمانی انتخاب‌شده دنبال کنید.']='Track changes in total asset value over the selected period.';
  I18N['برآورد هزینه ماه بر پایه پرداخت‌های اخیر؛ دریافتی‌ها فقط برای سنجش توان مالی لحاظ می‌شوند.']='Estimate monthly expenses from recent payments; income is used only to measure financial capacity.';
  I18N['مبلغ تغییر را وارد کنید و با + یا − موجودی را به‌روزرسانی کنید؛ حذف با × انجام می‌شود.']='Enter the change and use + or − to update the balance; remove with ×.';
  I18N['یک دارایی جدید به فهرست نقدینگی یا سرمایه‌گذاری اضافه کنید.']='Add a new cash or investment asset to your ledger.';
  I18N['افزودن مورد جدید از فرم پایین؛ برای اصلاح همان مورد از دکمه ویرایش استفاده کنید (جایگزین می‌شود، نه اضافه).']='Estimated value of assets excluded from the official cash-asset total.';
  I18N['کارت از لیست دارایی‌ها حذف شده؛ موجودی آن فقط از این بخش مدیریت می‌شود. «ثبت موجودی کارت» عدد محاسبه‌شده را به‌عنوان موجودی نهایی کارت ذخیره می‌کند.']='Card is managed only here. “Save Card Balance” stores the calculated amount as the final card balance.';
  I18N['قرض‌های داده‌شده و گرفته‌شده را ثبت کنید و وضعیت تسویه هر مورد را مشخص کنید.']='Track money lent or borrowed and mark each item when it is settled.';
  I18N['تغییرات دارایی را بر اساس زمان یا نوع تغییر فیلتر کنید؛ لیست‌های طولانی قابل اسکرول هستند.']='Filter asset changes by time or type; long lists can be scrolled.';
  I18N['ظاهر موردعلاقه‌تان را انتخاب کنید؛ انتخاب شما ذخیره می‌شود.']='Choose your preferred appearance; your selection is saved.';
  I18N['زبان رابط کاربری را انتخاب کنید؛ فارسی پیش‌فرض است و English بر پایه استاندارد آمریکایی نمایش داده می‌شود.']='Choose the interface language; Persian is default and English uses US English.';
  I18N['فونت رابط کاربری را انتخاب کنید؛ انتخاب شما در کل برنامه اعمال و ذخیره می‌شود.']='Choose the interface font; your selection is applied across the app and saved.';
  I18N['برای عملکرد روان‌تر روی دستگاه‌های ضعیف، انیمیشن‌های تعاملی را خاموش کنید.']='Disable interactive animations for smoother performance on lower-end devices.';
  I18N['اطلاعات این دفتر در همین مرورگر ذخیره می‌شود؛ برای جلوگیری از از دست رفتن داده‌ها، مرتب پشتیبان بگیرید.']='This ledger is stored in this browser; make regular backups to avoid data loss.';
function translateTextNode(node, lang){
  const raw = node.nodeValue;
  const key = raw.trim();
  if(!key) return;
  if(lang === 'en' && I18N[key]){
    const lead = raw.match(/^\s*/)?.[0] || '';
    const trail = raw.match(/\s*$/)?.[0] || '';
    node.nodeValue = lead + I18N[key] + trail;
  }else if(lang === 'fa' && node.__faOriginal){
    node.nodeValue = node.__faOriginal;
  }
}
function translateDOM(lang){
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(n=>{
    if(n.__faOriginal === undefined) n.__faOriginal = n.nodeValue;
    if(lang === 'en') translateTextNode(n,'en'); else n.nodeValue = n.__faOriginal;
  });
  document.documentElement.lang = lang === 'en' ? 'en-US' : 'fa';
  document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
  document.documentElement.setAttribute('data-lang', lang);
  const sel=$('languageSelect'); if(sel) sel.value=lang;
  updateTopbarDate();
}
function updateLoginPlaceholders(lang){
  const u=$('lockUsername'), p=$('lockInput'), s=$('loginUsername');
  if(lang==='en'){ if(u)u.placeholder=''; if(p)p.placeholder='Password'; if(s)s.placeholder='admin'; }
  else { if(u)u.placeholder=''; if(p)p.placeholder='رمز عبور'; if(s)s.placeholder='admin'; }
}
function applyLanguage(lang){
  if(!VALID_LANGS.includes(lang)) lang='fa';
  try{localStorage.setItem(LANG_KEY,lang);}catch(e){}
  translateDOM(lang);
  updateLoginPlaceholders(lang);
}
function applyFont(font){
  if(!VALID_FONTS.includes(font)) font='Vazirmatn';
  document.documentElement.style.setProperty('--app-font', FONT_STACKS[font]);
  try{localStorage.setItem(FONT_KEY,font);}catch(e){}
  const sel=$('fontSelect'); if(sel) sel.value=font;
}
(function initLanguageAndFont(){
  let lang='fa', font='Vazirmatn';
  try{
    lang=localStorage.getItem(LANG_KEY)||'fa';
    const fontMigration=localStorage.getItem('daftar-font-v2');
    if(fontMigration!=='1'){
      font='Vazirmatn';
      localStorage.setItem(FONT_KEY,'Vazirmatn');
      localStorage.setItem('daftar-font-v2','1');
    }else{
      font=localStorage.getItem(FONT_KEY)||'Vazirmatn';
    }
  }catch(e){}
  applyFont(font);
  document.addEventListener('DOMContentLoaded',()=>applyLanguage(lang),{once:true});
})();
if($('languageSelect')) $('languageSelect').addEventListener('change',e=>applyLanguage(e.target.value));
if($('fontSelect')) $('fontSelect').addEventListener('change',e=>applyFont(e.target.value));
const langObserver = new MutationObserver(mutations=>{
  const lang=document.documentElement.getAttribute('data-lang')||'fa';
  if(lang!=='en') return;
  mutations.forEach(m=>m.addedNodes.forEach(n=>{
    if(n.nodeType===Node.TEXT_NODE){ if(n.__faOriginal===undefined)n.__faOriginal=n.nodeValue; translateTextNode(n,'en'); }
    else if(n.nodeType===Node.ELEMENT_NODE){
      const walker=document.createTreeWalker(n,NodeFilter.SHOW_TEXT); const arr=[]; while(walker.nextNode())arr.push(walker.currentNode);
      arr.forEach(x=>{if(x.__faOriginal===undefined)x.__faOriginal=x.nodeValue;translateTextNode(x,'en');});
    }
  }));
});
langObserver.observe(document.body,{childList:true,subtree:true});


/* ================= THEME ================= */
const THEME_KEY = 'daftar-theme';
const ANIM_KEY = 'daftar-anim';
const APP_VERSION = '2.03';
const VALID_THEMES = ['dark','matte-green','teal-navy','black','gold','light','warm-sand','finverse-violet'];
/** نرمال‌سازی نام تم — نام‌های قدیمی/غلط را اصلاح می‌کند */
function normalizeThemeId(t){
  t = String(t || '').trim().toLowerCase();
  if(t === 'finverse' || t === 'finance-blue' || t === 'finverse-blue' || t === 'finverse_blue') return 'finverse-violet';
  if(t === 'finverse_violet' || t === 'finverseviolet') return 'finverse-violet';
  return t;
}
function applyTheme(t){
  t = normalizeThemeId(t);
  if(!VALID_THEMES.includes(t)) t = 'dark';
  const root = document.documentElement;
  // attribute اصلی سیستم Theme
  root.setAttribute('data-theme', t);
  // کلاس کمکی برای selectorهای پشتیبان CSS
  VALID_THEMES.forEach(name => root.classList.remove('theme-' + name));
  root.classList.add('theme-' + t);
  try{ localStorage.setItem(THEME_KEY, t); }catch(e){}
  document.querySelectorAll('.theme-card').forEach(c=>{
    const val = (c.getAttribute('data-theme-val') || c.dataset.themeVal || '').trim();
    c.classList.toggle('active', normalizeThemeId(val) === t);
  });
}
// Event delegation — کلیک روی فرزند (preview/name) هم کار می‌کند
document.addEventListener('click', (e)=>{
  const card = e.target && e.target.closest && e.target.closest('.theme-card');
  if(!card) return;
  const val = card.getAttribute('data-theme-val') || card.dataset.themeVal;
  if(val) applyTheme(val);
});
if($('themeDayNight')){
  $('themeDayNight').addEventListener('click', ()=>{
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    const lightLike = (cur === 'light' || cur === 'warm-sand');
    applyTheme(lightLike ? 'dark' : 'light');
  });
}
(function initTheme(){
  let saved = 'dark';
  try{ saved = localStorage.getItem(THEME_KEY) || 'dark'; }catch(e){}
  applyTheme(saved);
})();

function applyAnimPref(on){
  const enabled = on !== false && on !== '0' && on !== 'off';
  document.documentElement.setAttribute('data-anim', enabled ? 'on' : 'off');
  try{ localStorage.setItem(ANIM_KEY, enabled ? 'on' : 'off'); }catch(e){}
  const toggle = $('animToggle');
  if(toggle) toggle.checked = enabled;
}
(function initAnim(){
  let saved = 'on';
  try{ saved = localStorage.getItem(ANIM_KEY) || 'on'; }catch(e){}
  // اگر سیستم prefers-reduced-motion دارد و کاربر هنوز انتخاب نکرده
  try{
    if(!localStorage.getItem(ANIM_KEY) && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      saved = 'off';
    }
  }catch(e){}
  applyAnimPref(saved === 'on');
})();
document.addEventListener('DOMContentLoaded', ()=>{});
const _animToggle = ()=>{
  const t = $('animToggle');
  if(!t) return;
  t.addEventListener('change', ()=> applyAnimPref(t.checked));
};
_animToggle();

/* ================= SCROLL REVEAL ================= */
const revealObserver = new IntersectionObserver((entries)=>{
  entries.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('in-view'); revealObserver.unobserve(en.target); } });
}, {threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));

/* ================= HAMBURGER MENU & PAGE NAVIGATION ================= */
function openMenu(){
  document.body.classList.add('menu-open');
  const back = $('menuBackdrop');
  const btn = $('menuToggle');
  if(back) back.setAttribute('aria-hidden','false');
  if(btn){ btn.classList.add('open'); btn.setAttribute('aria-expanded','true'); }
  document.body.style.overflow = 'hidden';
}
function closeMenu(){
  document.body.classList.remove('menu-open');
  const back = $('menuBackdrop');
  const btn = $('menuToggle');
  if(back) back.setAttribute('aria-hidden','true');
  if(btn){ btn.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }
  document.body.style.overflow = '';
}
if($('menuToggle')){
  $('menuToggle').setAttribute('aria-expanded','false');
  $('menuToggle').addEventListener('click', ()=>{
    if(document.body.classList.contains('menu-open')) closeMenu(); else openMenu();
  });
}
if($('menuBackdrop')) $('menuBackdrop').addEventListener('click', closeMenu);
if($('menuCloseBtn')) $('menuCloseBtn').addEventListener('click', closeMenu);
document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape' && document.body.classList.contains('menu-open')) closeMenu();
});

const PAGE_TITLES = {
  'page-dashboard': 'خانه',
  'page-assets': 'دارایی‌ها',
  'page-noncash': 'دارایی غیرنقد',
  'page-snapp': 'سود اسنپ',
  'page-notebook': 'تراکنش‌ها',
  'page-history': 'تاریخچه',
  'page-notes': 'دفترچه یادداشت',
  'page-settings': 'تنظیمات',
};

function formatJalaliHeaderDate(d){
  try{
    const date = d instanceof Date ? d : new Date();
    const gy = date.getFullYear(), gm = date.getMonth()+1, gd = date.getDate();
    const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
    const weeks = (typeof JWEEKS !== 'undefined' && JWEEKS) ? JWEEKS : ['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه'];
    const months = (typeof JMONTHS !== 'undefined' && JMONTHS) ? JMONTHS : ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
    const week = weeks[date.getDay()] || '';
    const month = months[jm-1] || '';
    return week + ' · ' + jd + ' ' + month + ' ' + jy;
  }catch(err){
    return '—';
  }
}

let _lastDayKey = '';

function dayKey(d){
  const x = d instanceof Date ? d : todayDate();
  return x.getFullYear() + '-' + pad2(x.getMonth()+1) + '-' + pad2(x.getDate());
}

function syncAllDatesToHeader(){
  // همهٔ تاریخ‌های پیش‌فرض و نمایشی با هدر هم‌زمان شوند
  updateTopbarDate();
  if(typeof ensureNotebookMonth === 'function') ensureNotebookMonth();
  try{
    // انتخابگرهای شمسی را روی «امروز» بگذار
    if(typeof setJalaliPickerToToday === 'function'){
      setJalaliPickerToToday('logDateDay','logDateMonth','logDateYear');
      setJalaliPickerToToday('nbDateDay','nbDateMonth','nbDateYear');
    }
    if($('nbTime')) if($('nbTime')) $('nbTime').value = todayDate().toTimeString().slice(0,5);
  }catch(e){}
}

function updateTopbarDate(){
  const el = $('topbarDate');
  if(el) el.textContent = formatJalaliHeaderDate(todayDate());
  const g = $('topbarDateGreg');
  if(g){
    const d = todayDate();
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    g.textContent = days[d.getDay()] + ' · ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }
}

function scheduleDateRollover(){
  const now = todayDate();
  const key = dayKey(now);
  if(key !== _lastDayKey){
    _lastDayKey = key;
    syncAllDatesToHeader();
  } else {
    updateTopbarDate();
  }
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, 0, 0, 2, 0);
  const ms = Math.max(1000, next.getTime() - now.getTime());
  setTimeout(scheduleDateRollover, ms);
  if(!window._datePoll){
    window._datePoll = setInterval(()=>{
      const k = dayKey(todayDate());
      if(k !== _lastDayKey){
        _lastDayKey = k;
        syncAllDatesToHeader();
      } else {
        updateTopbarDate();
      }
    }, 30 * 1000);
  }
}

function showPage(pageId){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const target = document.getElementById(pageId);
  if(target) target.classList.add('active');
  document.querySelectorAll('.menu-item').forEach(m=>{
    m.classList.toggle('active', m.dataset.page === pageId);
  });
  window.scrollTo(0, 0);
  closeMenu();
  if(pageId === 'page-noncash' && typeof ensureMarketPrices === 'function'){
    ensureMarketPrices(false);
  }
}
document.querySelectorAll('.menu-item').forEach(item=>{
  item.addEventListener('click', (e)=>{
    e.preventDefault();
    showPage(item.dataset.page);
  });
});

/* ================= JALALI DATES ================= */
function gregorianToJalali(gy, gm, gd){
  const g_d_m = [0,31,59,90,120,151,181,212,243,273,304,334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365*gy) + (Math.floor((gy2+3)/4)) - (Math.floor((gy2+99)/100)) + (Math.floor((gy2+399)/400)) - 80 + gd + g_d_m[gm-1];
  jy += 33*(Math.floor(days/12053));
  days %= 12053;
  jy += 4*(Math.floor(days/1461));
  days %= 1461;
  if(days > 365){ jy += Math.floor((days-1)/365); days = (days-1)%365; }
  const jm = (days < 186) ? 1+Math.floor(days/31) : 7+Math.floor((days-186)/30);
  const jd = 1 + ((days < 186) ? (days%31) : ((days-186)%30));
  return [jy, jm, jd];
}
const JMONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const JWEEKS = ['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه']; // getDay(): 0=یکشنبه

function toJalaliStr(isoDate){
  if(!isoDate) return '';
  const [gy,gm,gd] = isoDate.split('-').map(Number);
  const [jy,jm,jd] = gregorianToJalali(gy,gm,gd);
  return `${jd} ${JMONTHS[jm-1]} ${jy}`;
}
function todayDate(){
  // همان «امروز» سیستم که هدر از آن استفاده می‌کند (محلی، نه UTC)
  return new Date();
}
function todayISO(){
  const d = todayDate();
  return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
}

function jalaliToGregorian(jy, jm, jd){
  jy += 1595;
  let days = -355668 + (365*jy) + (Math.floor(jy/33)*8) + Math.floor(((jy%33)+3)/4) + jd + ((jm<7) ? (jm-1)*31 : (((jm-7)*30)+186));
  let gy = 400*Math.floor(days/146097);
  days %= 146097;
  if(days > 36524){
    days--;
    gy += 100*Math.floor(days/36524);
    days %= 36524;
    if(days >= 365) days++;
  }
  gy += 4*Math.floor(days/1461);
  days %= 1461;
  if(days > 365){ gy += Math.floor((days-1)/365); days = (days-1)%365; }
  let gd = days + 1;
  const isLeapG = ((gy%4===0)&&(gy%100!==0)) || (gy%400===0);
  const sal_a = [0,31, isLeapG?29:28, 31,30,31,30,31,31,30,31,30,31];
  let gm = 1;
  for(; gm<=12 && gd>sal_a[gm]; gm++) gd -= sal_a[gm];
  return [gy, gm, gd];
}
function isJalaliLeap(jy){
  const r = ((jy % 33) + 33) % 33;
  return [1,5,9,13,17,22,26,30].includes(r);
}
function daysInJalaliMonth(jy, jm){
  if(jm <= 6) return 31;
  if(jm <= 11) return 30;
  return isJalaliLeap(jy) ? 30 : 29;
}
function pad2(n){ return String(n).padStart(2,'0'); }

/* راه‌اندازی عمومی انتخابگر تاریخ شمسی — قابل استفاده برای چند فیلد مختلف در صفحه */
function setupJalaliPicker(dayId, monthId, yearId){
  const daySel = $(dayId), monthSel = $(monthId), yearSel = $(yearId);
  if(!daySel || !monthSel || !yearSel) return;
  const [ty, tm, td] = gregorianToJalali(...todayISO().split('-').map(Number));

  monthSel.innerHTML = JMONTHS.map((m,i)=>`<option value="${i+1}">${m}</option>`).join('');
  yearSel.innerHTML = [ty-1, ty, ty+1, ty+2, ty+3].map(y=>`<option value="${y}">${y}</option>`).join('');

  function rebuildDays(){
    const jy = parseInt(yearSel.value), jm = parseInt(monthSel.value);
    const dCount = daysInJalaliMonth(jy, jm);
    const prevVal = parseInt(daySel.value) || td;
    daySel.innerHTML = Array.from({length:dCount}, (_,i)=>i+1).map(d=>`<option value="${d}">${d}</option>`).join('');
    daySel.value = Math.min(prevVal, dCount);
  }
  monthSel.value = tm; yearSel.value = ty;
  rebuildDays();
  daySel.value = td;
  monthSel.addEventListener('change', rebuildDays);
  yearSel.addEventListener('change', rebuildDays);
}
function getJalaliPickerISO(dayId, monthId, yearId){
  try{
    const dayEl = $(dayId), monthEl = $(monthId), yearEl = $(yearId);
    if(!dayEl || !monthEl || !yearEl) return todayISO();
    let jy = parseInt(yearEl.value, 10), jm = parseInt(monthEl.value, 10), jd = parseInt(dayEl.value, 10);
    if(!isFinite(jy) || !isFinite(jm) || !isFinite(jd)) return todayISO();
    const [gy,gm,gd] = jalaliToGregorian(jy, jm, jd);
    if(!isFinite(gy) || !isFinite(gm) || !isFinite(gd)) return todayISO();
    return gy + '-' + pad2(gm) + '-' + pad2(gd);
  }catch(e){
    return todayISO();
  }
}
function selectedLogDateISO(){ return getJalaliPickerISO('logDateDay','logDateMonth','logDateYear'); }
function setJalaliPickerToToday(dayId, monthId, yearId){
  const daySel = $(dayId), monthSel = $(monthId), yearSel = $(yearId);
  if(!daySel || !monthSel || !yearSel) return;
  const iso = todayISO();
  const [gy, gm, gd] = iso.split('-').map(Number);
  const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
  yearSel.value = String(jy);
  monthSel.value = String(jm);
  // روزها را با ماه جدید هماهنگ کن
  const dim = daysInJalaliMonth(jy, jm);
  const curDay = parseInt(daySel.value, 10) || jd;
  daySel.innerHTML = '';
  for(let d=1; d<=dim; d++){
    const o = document.createElement('option');
    o.value = d; o.textContent = d;
    daySel.appendChild(o);
  }
  daySel.value = String(Math.min(jd, dim));
}
setupJalaliPicker('logDateDay','logDateMonth','logDateYear');
setupJalaliPicker('nbDateDay','nbDateMonth','nbDateYear');
if($('nbTime')) $('nbTime').value = todayDate().toTimeString().slice(0,5);

/* ================= MONEY INPUT FORMAT ================= */
document.addEventListener('input', (e)=>{
  if(!e.target.classList || !e.target.classList.contains('money-input')) return;
  const el = e.target;
  const raw = el.value.replace(/,/g,'').replace(/[^\d]/g,'');
  const withCommas = raw ? Number(raw).toLocaleString('en-US') : '';
  const cursorFromEnd = el.value.length - el.selectionStart;
  el.value = withCommas;
  const newPos = Math.max(0, el.value.length - cursorFromEnd);
  el.setSelectionRange(newPos, newPos);
});

function showToast(msg, isErr){
  const t = $('toast');
  t.textContent = msg;
  t.classList.toggle('err', !!isErr);
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2200);
}

/* ================= CUSTOM CONFIRM MODAL (بجای confirm() ناقابل‌اعتماد در مرورگرهای موبایل) ================= */
function showConfirmModal(title, sub, onConfirm){
  $('confirmTitle').textContent = title;
  $('confirmSub').textContent = sub || '';
  $('confirmModal').style.display = 'flex';
  const okBtn = $('confirmOkBtn');
  const cancelBtn = $('confirmCancelBtn');
  const cleanup = ()=>{
    $('confirmModal').style.display = 'none';
    okBtn.removeEventListener('click', onOk);
    cancelBtn.removeEventListener('click', onCancel);
  };
  const onOk = ()=>{ cleanup(); onConfirm(); };
  const onCancel = ()=>{ cleanup(); };
  okBtn.addEventListener('click', onOk);
  cancelBtn.addEventListener('click', onCancel);
}

/* ================= DATA MODEL ================= */
const DEFAULT_ASSET_DEFS = [
  {key:'snapp',  name:'اسنپ',        cat:'سرمایه‌گذاری', color:'#3b82f6'},
  {key:'hami',   name:'صندوق حامی',   cat:'سرمایه‌گذاری', color:'#22d3ee'},
  {key:'farabi', name:'لبخند فارابی', cat:'سرمایه‌گذاری', color:'#a78bfa'},
  {key:'card',   name:'کارت',         cat:'نقدینگی',      color:'#34d399'},
  {key:'wallet', name:'پول نقد',      cat:'نقدینگی',      color:'#fbbf24'},
];
let ASSET_DEFS = DEFAULT_ASSET_DEFS.map(d=>({...d})); // قابل حذف با فشار طولانی، پس دیگه ثابت نیست
const FIXED_ASSET_KEYS = ['card', 'wallet']; // همیشه در انتقال؛ غیرقابل حذف از لیست اصلی

const NC_CATS = {gold:'طلا', silver:'نقره', usd:'دلار', coin:'سکه', deposit:'حساب سپرده', stock:'بورس', other:'سایر'};
// طلا: ۱ سوت = ۰٫۰۰۱ گرم = ۱ میلی‌گرم · ۱۰۰۰ سوت = ۱ گرم
const GOLD_GRAM_PER_SOOT = 0.001;
function parseDec(str){
  if(str == null || str === '') return 0;
  const n = parseFloat(normalizeDigits(str).replace(/,/g, '').replace(/[^\d.\-]/g, ''));
  return isFinite(n) ? n : 0;
}
/** گرم واقعی از گرم + سوت — محاسبات روی میلی‌گرم برای جلوگیری از خطای اعشار */
function goldTotalGrams(gram, soot){
  const mgFromGram = Math.round(safeNum(gram, 0) * 1000);
  const mgFromSoot = Math.round(safeNum(soot, 0)); // ۱ سوت = ۱ میلی‌گرم
  return (mgFromGram + mgFromSoot) / 1000;
}
/** سوت کل معادل وزن (برای نمایش دوطرفه) */
function goldTotalSoot(gram, soot){
  return Math.round(safeNum(gram, 0) * 1000) + Math.round(safeNum(soot, 0));
}
function formatGoldWeight(item){
  if(!item || item.category !== 'gold') return '';
  const g = safeNum(item.grams, 0);
  const s = safeNum(item.soot, 0);
  const tot = goldTotalGrams(g, s);
  const parts = [];
  if(g) parts.push(g + ' گرم');
  if(s) parts.push(s + ' سوت');
  if(!parts.length && tot) parts.push(tot + ' گرم');
  if(parts.length && (g || s)){
    const sootEq = goldTotalSoot(g, s);
    return parts.join(' + ') + ' ≈ ' + tot + ' گرم (' + sootEq + ' سوت)';
  }
  return parts.length ? parts.join(' + ') : '';
}
function updateGoldSumUI(){
  const cat = $('ncCategory') ? $('ncCategory').value : '';
  const goldBox = $('ncGoldFields');
  const silBox = $('ncSilverFields');
  const usdBox = $('ncUsdFields');
  if(goldBox) goldBox.classList.toggle('show', cat === 'gold');
  if(silBox) silBox.classList.toggle('show', cat === 'silver');
  if(usdBox) usdBox.classList.toggle('show', cat === 'usd');
  if(cat === 'gold'){
    const g = parseDec($('ncGoldGram') && $('ncGoldGram').value);
    const s = parseDec($('ncGoldSoot') && $('ncGoldSoot').value);
    const tot = goldTotalGrams(g, s);
    const sootEq = goldTotalSoot(g, s);
    if($('ncGoldSum')) $('ncGoldSum').textContent = 'مجموع وزن: ' + tot + ' گرم (' + sootEq + ' سوت)';
  }
}

/** مقدار قابل‌قیمت‌گذاری دارایی غیرنقد (بدون تغییر موجودی ذخیره‌شده) */
function noncashQuantityInfo(item){
  if(!item) return null;
  const cat = item.category;
  if(cat === 'gold'){
    let g = goldTotalGrams(item.grams, item.soot);
    if(!(g > 0)) g = safeNum(item.totalGrams, 0);
    if(!(g > 0)) return null;
    return { cat, qty: g, unit: 'گرم', label: g + ' گرم' };
  }
  if(cat === 'silver'){
    const g = safeNum(item.totalGrams, 0) || safeNum(item.grams, 0);
    if(!(g > 0)) return null;
    return { cat, qty: g, unit: 'گرم', label: g + ' گرم' };
  }
  if(cat === 'usd'){
    const u = safeNum(item.usdAmount, 0);
    if(!(u > 0)) return null;
    return { cat, qty: u, unit: 'دلار', label: u + ' دلار' };
  }
  return null;
}

/**
 * ارزش فعلی یک دارایی غیرنقد:
 * - طلا/نقره/دلار با مقدار واحد + قیمت API → مقدار × قیمت
 * - در نبود قیمت یا واحد → manualValue (دفتری)
 * موجودی ثبت‌شده کاربر تغییر نمی‌کند.
 */
function currentValueForNoncash(item){
  if(!item) return 0;
  try{
    const live = typeof liveValueForNoncash === 'function' ? liveValueForNoncash(item) : null;
    if(live != null && isFinite(live) && live >= 0) return live;
  }catch(e){}
  return safeNum(item.manualValue, 0);
}

function sumNoncashCurrentValues(){
  const list = Array.isArray(noncash) ? noncash : [];
  return list.reduce((s, item) => s + currentValueForNoncash(item), 0);
}

let assets = { snapp: 4607188, hami: 5155000, farabi: 148690, card: 2100000, wallet: 570000 };
let logs = [];
let txs = [];
let history = [];
let noncash = []; // {id, category, label, manualValue}
let netSeries = []; // {ts, total} — ثبت خودکار با هر تغییر دارایی، برای نمودار روند
let notebook = []; // {id, type, amount, person, date, time, desc} — تراکنش‌های مالی روزانه
let fcEvents = []; // آرشیو دائمی پرداخت/دریافتی برای پیش‌بینی — Sync آن را پاک نمی‌کند
let fcSnapshots = []; // {id, date, pressure, setKey, monthKey} — سوابق دائمی فشار مالی
let notes = []; // {id,title,body,cat,pinned,createdAt,updatedAt}
let milestonesClaimed = {}; // { assetKey: [1000000, 5000000, ...] } اهداف ثبت‌شده
let milestonesReady = false; // بعد از اولین بارگذاری true می‌شود

const STORE_KEY = 'daftar-mali-v1';

function loadAll(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(raw){
      const d = JSON.parse(raw);
      if(d && d.enc === true && d.ct && d.iv && d.salt){
        window._pendingEncStore = d;
      } else {
        if(d.assets) assets = {...assets, ...d.assets};
        if(d.logs) logs = d.logs;
        if(d.txs) txs = d.txs;
        if(d.history) history = d.history;
        if(d.noncash) noncash = d.noncash;
        if(d.netSeries) netSeries = d.netSeries;
        if(Array.isArray(d.notebook)) notebook = d.notebook;
        if(Array.isArray(d.fcEvents)) fcEvents = d.fcEvents;
        if(Array.isArray(d.fcSnapshots)) fcSnapshots = d.fcSnapshots;
        if(d.milestonesClaimed) milestonesClaimed = d.milestonesClaimed;
        if(Array.isArray(d.notes)) notes = d.notes;
        if(d.assetDefs && d.assetDefs.length) ASSET_DEFS = d.assetDefs;
        ensureCoreAssets();
      }
    }
  }catch(e){ console.error(e); }
  // مهاجرت: اگر fcEvents خالی است ولی notebook داده دارد، یک‌بار کپی کن
  if(fcEvents.length === 0 && notebook.length > 0){
    notebook.forEach(e=>{
      if(e.type === 'payment' || e.type === 'deposit'){
        fcEvents.push({id:e.id, type:e.type, amount:e.amount, date:e.date, time:e.time||''});
      }
    });
  }
  // اولین بار: بدون جشن، همه اهداف رد‌شده را ثبت کن
  ensureCoreAssets();
  initMilestonesBaseline();
  milestonesReady = true;
  if(typeof ensureNotebookMonth === 'function') ensureNotebookMonth();
  if(netSeries.length === 0){
    // اولین بار: یک نقطه شروع با وضعیت فعلی ثبت می‌شه تا نمودار خالی نباشه
    netSeries.push({ts: Date.now(), total: computeTotal()});
  }
  render();
}
function pushSeriesPoint(){
  netSeries.push({ts: Date.now(), total: computeTotal()});
  if(netSeries.length > 1000) netSeries = netSeries.slice(-1000); // جلوگیری از رشد بی‌حد
}
function getStatePayload(){
  return {assets, logs, txs, history, noncash, netSeries, notebook, fcEvents, fcSnapshots, milestonesClaimed, notes, assetDefs: ASSET_DEFS};
}
function applyStatePayload(d){
  if(!d || typeof d !== 'object') return;
  if(d.assets) assets = Object.assign({}, assets, d.assets);
  if(d.logs) logs = d.logs;
  if(d.txs) txs = d.txs;
  if(d.history) history = d.history;
  if(d.noncash) noncash = d.noncash;
  if(d.netSeries) netSeries = d.netSeries;
  if(Array.isArray(d.notebook)) notebook = d.notebook;
  if(Array.isArray(d.fcEvents)) fcEvents = d.fcEvents;
  if(Array.isArray(d.fcSnapshots)) fcSnapshots = d.fcSnapshots;
  if(d.milestonesClaimed) milestonesClaimed = d.milestonesClaimed;
  if(Array.isArray(d.notes)) notes = d.notes;
  if(d.assetDefs && d.assetDefs.length) ASSET_DEFS = d.assetDefs;
  if(typeof ensureCoreAssets === 'function') ensureCoreAssets();
}
let sessionCryptoKey = null;
let persistChain = Promise.resolve();
const DATA_KDF_ITERS = 210000;
const BACKUP_MAGIC = 'DMENC1';

function canPersistSafely(){
  // تا وقتی دادهٔ رمزشده هنوز در حافظه بار نشده، نباید state پیش‌فرض روی localStorage نوشته شود
  if(window._pendingEncStore && !sessionCryptoKey) return false;
  try{
    if(typeof loadPinRecord === 'function'){
      const rec = loadPinRecord();
      if(rec && !sessionCryptoKey) return false; // قفل است و کلید نشست نیست
    }
  }catch(e){}
  return true;
}
function persist(){
  if(!canPersistSafely()) return false;
  const payload = getStatePayload();
  // ذخیره همیشه به‌صورت JSON خام و همزمان — تا بعد از Refresh داده برنگردد
  // (رمزنگاری localStorage باعث از‌دست‌رفتن تغییر با رفرش قبل از اتمام encrypt می‌شد)
  try{
    localStorage.setItem(STORE_KEY, JSON.stringify(payload));
  }catch(e){
    console.error(e);
    showToast('خطا در ذخیره محلی', true);
    return false;
  }
  return true;
}
async function writeStore(payload){
  // سازگاری با مسیرهای async قبلی — همان ذخیره خام همزمان
  try{
    if(!canPersistSafely()) return;
    localStorage.setItem(STORE_KEY, JSON.stringify(payload));
  }catch(e){
    showToast('خطا در ذخیره: ' + (e && e.message ? e.message : e), true);
    throw e;
  }
}


/* ================= MILESTONES (سرمایه‌گذاری) ================= */
function buildRoundMilestones(upTo){
  // اهداف رُند: 1M, 2M, 5M, 10M, 20M, 50M, ... تا بالای موجودی
  const out = [];
  const bases = [1, 2, 5];
  let mag = 1e6; // از ۱ میلیون تومان
  const limit = Math.max(upTo * 2, 10e6);
  while(mag <= limit && out.length < 80){
    bases.forEach(b => out.push(b * mag));
    mag *= 10;
  }
  // یکتا و مرتب
  return [...new Set(out)].sort((a,b)=>a-b);
}

function isInvestKey(key){
  const def = ASSET_DEFS.find(d => d.key === key);
  return def && def.cat === 'سرمایه‌گذاری';
}

function claimedSet(key){
  if(!milestonesClaimed[key]) milestonesClaimed[key] = [];
  return milestonesClaimed[key];
}

function isClaimed(key, m){
  return claimedSet(key).some(x => Number(x) === Number(m));
}

function claimMilestone(key, m){
  const arr = claimedSet(key);
  if(!arr.some(x => Number(x) === Number(m))) arr.push(Number(m));
}

function nextMilestoneFor(key, balance){
  const bal = safeNum(balance, 0);
  const list = buildRoundMilestones(bal);
  for(const m of list){
    if(m > bal && !isClaimed(key, m)) return m;
  }
  // بالاتر از لیست: ادامه الگوی 1-2-5
  let mag = 1e6;
  while(mag < bal * 10) mag *= 10;
  for(const b of [1,2,5,10]){
    const m = b * mag;
    if(m > bal && !isClaimed(key, m)) return m;
  }
  return null;
}

function initMilestonesBaseline(){
  // بدون جشن: هر هدف ≤ موجودی فعلی را ثبت‌شده علامت بزن
  investKeys().forEach(key => {
    const bal = safeNum(assets[key], 0);
    buildRoundMilestones(bal).forEach(m => {
      if(m <= bal) claimMilestone(key, m);
    });
  });
}

function showMilestoneCelebration(name, amount){
  const el = $('msToast');
  if(!el) return;
  $('msTitle').textContent = 'هدف رسید';
  $('msName').textContent = name || 'سرمایه‌گذاری';
  $('msAmt').textContent = fmt(amount) + ' ت';
  el.classList.add('show');
  setTimeout(()=> el.classList.remove('show'), 4000);
}

function checkMilestones(key, prevVal, newVal){
  if(!milestonesReady) return;
  if(!isInvestKey(key)) return;
  const prev = safeNum(prevVal, 0);
  const next = safeNum(newVal, 0);
  if(next <= prev) return; // فقط افزایش

  const def = ASSET_DEFS.find(d => d.key === key);
  const candidates = buildRoundMilestones(next).filter(m => prev < m && next >= m && !isClaimed(key, m));
  if(!candidates.length) return;

  // همه عبور‌کرده‌ها را ثبت کن؛ فقط برای بالاترین جشن مینیمال
  candidates.forEach(m => claimMilestone(key, m));
  const top = candidates[candidates.length - 1];
  showMilestoneCelebration(def ? def.name : key, top);
  persist();
}



function ensureCoreAssets(){
  // کارت و پول نقد همیشه در مدل باشند (کارت در UI لیست دارایی‌ها نشان داده نمی‌شود)
  const cores = [
    {key:'card', name:'کارت', cat:'نقدینگی', color:'#34d399'},
    {key:'wallet', name:'پول نقد', cat:'نقدینگی', color:'#fbbf24'},
  ];
  cores.forEach(c => {
    if(!ASSET_DEFS.some(d => d.key === c.key)) ASSET_DEFS.push({...c});
    if(assets[c.key] == null) assets[c.key] = 0;
  });
}

function investKeys(){ return ASSET_DEFS.filter(d=>d.cat==='سرمایه‌گذاری').map(d=>d.key); }
function cashKeys(){ return ASSET_DEFS.filter(d=>d.cat==='نقدینگی').map(d=>d.key); }
function sumKeys(keys){ return keys.reduce((s,k)=> s + (assets[k]||0), 0); }
function computeInvest(){ return sumKeys(investKeys()); }
function computeCash(){ return sumKeys(cashKeys()); }
function computeTotal(){ return computeInvest() + computeCash(); }

/* ================= RENDER ================= */
let currentTrendRange = 'week'; // پیش‌فرض: ۱ هفته
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
    if(tip) tip.innerHTML = 'روی هر دارایی بزن تا جزئیاتش را ببینی';
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

function renderDonut(){
  const total = computeTotal();
  const donut = $('donutChart');
  const legend = $('legendList');
  const tip = $('donutTip');
  const centerLbl = $('donutCenterLabel');
  const centerVal = $('donutTotal');

  if(total <= 0){
    if(donut) donut.style.background = 'var(--card-2)';
    if(legend) legend.innerHTML = '<div class="empty">دارایی‌ای ثبت نشده</div>';
    if(centerLbl) centerLbl.textContent = 'جمع کل';
    if(centerVal) centerVal.textContent = '۰';
    if(tip) tip.textContent = 'دارایی‌ای برای نمایش نیست';
    selectedDonutKey = null;
    return;
  }

  // ساخت گرادیان دونات
  let acc = 0;
  const stops = [];
  const segments = []; // {key, startPct, endPct}
  ASSET_DEFS.forEach(d=>{
    const v = safeNum(assets[d.key], 0);
    if(v <= 0) return;
    const pct = v / total * 100;
    stops.push(`${d.color} ${acc}% ${acc + pct}%`);
    segments.push({key: d.key, start: acc, end: acc + pct, color: d.color, name: d.name, value: v});
    acc += pct;
  });
  if(donut) donut.style.background = stops.length ? `conic-gradient(${stops.join(',')})` : 'var(--card-2)';

  if(legend){
    legend.innerHTML = ASSET_DEFS.map(d=>{
      const v = safeNum(assets[d.key], 0);
      const pct = total ? (v / total * 100) : 0;
      const active = selectedDonutKey === d.key ? ' active' : '';
      return `<div class="legend-item${active}" data-key="${d.key}">
        <span class="legend-dot" style="background:${d.color}"></span>
        <span class="legend-name">${d.name}</span>
        <span class="legend-pct">${pct.toFixed(1)}%</span>
      </div>`;
    }).join('');

    legend.querySelectorAll('.legend-item').forEach(el=>{
      el.addEventListener('click', ()=>{
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

  // کلیک روی دونات: تشخیص زاویه
  if(donut && !donut._donutBound){
    donut._donutBound = true;
    donut.style.cursor = 'pointer';
    donut.addEventListener('click', (e)=>{
      const rect = donut.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const x = e.clientX - cx;
      const y = e.clientY - cy;
      // conic-gradient از بالا (12 o'clock) شروع می‌شود و ساعت‌گرد می‌رود
      let ang = Math.atan2(x, -y) * 180 / Math.PI; // 0 بالا، مثبت ساعت‌گرد
      if(ang < 0) ang += 360;
      const pct = ang / 360 * 100;
      const tot = computeTotal();
      if(tot <= 0) return;
      let a = 0;
      let found = null;
      for(const d of ASSET_DEFS){
        const v = safeNum(assets[d.key], 0);
        if(v <= 0) continue;
        const p = v / tot * 100;
        if(pct >= a && pct < a + p){ found = d.key; break; }
        a += p;
      }
      if(found){
        if(selectedDonutKey === found){ selectedDonutKey = null; selectDonutAsset(null); }
        else selectDonutAsset(found);
      }
    });
  }

  // بازگردانی انتخاب قبلی یا جمع کل
  if(selectedDonutKey && ASSET_DEFS.some(d => d.key === selectedDonutKey)){
    selectDonutAsset(selectedDonutKey);
  } else {
    selectedDonutKey = null;
    if(centerLbl) centerLbl.textContent = 'جمع کل';
    if(centerVal) centerVal.textContent = fmt(total);
    if(tip) tip.innerHTML = 'روی هر دارایی بزن تا جزئیاتش را ببینی';
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
      if(isNaN(amount) || amount<=0){ showToast('یک مبلغ معتبر وارد کن', true); return; }
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
    `آیا مطمئنی می‌خوای دارایی «${def.name}» رو کامل از لیست حذف کنی؟`,
    `موجودی فعلی: ${fmt(assets[key]||0)} تومان — این کار قابل بازگشت نیست (فقط با فایل پشتیبان قدیمی).`,
    ()=>{
      ASSET_DEFS = ASSET_DEFS.filter(d=>d.key!==key);
      delete assets[key];
      pushSeriesPoint();
      if(persist()){
        showToast(`دارایی «${def.name}» حذف شد`);
        render();
      }
    }
  );
}

function renderLogs(){
  const el = $('logList');
  if(logs.length === 0){ el.innerHTML = '<div class="empty">هنوز سودی ثبت نشده</div>'; $('projCard').style.display = 'none'; return; }
  const sorted = [...logs].sort((a,b)=> a.date < b.date ? 1 : -1);
  el.classList.toggle('scrollable', sorted.length > 7);
  el.innerHTML = sorted.map(l => {
    const realIdx = logs.indexOf(l);
    return `<div class="log-item"><span class="d">${toJalaliStr(l.date)||'—'}</span><span class="n"></span><span class="p">+${fmt(safeNum(l.profit))} ت</span><button class="del" data-idx="${realIdx}">×</button></div>`;
  }).join('');
  el.querySelectorAll('.del').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = parseInt(btn.dataset.idx, 10);
      const row = logs[idx];
      showConfirmModal(
        'حذف این ثبت سود؟',
        row ? (toJalaliStr(row.date) || '') + ' — +' + fmt(safeNum(row.profit)) + ' تومان' : '',
        ()=>{ logs.splice(idx, 1); if(persist()) render(); }
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

function renderTxs(){
  updateTxFilterCounts();
  const el = $('txList');
  if(!el) return;
  const list = getFilteredTxs();
  el.classList.toggle('scrollable', list.length > 15);
  if(list.length === 0){
    const msg = (txs||[]).length === 0
      ? 'هنوز تغییری ثبت نشده'
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
  btn.addEventListener('click',()=>{document.querySelectorAll('#txFilters .hist-filter').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-selected','false');});btn.classList.add('active');btn.setAttribute('aria-selected','true');currentTxFilter=btn.dataset.filter||'newest';renderTxs();});
});


function renderHistory(){
  const el = $('historyList');
  if(history.length === 0){ el.innerHTML = '<div class="empty">هنوز نقطه‌ای ثبت نشده</div>'; return; }
  const sorted = [...history].sort((a,b)=> a.date < b.date ? 1 : -1);
  el.innerHTML = sorted.slice(0,10).map(h=>{
    return `<div class="log-item"><span class="d">${toJalaliStr(h.date)}</span><span class="n"></span><span class="p" style="color:var(--blue-light)">${fmt(h.total)} ت</span></div>`;
  }).join('');
}

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
    el.innerHTML = '<div class="empty">هنوز دارایی غیرنقدی ثبت نشده</div>';
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
          if(persist()) renderNonCash();
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

function computeForecastForMonthKey(monthKey, balanceForResources){
  const monthEvents = (fcEvents || []).filter(e => e && e.date && isoToJalaliMonthKey(e.date) === monthKey);
  const payments = monthEvents.filter(e => e.type === 'payment' && safeNum(e.amount) > 0);
  const receipts = monthEvents.filter(e => e.type === 'deposit' && safeNum(e.amount) > 0);
  let monthlyExpense = 0;
  let daysWithData = 0;
  if(payments.length){
    const sumPay = payments.reduce((s,e)=> s + safeNum(e.amount), 0);
    daysWithData = Math.max(1, new Set(payments.map(e => e.date)).size);
    // هم‌راستا با renderForecast: با کمتر از ۲ روز داده، تعمیم ×روزهای‌ماه نده (فقط مجموع واقعی)؛
    // در غیر این‌صورت روزهای واقعی همان ماه شمسی (۲۹ تا ۳۱) را به‌جای عدد ثابت ۳۰ به‌کار ببر
    // (قبلاً همیشه ×۳۰ بود که در ماه‌های کم‌داده مقدار را تا ۳۰ برابر بیش از نمایش زنده متورم می‌کرد)
    if(daysWithData < 2){
      monthlyExpense = sumPay;
    } else {
      const parts = String(monthKey).split('-');
      const mJy = parseInt(parts[0], 10), mJm = parseInt(parts[1], 10);
      const totalDaysInMonth = (isFinite(mJy) && isFinite(mJm)) ? daysInJalaliMonth(mJy, mJm) : 30;
      monthlyExpense = (sumPay / daysWithData) * totalDaysInMonth;
    }
    if(!isFinite(monthlyExpense) || monthlyExpense < 0) monthlyExpense = 0;
  }
  // ماه بسته‌شده: روز باقی‌مانده صفر
  let avgDailyReceipt = 0;
  if(receipts.length){
    const sumR = receipts.reduce((s,e)=> s + safeNum(e.amount), 0);
    const rDays = Math.max(1, new Set(receipts.map(e=>e.date)).size);
    avgDailyReceipt = sumR / rDays;
  }
  const bal = safeNum(balanceForResources, 0);
  const resources = bal; // بدون درآمد مورد انتظار برای ماه تمام‌شده
  const capacity = resources * 0.8;
  let pressure = 0;
  if(capacity > 1e-9) pressure = (monthlyExpense / capacity) * 100;
  else if(monthlyExpense > 0) pressure = 999;
  pressure = safeNum(pressure, 0);
  if(pressure < 0) pressure = 0;
  if(pressure > 9999) pressure = 9999;
  return {
    monthKey,
    pressure: Math.round(pressure * 100) / 100,
    expense: Math.round(monthlyExpense),
    capacity: Math.round(capacity),
    payments: payments.length,
    daysWithData
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
    const totalDays = daysInJalaliMonth(jy, jm);
    const remain = Math.max(0, totalDays - jd);

    const monthEvents = (Array.isArray(fcEvents) ? fcEvents : []).filter(e =>
      e && e.date && isoToJalaliMonthKey(String(e.date).slice(0,10)) === monthKey
    );
    const payments = monthEvents.filter(e => e.type === 'payment' && safeNum(e.amount) > 0);
    const deposits = monthEvents.filter(e => e.type === 'deposit' && safeNum(e.amount) > 0);
    const sumPay = payments.reduce((s,e)=> s + safeNum(e.amount), 0);
    const sumDep = deposits.reduce((s,e)=> s + safeNum(e.amount), 0);
    const payDays = payments.length ? new Set(payments.map(e => String(e.date).slice(0,10))).size : 0;
    const depDays = deposits.length ? new Set(deposits.map(e => String(e.date).slice(0,10))).size : 0;

    if(total <= 0 && !payments.length && !deposits.length){
      el.innerHTML = '<div class="analysis-block"><div class="an-h"><span class="an-pip"></span>وضعیت کلی</div><p class="an-muted">دادهٔ کافی برای تحلیل ثبت نشده است. با ثبت تراکنش‌ها و موجودی‌ها، این بخش به‌روز می‌شود.</p></div>';
      return;
    }

    lines.push('<div class="analysis-block"><div class="an-h"><span class="an-pip"></span>وضعیت کلی</div>');
    lines.push('<p>جمع دارایی‌ها حدود <b>' + fmt(total) + '</b> تومان است' +
      (cash || invest ? ' <span class="analysis-chip">نقد ' + fmt(cash) + '</span> <span class="analysis-chip">سرمایه ' + fmt(invest) + '</span>' : '') +
      '</p><p>موجودی ثبت‌شده کارت: <b>' + fmt(card) + '</b> تومان.</p></div>');

    lines.push('<div class="analysis-block"><div class="an-h"><span class="an-pip gold"></span>روند ' + monthName + '</div>');
    if(!payments.length && !deposits.length){
      lines.push('<p class="an-muted">در این ماه هنوز دریافتی یا پرداختی ثبت نشده.</p></div>');
    } else {
      let trend = 'تا امروز ';
      if(deposits.length) trend += 'حدود <b>' + fmt(sumDep) + '</b> تومان دریافتی (' + deposits.length + ' مورد) ';
      if(deposits.length && payments.length) trend += 'و ';
      if(payments.length) trend += 'حدود <b>' + fmt(sumPay) + '</b> تومان پرداخت (' + payments.length + ' مورد) ';
      trend += 'ثبت شده است.';
      lines.push('<p>' + trend + '</p>');
      const net = sumDep - sumPay;
      if(net > 0) lines.push('<p><span class="analysis-chip ok">خالص مثبت ≈ ' + fmt(net) + ' ت</span></p>');
      else if(net < 0) lines.push('<p><span class="analysis-chip warn">خالص منفی ≈ ' + fmt(Math.abs(net)) + ' ت</span></p>');
      else lines.push('<p class="an-muted">دریافتی و پرداخت تقریباً برابرند.</p>');
      lines.push('</div>');
    }

    const catMap = {};
    payments.forEach(e => {
      const raw = String(e.desc || '').trim() || 'بدون توضیح';
      let key = raw.length > 24 ? raw.slice(0, 24) + '…' : raw;
      catMap[key] = (catMap[key] || 0) + safeNum(e.amount);
    });
    const cats = Object.keys(catMap).map(k => ({k, v: catMap[k]})).sort((a,b)=> b.v - a.v);
    if(cats.length && sumPay > 0){
      const top = cats[0];
      const share = (top.v / sumPay) * 100;
      const pip = share >= 40 ? 'warn' : '';
      lines.push('<div class="analysis-block"><div class="an-h"><span class="an-pip ' + pip + '"></span>الگوی هزینه</div>');
      lines.push('<p>بیشترین سهم: «' + escapeHtml(top.k) + '» حدود <b>' + fmt(top.v) + '</b> تومان (' + share.toFixed(0) + '٪).</p>');
      if(share >= 40){
        lines.push('<p class="an-warn">سهم بالاست؛ خریدهای غیرضروری این حوزه را کم کنید یا سقف هفتگی بگذارید.</p>');
      } else if(cats.length >= 2){
        lines.push('<p class="an-muted">بعدی: «' + escapeHtml(cats[1].k) + '» ≈ ' + fmt(cats[1].v) + ' ت</p>');
      }
      lines.push('</div>');
    } else if(payments.length){
      lines.push('<div class="analysis-block"><div class="an-h"><span class="an-pip"></span>الگوی هزینه</div><p class="an-muted">برای تشخیص دسته، هنگام پرداخت توضیح کوتاه بنویسید.</p></div>');
    }

    lines.push('<div class="analysis-block"><div class="an-h"><span class="an-pip ok"></span>برآورد تا پایان ماه <span class="an-muted" style="font-weight:500">(تقریبی)</span></div>');
    if(payDays < 2 && depDays < 2){
      lines.push('<p class="an-muted">داده کمتر از دو روز است؛ مبنای مطمئن فقط موجودی فعلی کارت (' + fmt(card) + ' ت) است.</p></div>');
    } else {
      let projPay = sumPay, projDep = sumDep;
      if(payDays >= 2){ projPay = sumPay + (sumPay / Math.max(1, jd)) * remain; }
      if(depDays >= 2){
        let extra = (sumDep / Math.max(1, jd)) * remain;
        if(extra > sumDep) extra = sumDep;
        projDep = sumDep + extra;
      }
      const est = card - (projPay - sumPay) + (projDep - sumDep);
      lines.push('<p>با ادامهٔ آهنگ فعلی، موجودی کارت تا پایان ماه حدود <b>' + fmt(Math.max(0, est)) + '</b> تومان برآورد می‌شود — غیرقطعی.</p>');
      if(est < card * 0.85 && payDays >= 2){
        lines.push('<p class="an-warn">روند خرج نسبت به کارت تند است؛ پرداخت‌های تکرارشونده را مرور کنید.</p>');
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

    lines.push('<p class="an-muted">منبع: فقط داده‌های ثبت‌شده در همین برنامه.</p>');
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
    const totalDays = daysInJalaliMonth(jy, jm);
    const remain = Math.max(0, totalDays - jd);
    const monthKey = jy + '-' + String(jm).padStart(2, '0');

    $('fcMonth').textContent = monthLabel;
    if($('fcRemain')) $('fcRemain').textContent = String(remain);

    // موجودی کارت — فقط مقدار ذخیره‌شده (بدون دلتا، بدون درآمد خیالی)
    const currentBal = safeNum(assets && assets.card, 0);
    if($('fcBalance')) $('fcBalance').textContent = fmt(currentBal) + ' ت';

    // رویدادهای همین ماه شمسی از آرشیو fcEvents
    const monthEvents = (Array.isArray(fcEvents) ? fcEvents : []).filter(e => {
      if(!e || !e.date) return false;
      return isoToJalaliMonthKey(String(e.date).slice(0, 10)) === monthKey;
    });

    const payments = monthEvents
      .filter(e => e.type === 'payment' && safeNum(e.amount) > 0)
      .slice()
      .sort((a,b) => String(a.date+(a.time||'')).localeCompare(String(b.date+(b.time||''))));

    const receipts = monthEvents.filter(e => e.type === 'deposit' && safeNum(e.amount) > 0);

    const sumPay = payments.reduce((s,e) => s + safeNum(e.amount), 0);
    const payDays = payments.length ? new Set(payments.map(e => String(e.date).slice(0,10))).size : 0;
    const sumR = receipts.reduce((s,e) => s + safeNum(e.amount), 0);
    const rDays = receipts.length ? new Set(receipts.map(e => String(e.date).slice(0,10))).size : 0;

    // --- خرج ماهانه ---
    // با داده کم (< ۲ روز پرداخت): فقط مجموع واقعی — بدون ×۳۰
    // با داده کافی: (مجموع ÷ روزهای پرداخت) × تعداد روزهای همان ماه شمسی
    let monthlyExpense = 0;
    let daysWithData = payDays;
    if(payments.length === 0){
      monthlyExpense = 0;
      daysWithData = 0;
    } else if(payDays < 2){
      monthlyExpense = sumPay;
      daysWithData = Math.max(1, payDays);
    } else {
      daysWithData = payDays;
      const dailyRate = sumPay / daysWithData;
      monthlyExpense = dailyRate * totalDays;
    }
    if(!isFinite(monthlyExpense) || monthlyExpense < 0) monthlyExpense = 0;

    if($('fcCount')) $('fcCount').textContent = String(payments.length);
    if($('fcDays')) $('fcDays').textContent = String(daysWithData);
    if($('fcExpense')) $('fcExpense').textContent = fmt(monthlyExpense) + ' ت';

    // --- منابع مالی ---
    // پایه = موجودی کارت
    // درآمد مورد انتظار فقط با ≥۲ روز دریافتی جداگانه:
    //   نرخ = مجموع دریافتی ÷ روزهای سپری‌شده ماه
    //   انتظار = نرخ × روز باقی‌مانده
    //   و سقف انتظار = همان مجموع دریافتی تا الان (جلوگیری از انفجار)
    let expectedIncome = 0;
    if(rDays >= 2 && sumR > 0 && remain > 0){
      const elapsed = Math.max(1, jd);
      const avgDaily = sumR / elapsed;
      expectedIncome = avgDaily * remain;
      if(expectedIncome > sumR) expectedIncome = sumR; // سقف محافظه‌کارانه
      if(!isFinite(expectedIncome) || expectedIncome < 0) expectedIncome = 0;
    }
    const resources = currentBal + expectedIncome;
    const capacity = resources * 0.8;

    if($('fcResources')) $('fcResources').textContent = fmt(safeNum(resources, 0)) + ' ت';
    if($('fcCapacity')) $('fcCapacity').textContent = fmt(safeNum(capacity, 0)) + ' ت';

    // فشار مالی
    let pressure = 0;
    if(capacity > 1e-9) pressure = (monthlyExpense / capacity) * 100;
    else if(monthlyExpense > 0) pressure = 999;
    pressure = safeNum(pressure, 0);
    if(pressure < 0) pressure = 0;
    if(pressure > 9999) pressure = 9999;

    if($('fcPressure')) $('fcPressure').textContent = pressure.toFixed(1) + '٪';

    const barPct = Math.min(100, Math.max(0, pressure));
    const color = progressColor(pressure > 100 ? 101 : pressure);
    if($('fcProgress')){
      $('fcProgress').style.width = barPct + '%';
      $('fcProgress').style.background = color;
    }
    if($('fcPctLabel')){
      $('fcPctLabel').textContent = (pressure > 100 ? pressure.toFixed(0) : pressure.toFixed(1)) + '٪';
      $('fcPctLabel').style.color = color;
    }

    const deficit = safeNum(monthlyExpense - capacity, 0);
    if($('fcDeficitRow') && $('fcDeficit')){
      if(deficit > 0.5 && monthlyExpense > 0){
        $('fcDeficitRow').style.display = 'flex';
        $('fcDeficit').textContent = fmt(deficit) + ' ت';
      } else {
        $('fcDeficitRow').style.display = 'none';
        $('fcDeficit').textContent = '—';
      }
    }

    if(payments.length === 0){
      if($('fcNote')) $('fcNote').textContent = 'هنوز پرداختی در این ماه ثبت نشده.';
    } else if(payDays < 2){
      if($('fcNote')) $('fcNote').textContent = 'با یک روز پرداخت، خرج ماهانه برابر مجموع واقعی است (بدون تعمیم ×۳۰).';
    } else if(deficit > 0){
      if($('fcNote')) $('fcNote').textContent = 'خرج پیش‌بینی‌شده از توان مالی بیشتر است.';
    } else {
      if($('fcNote')) $('fcNote').textContent = 'پیش‌بینی با پرداخت‌های این ماه به‌روز می‌شود.';
    }

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


function renderNotebook(){
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
    el.innerHTML = sorted.map(e=>{
      const t = NB_TYPES[e.type] || {label: e.type||'?', color: 'var(--ink-dim)', sign: 0};
      const sign = t.sign > 0 ? '+' : (t.sign < 0 ? '−' : '');
      const personTxt = e.person ? ' — ' + escapeHtml(e.person) : '';
      const settledMark = (e.type === 'lent' || e.type === 'borrowed') && e.settled ? ' ✓' : '';
      return `<div class="log-item">
        <span class="d">${toJalaliStr(e.date)||'—'} ${e.time||''}</span>
        <span class="n">${t.label}${personTxt}${e.desc ? ' — '+escapeHtml(e.desc) : ''}${settledMark}</span>
        <span class="p" style="color:${t.color}">${sign}${fmt(e.amount)} ت</span>
        <button type="button" class="del" data-id="${e.id}">×</button>
      </div>`;
    }).join('');
    el.querySelectorAll('.del').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const entry = notebook.find(x=>String(x.id)===btn.dataset.id);
        showConfirmModal('حذف این تراکنش؟', entry ? `${NB_TYPES[entry.type].label} — ${fmt(entry.amount)} تومان` : '', ()=>{
          notebook = notebook.filter(x=>String(x.id)!==btn.dataset.id);
          // حذف از آرشیو پیش‌بینی زنده — Snapshotهای قبلی دست‌نخورده می‌مانند
          fcEvents = fcEvents.filter(x=>String(x.id)!==btn.dataset.id);
          if(persist()){ renderNotebook(); if(typeof renderForecast==='function') renderForecast(); }
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
      showToast('وزن طلا (گرم/سوت) یا ارزش دفتری را وارد کن', true); return;
    }
    if(category === 'silver' && !(addSilverG > 0) && !(manualValue > 0)){
      showToast('گرم نقره یا ارزش دفتری را وارد کن', true); return;
    }
    if(category === 'usd' && !(addUsd > 0) && !(manualValue > 0)){
      showToast('مقدار دلار یا ارزش دفتری را وارد کن', true); return;
    }
    if(category !== 'gold' && category !== 'silver' && category !== 'usd' && !(manualValue > 0)){
      showToast('ارزش تومانی رو وارد کن', true); return;
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

if($('addLogBtn')) $('addLogBtn').addEventListener('click', ()=>{
  const date = selectedLogDateISO();
  const profit = parseMoney($('logProfit').value);
  if(!date || isNaN(profit) || profit<=0){ showToast('تاریخ و سود رو درست وارد کن', true); return; }
  const balanceBefore = assets.snapp || 0;
  logs.push({date, profit, balanceBefore});
  assets.snapp = balanceBefore + profit;
  txs.push({date, key:'snapp', delta: profit, note: 'سود روزانه اسنپ'});
  pushSeriesPoint();
  checkMilestones('snapp', balanceBefore, assets.snapp);
  if(persist()){ $('logProfit').value=''; showToast('ثبت شد'); render(); }
});

/* ---- تراکنش‌ها ---- */
function updateNbPersonVisibility(){
  try{
    const type = ($('nbType') && $('nbType').value) || '';
    const needsPerson = (type === 'lent' || type === 'borrowed');
    if($('nbPersonWrap')) $('nbPersonWrap').style.display = needsPerson ? 'block' : 'none';
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

    if(isNaN(amount) || amount <= 0){ showToast('مبلغ معتبر وارد کن', true); return; }
    if(needsPerson && !person){ showToast('برای قرض، اسم شخص رو وارد کن', true); return; }

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
    if(!Array.isArray(notebook)) notebook = [];
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
    showToast(saved ? 'تراکنش ثبت شد' : 'تراکنش ثبت شد (ذخیره پایدار بعداً همگام می‌شود)');
    if(typeof renderNotebook === 'function') renderNotebook();
    else if(typeof render === 'function') render();
    if(typeof renderForecast === 'function') renderForecast();
  }catch(err){
    console.error('nbAdd', err);
    showToast('خطا در ثبت تراکنش: ' + (err && err.message ? err.message : err), true);
  }
});

if($('nbSyncBtn')) $('nbSyncBtn').addEventListener('click', ()=>{
  const btn = $('nbSyncBtn');
  if(btn){ btn.classList.remove('spinning'); void btn.offsetWidth; btn.classList.add('spinning'); setTimeout(()=>btn.classList.remove('spinning'), 650); }

  const delta = safeNum(nbDelta(), 0);
  if(Math.abs(delta) < 0.5){ showToast('تغییری برای ثبت روی کارت نیست'); return; }
  const prev = safeNum(assets.card, 0);
  const newBase = prev + delta;
  showConfirmModal(
    'ثبت موجودی کارت؟',
    'موجودی کارت از ' + fmt(prev) + ' به ' + fmt(newBase) + ' تومان ثبت می‌شود. لیست تراکنش‌ها پاک نمی‌شود.',
    ()=>{
      assets.card = newBase;
      txs.push({date: todayISO(), key:'card', delta, note:'ثبت موجودی کارت'});
      // همهٔ اقلام (از جمله قرض‌های باز) applied می‌شوند تا مبلغ فقط یک‌بار روی کارت بنشیند
      // وضعیت settled جدا است و بعداً قابل تغییر می‌ماند بدون محاسبهٔ دوباره
      (notebook || []).forEach(e => {
        if(!e) return;
        e.applied = true;
      });
      pushSeriesPoint();
      const saved = persist();
      showToast(saved ? 'موجودی کارت ثبت شد' : 'موجودی کارت به‌روز شد (ذخیره پایدار بعداً)');
      if(typeof render === 'function') render();
      else if(typeof renderNotebook === 'function') renderNotebook();
    }
  );
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
      if(d.assetDefs && d.assetDefs.length) ASSET_DEFS = d.assetDefs;
      ensureCoreAssets();
      initMilestonesBaseline();
      if(typeof ensureNotebookMonth === 'function') ensureNotebookMonth();
      persist();
      render();
      if(typeof renderForecast === 'function') renderForecast();
      showToast('بازگردانی شد');
      e.target.value = '';
    }catch(err){ showToast('فایل نامعتبره', true); }
  };
  reader.readAsText(file);
});



/* ================= TRANSFER ================= */
$('tfBtn').addEventListener('click', ()=>{
  const fromKey = $('tfFrom').value;
  const toKey = $('tfTo').value;
  const amount = parseMoney($('tfAmount').value);
  if(!fromKey || !toKey){ showToast('مبدأ و مقصد را انتخاب کن', true); return; }
  if(fromKey === toKey){ showToast('مبدأ و مقصد نباید یکی باشند', true); return; }
  if(isNaN(amount) || amount <= 0){ showToast('مبلغ معتبر وارد کن', true); return; }
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
  }
});

/* ================= NEW ASSET ================= */
const NEW_ASSET_PALETTE = ['#f472b6','#fb923c','#4ade80','#38bdf8','#c084fc','#f87171','#2dd4bf'];
$('newAssetBtn').addEventListener('click', ()=>{
  const name = $('newAssetName').value.trim();
  const cat = $('newAssetCat').value;
  const amount = parseMoney($('newAssetAmount').value) || 0;
  if(!name){ showToast('یه اسم برای دارایی وارد کن', true); return; }
  if(ASSET_DEFS.some(d=>d.name === name)){ showToast('دارایی‌ای با همین اسم از قبل هست', true); return; }
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
  }
});



/* ================= NOTES (دفترچه یادداشت) ================= */
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
let notesCalCursor = null; // Date for calendar month
let notesCalSelectedISO = null;
let noteDraftTags = [];

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
  const q = (notesQuery || '').trim().toLowerCase();
  if(q){
    list = list.filter(n => {
      if(!n) return false;
      const cat = noteCatMeta(n.cat).label;
      const hay = [n.title, n.body, cat, ...(n.tags||[])].map(x => String(x||'').toLowerCase()).join(' ');
      return hay.includes(q);
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
  renderNotesCatBar();
  renderNotesTagBar();
  renderNotesCalendar();
  const list = getFilteredNotes();
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
    return `<article class="note-card${pinCls}" data-id="${n.id}" style="--note-accent:${cat.color};animation-delay:${delay}ms">
      <div class="note-card-head">
        <div class="note-card-title">${escapeHtml(n.title || 'بدون عنوان')}</div>
        <button type="button" class="note-pin${pinOn}" data-pin="${n.id}" title="سنجاق" aria-label="سنجاق">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="${n.pinned?'currentColor':'none'}" stroke="currentColor" stroke-width="1.8"><path d="M12 17v5M8 3h8l-1 7h3l-6 6-6-6h3L8 3z"/></svg>
        </button>
      </div>
      <div class="note-card-body">${escapeHtml(stripMd(n.body||''))}</div>
      ${tags ? `<div class="note-card-tags">${tags}</div>` : ''}
      <div class="note-card-foot">
        <span class="note-badge"><span style="background:${cat.color};width:6px;height:6px;border-radius:50%;display:inline-block;"></span>${cat.label}</span>
        <span>${when}</span>
      </div>
    </article>`;
  }).join('');

  grid.querySelectorAll('.note-card').forEach(card=>{
    card.addEventListener('click', (e)=>{
      if(e.target.closest && e.target.closest('[data-pin]')) return;
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

if($('notesNewBtn')){
  $('notesNewBtn').addEventListener('click', ()=> openNoteEditor(null));
}

if($('noteModalClose')) $('noteModalClose').addEventListener('click', closeNoteModal);
if($('noteModalClose2')) $('noteModalClose2').addEventListener('click', closeNoteModal);
if($('noteModal')){
  $('noteModal').addEventListener('click', (e)=>{ if(e.target === $('noteModal')) closeNoteModal(); });
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
    if(persist()){
      showToast('ذخیره شد');
      renderNotes();
      const savedId = id || String(notes[notes.length-1] && notes[notes.length-1].id);
      const saved = notes.find(x => String(x.id) === String(savedId));
      if(saved) openNoteReader(saved);
      else closeNoteModal();
    }
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
  $('notesSearch').addEventListener('input', ()=>{
    clearTimeout(tmr);
    tmr = setTimeout(()=>{ notesQuery = $('notesSearch').value || ''; renderNotes(); }, 140);
  });
}
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


/* ================= MARKET PRICES (lazy only on noncash) ================= */
let _marketPrices = null;
let _pricesApiLoading = null;

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

function getLoginUsername(){
  try{const value=String(localStorage.getItem(USERNAME_KEY)||DEFAULT_USERNAME).trim();return value||DEFAULT_USERNAME;}catch(e){return DEFAULT_USERNAME;}
}
function saveLoginUsername(value){
  const username=String(value||'').trim();
  if(username.length<3||username.length>32)return false;
  try{localStorage.setItem(USERNAME_KEY,username);}catch(e){return false;}
  return true;
}
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
  if(wait>0){$('lockErr').textContent=`تلاش زیاد — ${Math.ceil(wait/1000)} ثانیه صبر کن`;triggerLoginError();return;}
  const username=String($('lockUsername').value||'').trim(),entered=$('lockInput').value;
  if(!username||username.length<3){$('lockErr').textContent='نام کاربری را وارد کن';triggerLoginError();return;}
  if(!entered){$('lockErr').textContent='رمز را وارد کن';triggerLoginError();return;}
  try{
    const ok=username.toLowerCase()===getLoginUsername().toLowerCase()&&await verifyPin(entered);
    if(ok){
      try{ await unlockDataLayer(entered); }
      catch(err){ $('lockErr').textContent='داده رمزشده باز نشد — رمز یا فایل ذخیره را بررسی کن'; triggerLoginError(); return; }
      clearFails();sessionStorage.setItem(UNLOCK_FLAG,'1');$('lockScreen').style.display='none';$('lockInput').value='';$('lockErr').textContent='';
      render();
    }
    else{registerFail();$('lockInput').value='';const left=PIN_MAX_FAILS-(getFailState().fails||0),rem=lockRemainingMs();triggerLoginError();$('lockErr').textContent=rem>0?`ورود ناموفق — ${Math.ceil(rem/1000)} ثانیه قفل شد`:`نام کاربری یا رمز عبور اشتباه است (تلاش باقی‌مانده: ${Math.max(left,1)})`;}
  }catch(err){$('lockErr').textContent='خطا در بررسی اطلاعات ورود';triggerLoginError();}
});
$('lockUsername').addEventListener('keydown',e=>{if(e.key==='Enter')$('lockInput').focus();});
$('lockInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('lockUnlockBtn').click();});
if($('loginUsername'))$('loginUsername').addEventListener('change',()=>{const value=$('loginUsername').value.trim();if(value.length<3||value.length>32){showToast('نام کاربری باید بین ۳ تا ۳۲ کاراکتر باشد',true);$('loginUsername').value=getLoginUsername();return;}if(saveLoginUsername(value)){refreshPinStatus();showToast('نام کاربری ذخیره شد');}});

$('pinSetBtn').addEventListener('click', async ()=>{
  const current = $('pinCurrent').value;
  const next = $('pinNew').value;
  const usernameInput = $('loginUsername') ? $('loginUsername').value.trim() : getLoginUsername();
  const rec = loadPinRecord();
  if(usernameInput.length < 3 || usernameInput.length > 32){ showToast('نام کاربری باید بین ۳ تا ۳۲ کاراکتر باشد', true); return; }
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

// پاکسازی یک‌باره تنظیمات قدیمی گیت‌هاب (این قابلیت حذف شده)
['daftar-gh-owner','daftar-gh-repo','daftar-gh-token'].forEach(k=>{
  try{ localStorage.removeItem(k); }catch(e){}
});

refreshPinStatus();
checkLock();
loadAll();
ensureCoreAssets();
scheduleDateRollover();
updateTopbarDate();
