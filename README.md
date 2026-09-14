# مبحث درآمد — V5.0

داشبورد مالی آفلاین (localStorage) — مناسب GitHub Pages.

## ساختار

```
daftar-mali/
├── index.html              # روت — نقطه ورود
├── styles.css              # استایل سراسری (روت)
├── frontend/               # UI و منطق کلاینت
│   ├── app-ui.js
│   ├── app-notes.js
│   ├── financial-ai.js
│   └── tests.js
├── backend/                # هسته داده، Storage، Boot، قیمت
│   ├── app-core.js
│   ├── app-boot.js
│   └── prices-api.js
└── README.md
```

## ترتیب بارگذاری (در index.html)

1. backend/prices-api.js
2. backend/app-core.js
3. frontend/app-ui.js
4. frontend/app-notes.js
5. backend/app-boot.js
6. frontend/financial-ai.js

## تغییرات V5.0 (Data Persistence + Laptop UI)

### Data Recovery / Persistence
- **Root cause**: ترتیب startup اشتباه بود (`checkLock` قبل از `loadAll`)؛ در حالت داده رمزشدهٔ pending، state پیش‌فرض می‌توانست نمایش داده شود یا در مسیرهای نادرست overwrite شود.
- **راه‌حل**: `loadAll()` قبل از `checkLock()` اجرا می‌شود تا `_pendingEncStore` قبل از تصمیم قفل تنظیم شود.
- **Persist Safety**: `persist` / `writeStore` هرگز state پیش‌فرض را روی دادهٔ رمزشدهٔ pending نمی‌نویسند؛ برچسب `_ts` و `_v` برای تشخیص نسخه جدیدتر اضافه شد.
- **Auto Backup**: فقط وقتی داده واقعی وجود دارد بکاپ می‌گیرد؛ قبل از restore مخرب، snapshot از state فعلی ذخیره می‌شود؛ اگر داده فعلی جدیدتر باشد هشدار نمایش داده می‌شود. Auto-restore خودکار در startup وجود ندارد (فقط دستی).

### Laptop / Immersive UI
- افزایش منطقی `max-width` کانتینر `.layout` در breakpoints لپ‌تاپ و دسکتاپ (تا 1680px در 1920+).
- کاهش padding/فاصله‌های غیرضروری در viewportهای بزرگ.
- پوسته **Immersive**: Full-Width / High-Utilization — حذف `max-width` مصنوعی از `.main`، کاهش margin جانبی، نزدیک‌تر شدن محتوا به لبه‌های viewport روی لپ‌تاپ.
- سایر پوسته‌ها از همان افزایش عرض کانتینر بهره می‌برند؛ هویت بصری حفظ شده است.

### Clean Code
- Refactor کنترل‌شده روی مسیرهای Storage/Backup/Boot.
- افزودن محافظ‌های صریح در برابر Data Loss بدون تغییر منطق مالی.

نسخه: **V5.0**
