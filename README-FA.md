# JP PERFORMANCE LTD — نسخهٔ اولیه وب‌سایت

تاریخ: ۸ نوامبر ۲۰۲۶

وب‌سایت انگلیسی، واکنش‌گرا و بدون وابستگی به CDN یا پایگاه داده است. اطلاعات ثبت شرکت از PDF ارسالی کاربر گرفته شده است: شماره 17542449، تاریخ ثبت 26 October 2026، آدرس Unit 2 Cavendish Retail Park, Keighley, BD21 3RB, United Kingdom.

## محتویات

- `site/`: صفحات اصلی، معرفی شرکت، پروژه‌ها، تماس، حریم خصوصی، شرایط و 404.
- `site/apps/jp-fit.html`: نمونهٔ تعاملی مرورگری ثبت ست و تایمر؛ نسخهٔ اندروید نیست.
- `compose.yml`: سرویس Nginx داخلی روی شبکهٔ مشترک hosting-edge، بدون انتشار پورت میزبان.
- `deploy/`: پیکربندی Nginx، بلوک Caddy و اسکریپت‌های استقرار.
- `docs/`: راهنمای ایمیل، مسیر گوگل‌پلی، طرح اپ اول و گزارش بررسی.

نسخهٔ اولیهٔ سایت با تأیید کاربر روی سرور فعال شده است. امکانات جدید این شاخه پس از دریافت و استقرار روی سرور ظاهر می‌شوند؛ راهنمای آن در `docs/WEBSITE-FITNESS-HUB-FA.md` است. تنظیم ایمیل دامنه فعلاً تکمیل نشده و نشانی‌های تماس باید پس از راه‌اندازی آزمایش شوند.

## اجرای محلی روی ویندوز

Docker Desktop باید اجرا شده و در حالت Linux containers باشد. پوشهٔ پروژه را مثلاً در `F:\Apps\AmBusiness\JPPerformance.Website` قرار دهید؛ فایل‌های compose باید مستقیماً داخل همین مسیر باشند، نه یک پوشهٔ تودرتوی اضافی.

در PowerShell:

```powershell
cd F:\Apps\AmBusiness\JPPerformance.Website
docker compose -f compose.local.yml up -d --wait
Start-Process 'http://localhost:8092'
```

نسخهٔ محلی به Caddy یا شبکهٔ hosting-edge نیاز ندارد. فقط روی همین کامپیوتر در دسترس است. فایل‌های داخل `site` را ویرایش کنید و مرورگر را Refresh کنید؛ نیازی به build نیست.

توقف:

```powershell
docker compose -f compose.local.yml down
```

اگر پورت 8092 مشغول بود، `.env.example` را به `.env` کپی کنید و `JP_LOCAL_PORT` را تغییر دهید؛ سپس دستور up را دوباره اجرا کنید و پورت جدید را در مرورگر باز کنید. فایل `.env` وارد Git نمی‌شود.

## آماده‌سازی GitHub

نام پیشنهادی مخزن: `developerrezaei-lab/JPPerformance.Website`. ابتدا یک مخزن خالی با همین نام بسازید، بدون README یا فایل‌های خودکار. اگر نام دیگری انتخاب کردید، آدرس remote را مطابق همان تغییر دهید.

در پوشهٔ محلی پروژه:

```powershell
git init -b master
git add .
git commit -m "Initial JP Performance website and local Docker setup"
git remote add origin https://github.com/developerrezaei-lab/JPPerformance.Website.git
git push -u origin master
```

این مراحل برای یک مخزن جدید است. اگر پوشه از قبل Git دارد، `git init` و افزودن remote را بدون بررسی تکرار نکنید. اتصال GitHub در ChatGPT نیز باید به این مخزن دسترسی داشته باشد؛ عمومی‌بودن مخزن الزامی نیست.

فایل‌های `.gitignore` و `.gitattributes` اضافه شده‌اند تا تنظیمات شخصی و رمزها commit نشوند و پایان خط اسکریپت‌های Linux با LF باقی بماند. فایل ثبت شرکت و تصاویر ارسالی در پروژه قرار ندارند. هیچ GitHub Actions اضافه نشده است.

## استقرار روی سرور موجود

خروجی فعلی سرور نام کانتینر Caddy را `hosting-edge-caddy-1` تأیید کرده است. مسیر فعال تنظیمات `/opt/kpdc/deploy/hetzner/edge/config/Caddyfile` است. ساختار قبلی: Caddy مشترک + شبکهٔ Docker با نام hosting-edge. پورت‌های عمومی 80/443 باید در اختیار ورودی موجود بمانند.

۱. فایل ZIP را روی ویندوز دریافت کنید؛ در PowerShell از پوشهٔ دانلود اجرا کنید:

```powershell
scp .\jpperformance-website-v1.zip root@157.90.163.80:/tmp/
ssh root@157.90.163.80
```

۲. روی سرور، برای اولین نصب:

```bash
python3 -m zipfile -e /tmp/jpperformance-website-v1.zip /opt
cd /opt/jpperformance
bash deploy/inspect-host.sh
```

