# مبحث درآمد — V4.01

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

## تغییرات V4.01 (ماندگاری داده)

- پیش‌فرض دارایی‌ها صفر (بدون دمو)
- جایگزینی کامل assets هنگام load/restore (بدون merge با پیش‌فرض)
- محافظت fallbackهای مستقیم localStorage با canPersistSafely
