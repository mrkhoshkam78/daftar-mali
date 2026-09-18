# مبحث درآمد — V4.02

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

## تغییرات V4.02 (رفع باگ پشتیبان و ماندگاری بعد از ورود)

پنج باگ واقعی رفع شد که باعث صفر شدن داده بعد از هر ورود و از دست رفتن آخرین وضعیت می‌شدند:

1. **persist نادیده گرفتن canPersistSafely** — وقتی قفل فعال یا دادهٔ رمزشدهٔ pending بود، state صفر روی localStorage نوشته می‌شد و داده واقعی نابود می‌شد.
2. **پشتیبان خودکار state خالی/صفر را معتبر می‌دانست** — validateBackupPayload فقط وجود کلید assets را چک می‌کرد؛ نسخهٔ صفر به‌عنوان آخرین پشتیبان ذخیره و lastRun جلو می‌افتاد.
3. **اجرای پشتیبان خودکار روی صفحه قفل** — runAutoBackupIfDue قبل از unlock اجرا می‌شد و نسخهٔ صفر می‌ساخت.
4. **بعد از Refresh با session فعال، persist کار نمی‌کرد** — sessionCryptoKey null می‌ماند و canPersistSafely همیشه false برمی‌گرداند؛ تغییرات ذخیره نمی‌شدند.
5. **بازیابی دستی/خودکار بدون اعتبارسنجی دادهٔ معنادار** — فایل یا نسخهٔ خالی می‌توانست state را پاک کند؛ اکنون همان اعتبارسنجی سخت‌گیرانه اعمال می‌شود.

### رفتار جدید پشتیبان خودکار
- فقط وقتی قفل باز است و داده بار شده اجرا می‌شود
- payload خالی/همه‌صفر ذخیره نمی‌شود و lastRun را جلو نمی‌اندازد
- بعد از ورود موفق یک پشتیبان اجباری از وضعیت واقعی گرفته می‌شود
- getLatestAutoBackup و UI فقط نسخه‌های معتبر (دارای داده واقعی) را نشان می‌دهند

## تغییرات V4.01 (ماندگاری داده)

- پیش‌فرض دارایی‌ها صفر (بدون دمو)
- جایگزینی کامل assets هنگام load/restore (بدون merge با پیش‌فرض)
- محافظت fallbackهای مستقیم localStorage با canPersistSafely
