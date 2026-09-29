# V6.4.3 — Soft UI کامل + اصلاح معماری IndexedDB

## Soft UI روی تمام بخش‌ها
- بلوک کامل پوسته نئو (Meridian) به `data-design="soft"` منتقل شد (۱۷۱ سلکتور)
- پوشش بخش‌های جاافتاده: proj-card, loan-item, transfer-box, lock-box, modal, toast, field, switch, slider, trend-tab, hist-filter, reveal, page, im-nav و …
- رنگ‌ها و سایه‌ها با الگوریتم Soft-Neumorph یکدست شدند
- انیمیشن ورود صفحه (`softPageIn`) و احترام به `data-anim="off"` / reduced-motion
- پس‌زمینه canvas: `#F2F3F7` مطابق نمونه Soft UI

## IndexedDB — باگ‌های منطقی رفع‌شده
1. **حذف ناخواسته config**: هنگام prune، رکورد `AUTO_BACKUP_CFG_IDB_KEY` ممکن بود پاک شود چون در همان store با backupها بود و در سقف MAX شمرده می‌شد → اکنون فقط ردیف‌های `ab_*` شمارش/حذف می‌شوند و CFG هرگز حذف نمی‌شود.
2. **تداخل id همزمان**: `ab_` + Date.now تنها بود → پسوند random اضافه شد.
3. **لیست backup**: `listAutoBackups` دیگر رکورد config را برنمی‌گرداند (UI و getLatest دقیق‌تر).
4. **open blocked**: رویداد `onblocked` برای تشخیص قفل توسط تب دیگر.
5. **emergency localStorage**: فیلدهای notes / milestonesClaimed / fcEvents / netSeries اضافه و سقف txs/history افزایش یافت.

## نسخه
- Build: `soft-v643-20260929` / **V6.4.3**
