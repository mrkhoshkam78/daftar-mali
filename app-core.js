/* ==========================================================================
   app-core.js — هستهٔ مشترک (global scope، وابستگی: قبل از app-ui / app-notes / app-boot)
   بخش‌ها: Utils · I18n/Font · Theme/Design · Navigation · Dates · State/Persist · UI chrome
   هشدار: نام توابع و شکل state عمومی نباید عوض شود (وابستگی فایل‌های دیگر).
   ========================================================================== */

/* APP_BUILD 20260831qa */
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
/* --- I18n & Font --- */
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
  'مبحث درآمد':'Income Ledger','انصراف':'Cancel','حذف':'Delete','🔒 دفتر مالی قفل است':'🔒 Financial Ledger Locked',
  'برای ادامه، رمز عبور را وارد کنید':'Enter your password to continue','باز کردن':'Unlock','خانه':'Home','دارایی‌ها':'Assets',
  'دارایی غیرنقد':'Non-cash Assets','سود اسنپ':'Snapp Profit','تراکنش‌ها':'Transactions','تاریخچه':'History','تنظیمات':'Settings',
  'جمع کل دارایی (نقدی + سرمایه‌گذاری)':'Total Assets (Cash + Investments)','سرمایه‌گذاری:':'Investments:','نقدینگی:':'Cash:',
  'آمار دارایی‌ها':'Asset Statistics','سهم هر دارایی از مجموع نقدینگی و سرمایه‌گذاری را در یک نگاه ببینید.':'Each asset\'s share of the total ledger',
  'جمع کل':'Total','روی هر دارایی بزن تا جزئیاتش را ببینی':'Tap an asset to see its details','روند کلی دارایی':'Overall Asset Trend',
  'روند تغییر ارزش کل دارایی را در بازه زمانی انتخاب‌شده دنبال کنید.':'Change in total assets over the selected period',
  '۲۴ ساعت':'24 Hours','۱ هفته':'1 Week','۱ ماه':'1 Month','۱ سال':'1 Year',
  'دادهٔ کافی برای این بازه ثبت نشده است — با هر تغییر دارایی، نقطهٔ جدیدی اضافه می‌شود':'Not enough data for this range yet — a new point is added whenever an asset changes',
  'این نمودار فقط از زمان افزودن این قابلیت نقطه ثبت می‌کند و سابقهٔ پیش از آن را ندارد.':'This chart only records points since this feature was added; earlier history is unavailable.',
  'پیش‌بینی مالی ماهانه':'Monthly Financial Forecast','برآورد هزینه ماه با میانگین روزانه و احتساب روزهای بدون خرج؛ دریافتی‌ها فقط برای سنجش توان مالی لحاظ می‌شوند.':'Monthly expense uses daily average including zero-spend days; income is used only for financial capacity.',
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
  'با ثبت سود، همان مبلغ به‌صورت خودکار به موجودی اسنپ نیز اضافه می‌شود.':'Recording profit also adds the same amount to the Snapp balance automatically.',
  'ثبت سود':'Record Profit','میانگین نرخ روزانه':'Average Daily Rate','نرخ روزانه':'Daily Rate','سود پیش‌بینی فردا':'Projected Tomorrow Profit',
  'سود مرکب ۳۰ روز آینده':'30-Day Compound Profit','موجودی پس از ۳۰ روز':'Balance After 30 Days','ثبت تراکنش جدید':'New Transaction',
  'نوع تراکنش':'Transaction Type','دریافتی':'Income','پرداخت':'Payment','قرض داده':'Lent','قرض گرفته':'Borrowed','شخص':'Person',
  'مبلغ (تومان)':'Amount (Toman)','ساعت':'Time','توضیحات':'Description','ثبت تراکنش':'Record Transaction','قرض‌ها':'Loans',
  'قرض‌های داده‌شده و گرفته‌شده را ثبت کنید و وضعیت تسویه هر مورد را مشخص کنید.':'Lent and borrowed money — mark settlement status',
  'قرض باقی‌مانده (تسویه‌نشده)':'Outstanding Loans','تراکنش‌های ثبت‌شده':'Recorded Transactions','خلاصه دسته‌ها':'Category Summary',
  'همه':'All','درآمد':'Income','هزینه':'Expense','انتقال':'Transfer','قرض':'Debt',
  'در این دسته تراکنشی یافت نشد':'No transactions found in this category','تاریخ نامشخص':'Unknown date',
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
  I18N['برآورد هزینه ماه با میانگین روزانه و احتساب روزهای بدون خرج؛ دریافتی‌ها فقط برای سنجش توان مالی لحاظ می‌شوند.']='Monthly expense uses daily average including zero-spend days; income measures capacity only.';
  I18N['مبلغ تغییر را وارد کنید و با + یا − موجودی را به‌روزرسانی کنید؛ حذف با × انجام می‌شود.']='Enter the change and use + or − to update the balance; remove with ×.';
  I18N['یک دارایی جدید به فهرست نقدینگی یا سرمایه‌گذاری اضافه کنید.']='Add a new cash or investment asset to your ledger.';
  I18N['افزودن مورد جدید از فرم پایین؛ برای اصلاح همان مورد از دکمه ویرایش استفاده کنید (جایگزین می‌شود، نه اضافه).']='Estimated value of assets excluded from the official cash-asset total.';
  I18N['کارت از لیست دارایی‌ها حذف شده؛ موجودی آن فقط از این بخش مدیریت می‌شود. «ثبت موجودی کارت» عدد محاسبه‌شده را به‌عنوان موجودی نهایی کارت ذخیره می‌کند.']='Card is managed only here. Deposits update the card balance immediately.';
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
/* --- Theme, Design, Animation prefs --- */
const THEME_KEY = 'daftar-theme';
const ANIM_KEY = 'daftar-anim';
const APP_VERSION = '2.03';
const VALID_THEMES = ['dark','matte-green','teal-navy','black','gold','light','warm-sand','finverse-violet','navy-crimson'];
/** نرمال‌سازی نام تم — نام‌های قدیمی/غلط را اصلاح می‌کند */
function normalizeThemeId(t){
  t = String(t || '').trim().toLowerCase().replace(/_/g, '-');
  if(t === 'finverse' || t === 'finance-blue' || t === 'finverse-blue') return 'finverse-violet';
  if(t === 'finverseviolet') return 'finverse-violet';
  if(t === 'navycrimson' || t === 'premium' || t === 'premium-theme' || t === 'premiumtheme') return 'navy-crimson';
  return t;
}
function applyTheme(t){
  t = normalizeThemeId(t);
  // اگر نام ناشناخته بود light — تم پیش‌فرض نئوبانک
  if(!VALID_THEMES.includes(t)) t = 'light';
  const root = document.documentElement;
  const prev = root.getAttribute('data-theme') || '';
  // انیمیشن موج رنگ از بالا به پایین هنگام تعویض تم
  try{
    const animOff = root.getAttribute('data-anim') === 'off'
      || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    if(prev && prev !== t && !animOff){
      let veil = document.getElementById('themeWipeVeil');
      if(!veil){
        veil = document.createElement('div');
        veil.id = 'themeWipeVeil';
        veil.className = 'theme-wipe-veil';
        veil.setAttribute('aria-hidden', 'true');
        document.body.appendChild(veil);
      }
      // ریست بدون layout thrash — فقط class + rAF برای شروع روی فریم بعدی
      veil.classList.remove('run');
      veil.style.willChange = 'transform, opacity';
      window.clearTimeout(window._themeWipeT);
      requestAnimationFrame(()=>{
        try{
          veil.classList.add('run');
        }catch(e){}
        window._themeWipeT = window.setTimeout(()=>{
          try{
            veil.classList.remove('run');
            veil.style.willChange = 'auto';
          }catch(e){}
        }, 720);
      });
    }
  }catch(e){}
  root.setAttribute('data-theme', t);
  // حذف همهٔ کلاس‌های theme-* سپس افزودن فعلی
  try{
    const toRemove = [];
    root.classList.forEach(c => { if(c.indexOf('theme-') === 0) toRemove.push(c); });
    toRemove.forEach(c => root.classList.remove(c));
  }catch(_e){
    VALID_THEMES.forEach(name => root.classList.remove('theme-' + name));
  }
  root.classList.add('theme-' + t);
  try{ localStorage.setItem(THEME_KEY, t); }catch(e){}
  document.querySelectorAll('.theme-card').forEach(c=>{
    const val = normalizeThemeId(c.getAttribute('data-theme-val') || c.dataset.themeVal || '');
    c.classList.toggle('active', val === t);
  });
  // پاک‌سازی استایل اینلاین تا توکن‌های تم کامل اعمال شوند
  try{
    if(document.body){
      document.body.style.background = '';
      document.body.style.color = '';
    }
    const bar = document.querySelector('.topbar');
    if(bar){ bar.style.background=''; bar.style.borderColor=''; bar.style.boxShadow=''; }
    const bn = document.querySelector('.bottom-nav');
    if(bn){ bn.style.background=''; bn.style.borderColor=''; }
  }catch(_e){}
  // علامت‌گذاری کارت تم فعال
  try{
    document.querySelectorAll('.theme-card').forEach(c=>{
      const val = normalizeThemeId(c.getAttribute('data-theme-val') || c.dataset.themeVal || '');
      c.classList.toggle('active', val === t);
    });
  }catch(_e){}
}
function onThemeCardActivate(e){
  const card = e.target && e.target.closest && e.target.closest('.theme-card');
  if(!card) return;
  const val = card.getAttribute('data-theme-val') || card.dataset.themeVal;
  if(!val) return;
  e.preventDefault();
  applyTheme(val);
}
document.addEventListener('click', onThemeCardActivate);
// touchend جدا باعث double-fire می‌شد؛ فقط click کافی است
if($('themeDayNight')){
  $('themeDayNight').addEventListener('click', ()=>{
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    const lightLike = (cur === 'light' || cur === 'warm-sand');
    applyTheme(lightLike ? 'dark' : 'light');
  });
}
(function initTheme(){
  let saved = 'light';
  try{ saved = localStorage.getItem(THEME_KEY) || 'light'; }catch(e){}
  applyTheme(saved);
})();

