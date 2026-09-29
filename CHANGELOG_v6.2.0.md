# V6.2.0 — Soft UI + حذف Bootstrap + رفع باگ بازیابی

## پوسته Soft UI (جایگزین نئو)
- قالب مینیمال نرم بر اساس نمونه UI (کارت‌های سفید نرم، شعاع بزرگ، سایه ملایم، پس‌زمینه خاکستری روشن)
- پوستهٔ پیش‌فرض و اجباری برای این بیلد: `soft`
- Vesper و Aether به‌طور کامل حذف شدند (از لیست مجاز، سوئیچر، و نرمال‌سازی)
- نئو / Meridian نیز به Soft نگاشت می‌شوند

## حذف Bootstrap
- `bootstrap-skin.css` و فایل‌های نصب مرتبط حذف شدند
- هیچ وابستگی Bootstrap در HTML/JS باقی نمانده

## رفع باگ ریشه‌ای بازیابی داده
- **مشکل**: `attemptSilentAutoRestore` فقط روی `DOMContentLoaded` و async اجرا می‌شد؛ در نتیجه state خالی زودتر render می‌شد و مسیر بازیابی دیر می‌رسید.
- **راه‌حل**:
  1. اجرای restore در microtask بلافاصله پس از تعریف توابع
  2. اجرای مجدد روی DOMContentLoaded
  3. پاس دوم با تأخیر کوتاه (~80ms) + re-render در صورت موفقیت
- پشتیبان اضطراری localStorage و IndexedDB همچنان فعال‌اند
- `persist` از overwrite دادهٔ meaningful با state خالی جلوگیری می‌کند

## نسخه
- تمام برچسب‌ها و query stringها: `20260929v620` / **V6.2.0**
