# آماده‌سازی انتشار JP Fit

## وضعیت

- وب‌سایت شرکت طبق تأیید کاربر روی https://jpperformance.co.uk فعال است.
- مخزن اصلی: developerrezaei-lab/JPPerformance.Website؛ شاخهٔ انتشار سایت: master.
- شاخهٔ توسعهٔ اولیهٔ اپ: feature/jp-fit-android-mvp.
- ایمیل دامنه به علت خطای تنظیم Cloudflare فعلاً تکمیل نشده است. مقصد می‌تواند Outlook باشد؛ Gmail الزام فنی عمومی برای Email Routing نیست. خطای واقعی داشبورد باید بعداً بررسی شود.
- دریافت ایمیل، ارسال با دامنه، D-U-N-S، تلفن و حساب Play Console هنوز تأییدشده نیستند.

## آماده‌سازی حساب

ثبت حساب به نام JP PERFORMANCE LTD با هویت و مدارک واقعی نمایندهٔ مجاز؛ نام و آدرس متناسب با D&B و Google Payments؛ دریافت/تأیید D-U-N-S؛ ایمیل و شماره‌های تماس در دسترس برای OTP و پشتیبانی. هیچ شماره یا وضعیت D-U-N-S از روی گواهی ثبت شرکت فرض نشده است.

## پیش از ارسال اپ

- نام نهایی، applicationId و نام نمایشی ناشر تأیید شوند.
- build با Gradle Wrapper، lint و تست روی گوشی؛ سپس ساخت AAB امضاشده با کلید upload پایدار شرکت.
- targetSdk در پروژه 36 است. طبق راهنمای رسمی بررسی‌شده در ۸ نوامبر ۲۰۲۶، اپ‌های جدید عادی از ۳۱ اوت ۲۰۲۶ باید API 36 یا بالاتر را هدف بگیرند.
- آیکن نهایی، اسکرین‌شات واقعی نسخهٔ اجراشده، توضیح کوتاه و بلند و ایمیل پشتیبانی فعال آماده شوند.
- سیاست حریم خصوصی مخصوص نسخهٔ واقعی اپ به شکل صفحهٔ عمومی آماده و داخل اپ/Play لینک شود. سیاست فعلی سایت جای آن را نمی‌گیرد.
- Data safety، رده‌بندی محتوا، مخاطب و اعلان‌های مرتبط با اپ سلامت/فیتنس مطابق فرم‌های روز کنسول و رفتار همین build تکمیل شوند؛ پاسخ‌ها نباید از روی حدس باشند.
- در این نسخه SDK شبکه، تبلیغات، حساب کاربری یا Health Connect وجود ندارد. افزودن هرکدام بررسی دوبارهٔ داده‌ها و سیاست‌ها را لازم می‌کند.
- build آزمایشی و کد اولیه به معنی تأیید یا آمادگی انتشار در Google Play نیست.

## مسیر Git و سرور

ابتدا تغییرات در feature بررسی و تست می‌شوند. اپ Android به restart سرور سایت نیاز ندارد. تغییرات صفحات سایت فقط پس از ادغام موردنظر در master و اجرای دریافت/استقرار روی سرور ظاهر می‌شوند.

```bash
(
set -e
cd /opt/jpperformance
git switch master
git pull --ff-only origin master
docker compose up -d --force-recreate --wait --wait-timeout 90
docker compose ps
)
```

برای آپدیت معمول، بلوک Caddy دوباره اضافه نمی‌شود. مسیر فعال آن طبق خروجی سرور `/opt/kpdc/deploy/hetzner/edge/config/Caddyfile` و کانتینر `hosting-edge-caddy-1` است.

## منابع رسمی

- https://support.google.com/googleplay/android-developer/answer/11926878?hl=en
- https://support.google.com/googleplay/android-developer/answer/13628312?hl=en
- https://developer.android.com/build/releases/agp-8-13-0-release-notes