/* ================= DESIGN SWITCHER ================= */
const DESIGN_KEY = 'daftar-design';
const VALID_DESIGNS = ['aurora','neobank','classic'];
function normalizeDesignId(d){
  d = String(d || '').trim().toLowerCase().replace(/_/g,'-');
  if(d === 'neo' || d === 'neo-bank') return 'neobank';
  if(d === 'original' || d === 'premium' || d === 'glass') return 'classic';
  if(d === 'app' || d === 'shell') return 'aurora';
  return d;
}
function applyDesign(d){
  d = normalizeDesignId(d);
  if(!VALID_DESIGNS.includes(d)) d = 'aurora';
  const root = document.documentElement;
  root.setAttribute('data-design', d);
  try{ localStorage.setItem(DESIGN_KEY, d); }catch(e){}
  document.querySelectorAll('.design-card').forEach(c=>{
    const val = normalizeDesignId(c.getAttribute('data-design-val') || '');
    const on = val === d;
    c.classList.toggle('active', on);
    c.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  try{
    const bn = document.getElementById('bottomNav');
    const ham = document.getElementById('menuToggle');
    const drawer = document.getElementById('dropdownMenu');
    if(d === 'aurora'){
      if(bn){ bn.style.display = ''; bn.setAttribute('aria-hidden','false'); }
      if(ham){ ham.style.display = 'none'; }
    } else {
      if(bn){ bn.style.display = 'none'; bn.setAttribute('aria-hidden','true'); }
      if(ham){ ham.style.display = ''; }
    }
    if(drawer){
      ['transform','left','right','top','bottom','width','height','maxHeight','borderRadius'].forEach(function(k){
        try{ drawer.style[k] = ''; }catch(_e){}
      });
    }
  }catch(e){}
  try{ if(typeof closeMenu === 'function') closeMenu(); }catch(e){}
  try{
    if(document.body){ document.body.style.background=''; document.body.style.color=''; document.body.style.overflow=''; }
    var bar = document.querySelector('.topbar');
    var layout = document.querySelector('.layout');
    if(bar) bar.style.transform = '';
    if(layout) layout.style.transform = '';
  }catch(e){}
}
function onDesignCardActivate(e){
  const card = e.target && e.target.closest && e.target.closest('.design-card');
  if(!card) return;
  const val = card.getAttribute('data-design-val');
  if(!val) return;
  e.preventDefault();
  e.stopPropagation();
  applyDesign(val);
}
document.addEventListener('click', onDesignCardActivate);
(function initDesign(){
  let saved = 'aurora';
  try{ saved = localStorage.getItem(DESIGN_KEY) || 'aurora'; }catch(e){}
  applyDesign(saved);
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
/* --- Navigation & Pages --- */
function openMenu(){
  document.body.classList.add('menu-open');
  const back = $('menuBackdrop');
  const btn = $('menuToggle');
  const drawer = $('dropdownMenu');
  if(back){ back.setAttribute('aria-hidden','false'); back.style.left='0'; back.style.right='0'; }
  if(btn){ btn.classList.add('open'); btn.setAttribute('aria-expanded','true'); }
  if(drawer){ drawer.style.transform=''; drawer.style.left=''; drawer.style.right=''; drawer.style.top=''; drawer.style.bottom=''; }
  document.body.style.overflow = 'hidden';
}
function closeMenu(){
  document.body.classList.remove('menu-open');
  const back = $('menuBackdrop');
  const btn = $('menuToggle');
  const drawer = $('dropdownMenu');
  if(back) back.setAttribute('aria-hidden','true');
  if(btn){ btn.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }
  if(drawer){ drawer.style.transform=''; }
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
  'page-goals': 'اهداف مالی',
  'page-ai-advisor': 'مشاور هوشمند',
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
  // همگام‌سازی ناوبری پایین (فقط UI)
  const primary = new Set(['page-dashboard','page-notebook','page-assets','page-history','page-settings']);
  document.querySelectorAll('.bn-item').forEach(b=>{
    const bp = b.dataset.page;
    if(bp === '__more__'){
      b.classList.toggle('active', !primary.has(pageId));
    }else{
      b.classList.toggle('active', bp === pageId);
    }
  });
  // فقط برای ظاهر immersive صفحه خانه — بدون اثر روی منطق/داده
  try{ document.body.classList.toggle('home-immersive', pageId === 'page-dashboard'); }catch(e){}
  window.scrollTo(0, 0);
  closeMenu();
  if(pageId === 'page-noncash' && typeof ensureMarketPrices === 'function'){
    ensureMarketPrices(false);
  }
  if(pageId === 'page-goals' && typeof renderFinancialGoals === 'function'){
    renderFinancialGoals();
  }
  if(pageId === 'page-ai-advisor' && typeof FinancialAI !== 'undefined' && FinancialAI.init){
    try{ FinancialAI.init(); }catch(e){ console.error('FinancialAI init', e); }
  }
  if(pageId === 'page-settings' && typeof renderOwnerProfile === 'function'){
    try{ renderOwnerProfile(); }catch(e){}
  }
  // بخش‌های مخفی با reveal که هنگام display:none مشاهده نشدند را نمایان کن
  if(target){
    target.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));
  }
}
// Event delegation — کار می‌کند حتی اگر HTML بعد از script بیاید
function bindNavOnce(){
  if(window.__navBound) return;
  window.__navBound = true;
  document.addEventListener('click', (e)=>{
    const menuEl = e.target && e.target.closest && e.target.closest('.menu-item');
    if(menuEl){
      e.preventDefault();
      const page = menuEl.getAttribute('data-page') || menuEl.dataset.page;
      if(page) showPage(page);
      return;
    }
    const bnEl = e.target && e.target.closest && e.target.closest('.bn-item');
    if(bnEl){
      e.preventDefault();
      e.stopPropagation();
      const p = bnEl.getAttribute('data-page') || bnEl.dataset.page;
      if(p === '__more__'){
        try{
          if(document.body.classList.contains('menu-open')) closeMenu();
          else openMenu();
        }catch(_e){
          document.body.classList.toggle('menu-open');
        }
        document.querySelectorAll('.bn-item').forEach(b=>{
          const bp = b.getAttribute('data-page') || b.dataset.page;
          b.classList.toggle('active', bp === '__more__' && document.body.classList.contains('menu-open'));
        });
        return;
      }
      if(p) showPage(p);
    }
  });
}
bindNavOnce();
// حالت اولیه: صفحه خانه فعال است
try{ document.body.classList.add('home-immersive'); }catch(e){}

/* Header glass on scroll — UI only */
(function bindTopbarScroll(){
  const bar = document.querySelector('.topbar');
  if(!bar) return;
  let ticking = false;
  const onScroll = ()=>{
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(()=>{
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      bar.classList.toggle('is-scrolled', y > 8);
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
})();


/* ================= JALALI DATES ================= */
/* --- Date / Jalali helpers --- */
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

/* ================= ENTER-TO-SUBMIT (فرم‌های تک‌مرحله‌ای پرکاربرد) ================= */
/* هدف: جلوگیری از سردرگمی کاربر دسکتاپ که انتظار دارد Enter فرم را ثبت کند؛
   فقط برای فرم‌های ساده و مجزا که یک دکمهٔ ثبت مشخص دارند (بدون تغییر منطق ثبت). */
const ENTER_SUBMIT_MAP = {
  'nbAmount': 'nbAddBtn', 'nbDesc': 'nbAddBtn', 'nbPerson': 'nbAddBtn',
  'logProfit': 'addLogBtn',
  'tfAmount': 'tfBtn',
  'newAssetAmount': 'newAssetBtn', 'newAssetName': 'newAssetBtn',
  'ncManualValue': 'ncAddBtn',
};
document.addEventListener('keydown', (e)=>{
  if(e.key !== 'Enter' || e.shiftKey) return;
  const id = e.target && e.target.id;
  const btnId = id && ENTER_SUBMIT_MAP[id];
  if(!btnId) return;
  const btn = $(btnId);
  if(!btn) return;
  e.preventDefault();
  btn.click();
});

/* --- UI chrome (toast, confirm) --- */
function showToast(msg, isErr){
  const t = $('toast');
  t.textContent = msg;
  t.classList.toggle('err', !!isErr);
  t.classList.add('show');
  if(t._hideTimer) clearTimeout(t._hideTimer);
  t._hideTimer = setTimeout(()=>t.classList.remove('show'), 2200);
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
    document.removeEventListener('keydown', onKey);
  };
  const onOk = ()=>{ cleanup(); onConfirm(); };
  const onCancel = ()=>{ cleanup(); };
  const onKey = (e)=>{ if(e.key === 'Escape'){ e.preventDefault(); onCancel(); } };
  okBtn.addEventListener('click', onOk);
  cancelBtn.addEventListener('click', onCancel);
  document.addEventListener('keydown', onKey);
  // تمرکز روی «انصراف» — پیش‌فرض امن‌تر برای عملیات مخرب (حذف)
  try{ cancelBtn.focus(); }catch(_e){}
}

/* ================= DATA MODEL ================= */
/* ----- ASSETS (تعریف دارایی‌ها و محاسبات طلا/نقره) ----- */
/* --- Domain state (assets, logs, notebook…) --- */
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
let financialGoals = []; // {id,title,targetAmount,deadline,createdAt,updatedAt}
let bankCards = []; // {id, name, last4, color, balance, isDefault} — موجودی اصلی = assets.card روی کارت پیش‌فرض
let ownerProfile = { name: '', username: '', avatar: '' }; // پروفایل واحد: name + username + avatar
let milestonesReady = false; // بعد از اولین بارگذاری true می‌شود
const BC_COLORS = ['#1d4ed8','#0f766e','#7c3aed','#b91c1c','#a16207','#334155','#0e7490','#be185d'];
let _bcSelectedColor = BC_COLORS[0];
let _bcSlideIndex = 0;

/* ----- CASH (ذخیره‌سازی و بازیابی محلی — localStorage: Load/Parse/Persist) ----- */
/* --- Persistence (localStorage) --- */
const STORE_KEY = 'daftar-mali-v1';

function loadAll(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(raw){
      const d = JSON.parse(raw);
      // اعتبارسنجی نوع هر فیلد قبل از اعمال — کش خراب/ناقص/ناسازگار نباید باعث Crash در render شود
      // (همان الگوی امنی که در بازگردانی فایل پشتیبان استفاده می‌شود)
      if(d && typeof d === 'object' && d.enc === true && d.ct && d.iv && d.salt){
        window._pendingEncStore = d;
      } else if(d && typeof d === 'object'){
        if(d.assets && typeof d.assets === 'object' && !Array.isArray(d.assets)) assets = {...assets, ...d.assets};
        if(Array.isArray(d.logs)) logs = d.logs;
        if(Array.isArray(d.txs)) txs = d.txs;
        if(Array.isArray(d.history)) history = d.history;
        if(Array.isArray(d.noncash)) noncash = d.noncash;
        if(Array.isArray(d.netSeries)) netSeries = d.netSeries;
        if(Array.isArray(d.notebook)) notebook = d.notebook;
        if(Array.isArray(d.fcEvents)) fcEvents = d.fcEvents;
        if(Array.isArray(d.fcSnapshots)) fcSnapshots = d.fcSnapshots;
        if(d.milestonesClaimed && typeof d.milestonesClaimed === 'object' && !Array.isArray(d.milestonesClaimed)) milestonesClaimed = d.milestonesClaimed;
        if(Array.isArray(d.notes)) notes = d.notes;
        if(Array.isArray(d.financialGoals)) financialGoals = d.financialGoals;
        if(Array.isArray(d.bankCards)) bankCards = d.bankCards.filter(c => c && c.id != null).map(c => ({
          id: c.id,
          name: String(c.name || '').slice(0, 40),
          last4: String(c.last4 || '').replace(/\D/g, '').slice(-4),
          color: String(c.color || BC_COLORS[0]),
          balance: (typeof safeNum === 'function' ? safeNum(c.balance, 0) : Number(c.balance)||0),
          isDefault: !!c.isDefault
        }));
        if(d.ownerProfile && typeof d.ownerProfile === 'object' && !Array.isArray(d.ownerProfile)){
          ownerProfile = {
            name: String(d.ownerProfile.name || '').slice(0, 60),
            username: String(d.ownerProfile.username || '').slice(0, 32),
            avatar: (typeof d.ownerProfile.avatar === 'string' && d.ownerProfile.avatar.indexOf('data:image/') === 0) ? d.ownerProfile.avatar : ''
          };
        }
        // مهاجرت: username قدیمی امنیت → ownerProfile.username (مستقل از name)
        try{
          if(!ownerProfile || typeof ownerProfile !== 'object') ownerProfile = { name: '', username: '', avatar: '' };
          var legacyU = '';
          try{ legacyU = String(localStorage.getItem('daftar-login-username')||'').trim(); }catch(_e){}
          if(!String(ownerProfile.username||'').trim() && legacyU){
            ownerProfile.username = legacyU.slice(0, 32);
          }
        }catch(_m){}
        try{ if(typeof ensureDefaultBankCard === 'function') ensureDefaultBankCard(); }catch(e){}

        if(Array.isArray(d.assetDefs) && d.assetDefs.length) ASSET_DEFS = d.assetDefs;
        ensureCoreAssets();
      }
    }
  }catch(e){ console.error(e); }
  // مهاجرت: اگر fcEvents خالی است ولی notebook داده دارد، یک‌بار کپی کن
  try{
    if(fcEvents.length === 0 && notebook.length > 0){
      notebook.forEach(e=>{
        if(e && (e.type === 'payment' || e.type === 'deposit')){
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
  }catch(e){ console.error(e); }
  // حتی اگر خطای غیرمنتظره‌ای در render رخ دهد، ادامهٔ راه‌اندازی صفحه (بعد از loadAll) نباید متوقف شود
  try{
    render();
  }catch(e){ console.error(e); }
}
function pushSeriesPoint(){
  netSeries.push({ts: Date.now(), total: computeTotal()});
  if(netSeries.length > 1000) netSeries = netSeries.slice(-1000); // جلوگیری از رشد بی‌حد
}
function getStatePayload(){
  return {assets, logs, txs, history, noncash, netSeries, notebook, fcEvents, fcSnapshots, milestonesClaimed, notes, financialGoals, bankCards, ownerProfile, assetDefs: ASSET_DEFS};
}
function applyStatePayload(d){
  if(!d || typeof d !== 'object') return;
  // همان اعتبارسنجی نوع فیلدهای loadAll — داده رمزگشایی‌شدهٔ ناسازگار نباید state را خراب کند
  if(d.assets && typeof d.assets === 'object' && !Array.isArray(d.assets)) assets = Object.assign({}, assets, d.assets);
  if(Array.isArray(d.logs)) logs = d.logs;
  if(Array.isArray(d.txs)) txs = d.txs;
  if(Array.isArray(d.history)) history = d.history;
  if(Array.isArray(d.noncash)) noncash = d.noncash;
  if(Array.isArray(d.netSeries)) netSeries = d.netSeries;
  if(Array.isArray(d.notebook)) notebook = d.notebook;
  if(Array.isArray(d.fcEvents)) fcEvents = d.fcEvents;
  if(Array.isArray(d.fcSnapshots)) fcSnapshots = d.fcSnapshots;
  if(d.milestonesClaimed && typeof d.milestonesClaimed === 'object' && !Array.isArray(d.milestonesClaimed)) milestonesClaimed = d.milestonesClaimed;
  if(Array.isArray(d.notes)) notes = d.notes;
  if(Array.isArray(d.financialGoals)) financialGoals = d.financialGoals;
  if(Array.isArray(d.bankCards)) bankCards = d.bankCards.filter(c => c && c.id != null).map(c => ({
    id: c.id,
    name: String(c.name || '').slice(0, 40),
    last4: String(c.last4 || '').replace(/\D/g, '').slice(-4),
    color: String(c.color || BC_COLORS[0]),
    balance: safeNum(c.balance, 0),
    isDefault: !!c.isDefault
  }));
  if(d.ownerProfile && typeof d.ownerProfile === 'object' && !Array.isArray(d.ownerProfile)){
    ownerProfile = {
      name: String(d.ownerProfile.name || '').slice(0, 60),
      username: String(d.ownerProfile.username || '').slice(0, 32),
      avatar: (typeof d.ownerProfile.avatar === 'string' && d.ownerProfile.avatar.indexOf('data:image/') === 0) ? d.ownerProfile.avatar : ''
    };
  }
  // همگام‌سازی کارت پیش‌فرض
  if(typeof ensureDefaultBankCard === 'function') ensureDefaultBankCard();
  else {
    const defs = (bankCards || []).filter(c => c.isDefault);
    if(defs.length > 1) defs.slice(1).forEach(c => { c.isDefault = false; });
    if((bankCards || []).length && !(bankCards || []).some(c => c.isDefault)) bankCards[0].isDefault = true;
  }
  if(Array.isArray(d.assetDefs) && d.assetDefs.length) ASSET_DEFS = d.assetDefs;
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
  $('msTitle').textContent = 'هدف محقق شد';
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