این اسکریپت فقط وضعیت کانتینرها، شبکه و mountهای Caddy را می‌خواند. خروجی محیط‌ها یا کلیدها را چاپ نمی‌کند. اگر مسیر `/opt/jpperformance` از قبل پروژهٔ دیگری دارد، قبل از استخراج مسیر جداگانه انتخاب کنید. برای به‌روزرسانی نسخه‌های بعدی ابتدا از پوشهٔ فعلی نسخهٔ پشتیبان بگیرید؛ ZIP جدید را بی‌بررسی روی تنظیمات سرور استخراج نکنید.

۳. اگر شبکهٔ hosting-edge موجود است، سرویس سایت را اجرا کنید:

```bash
cd /opt/jpperformance
bash deploy/deploy.sh
```

این دستور به Caddy دست نمی‌زند. ابزار Docker Compose باید گزینهٔ `--wait` را پشتیبانی کند. پس از بالا آمدن، وضعیت سلامت باید healthy باشد. بارگیری تصویر Nginx به دسترسی سرور به رجیستری نیاز دارد.

۴. خروجی مرحلهٔ ۲ را برای مشخص‌کردن مسیر واقعی فایل Caddy بررسی کنید. فایل `deploy/Caddyfile.snippet` باید در پیکربندی فعال Caddy اضافه شود. اگر Caddyfile دارای import است، محل درست افزودن بلوک را مشخص کنید و در فایل‌های واردشده نیز وجود دامنهٔ تکراری را بررسی کنید.

اسکریپت کمکی زیر دو آرگومان الزامی دارد: مسیر Caddyfile روی میزبان و نام کانتینر Caddy. آرگومان سوم، مسیر فایل داخل کانتینر است؛ پیش‌فرض `/etc/caddy/Caddyfile`. آرگومان‌ها را از خروجی واقعی مرحلهٔ ۲ بردارید، نه از روی حدس:

```text
bash deploy/add-caddy-route.sh HOST_CADDYFILE CADDY_CONTAINER CONTAINER_CADDYFILE
```

این اسکریپت پیکربندی موجود را validate می‌کند، نسخهٔ پشتیبان می‌گیرد، فقط بلوک دامنهٔ جدید را اضافه می‌کند و پس از validate دوباره، reload انجام می‌دهد. در صورت خطا فایل قبلی را برمی‌گرداند. سرویس‌های دیگر را متوقف نمی‌کند. فرض اسکریپت این است که فایل مشخص‌شده همان پیکربندی فعال و متصل‌شده داخل کانتینر است؛ این فرض را با mountها بررسی کنید.

۵. DNS فعلی تصویر کاربر برای وب مناسب است: `A @ -> 157.90.163.80` و `CNAME www -> jpperformance.co.uk`. در Cloudflare حالت SSL/TLS را Full (strict) قرار دهید، پس از اینکه گواهی معتبر در Caddy صادر شد. اگر صدور گواهی خطا داد ابتدا لاگ Caddy و دسترسی پورت‌های 80/443 بررسی شود.

برای منطبق‌ماندن حریم خصوصی فعلی، قابلیت‌های تزریق اسکریپت اضافی مانند Cloudflare Web Analytics و هر ابزار تبلیغاتی را برای این دامنه فعال نکنید. اگر فعال شدند، متن حریم خصوصی را مطابق وضعیت واقعی به‌روزرسانی کنید.

۶. بررسی نهایی پس از اتصال دامنه:

```bash
curl -I https://jpperformance.co.uk/
curl -I https://www.jpperformance.co.uk/
curl -I https://jpperformance.co.uk/privacy.html
curl -I https://jpperformance.co.uk/this-page-does-not-exist
```

انتظار: صفحهٔ اصلی و حریم خصوصی 200، www با هدایت دائمی به دامنهٔ اصلی، مسیر ناموجود با 404 واقعی. سایت‌های قبلی keypdc.ir و tenant.rocketplus.site را هم باز کنید. هیچ ادعایی دربارهٔ تست Docker یا SSL سرور در این نسخه وجود ندارد؛ محیط ساخت به Docker دسترسی نداشت.

## پیش‌نمایش محلی

روی سیستمی که Python دارد، داخل پوشهٔ پروژه:

```bash
python3 -m http.server 8088 --directory site
```

سپس `http://localhost:8088/` را باز کنید. HTML را مستقیم با file:// باز نکنید؛ مسیر صفحات از ریشهٔ سایت تعریف شده‌اند.

## تصمیم‌های محتوایی

- نام JP Fit موقت و قابل‌تغییر است.
- اطلاعات مدیران، تاریخ تولد، امضا، سرمایه و PDF کامل ثبتی در سایت عمومی قرار نگرفته‌اند.
- ادعاهای D-U-N-S Verified، انطباق تضمینی GDPR، VPN بدون لاگ و اپ منتشرشده حذف شده‌اند؛ شواهد لازم برای آن‌ها ارائه نشده است.
- حریم خصوصی سایت مستقل از حریم خصوصی هر اپ است؛ سیاست مخصوص اپ باید از رفتار واقعی نسخهٔ آمادهٔ انتشار استخراج شود.
- فرم تماس فقط پیش‌نویس ایمیل را در برنامهٔ ایمیل باز می‌کند؛ پیام را مستقیماً ارسال نمی‌کند.

## منابع فنی

- Caddy validate/reload: https://caddyserver.com/docs/command-line
- Nginx unprivileged: https://github.com/nginx/docker-nginx-unprivileged
