# JP Performance · سامانهٔ مربی و شاگرد، نسخهٔ پایه 0.2

این شاخه بر مبنای `feature/website-fitness-hub` است. برنامهٔ Android در این تغییر توسعه داده نشده است.
این یک نسخهٔ فنی قابل تست است؛ برای پذیرش عمومی دادهٔ واقعی سلامت هنوز آماده نیست.

## ساختار

- `site/`: سایت شرکتی و ابزارهای رایگان قبلی، فونت‌های محلی و لوگوی SVG جدید JP با نماد مغز و دمبل.
- `platform/Api/`: API مستقل ASP.NET Core 10 / EF Core / Identity، مسیر `/api/v1`؛ Vue به کلاس‌های این پروژه وابسته نیست.
- `platform/Portal/`: Vue 3 + Vue Router + Chart.js، مسیر `/portal/`، خروجی استاتیک، بدون CDN.
- SQL Server برای production؛ SQLite فقط برای اجرای محلی و تست. Redis برای کش مشترک کاتالوگ و readiness.
- Nginx سایت، پنل و API را زیر یک دامنه ارائه می‌کند. Caddy فعلی همچنان تنها ورودی 80/443 سرور است. سرویس API و Redis پورت عمومی ندارند.

Razor به این نسخه اضافه نشده: رابط تعاملی با Vue و سرویس مستقل، هدف جداسازی وب/API/موبایل را پوشش می‌دهد. اضافه‌کردن یک میزبان Razor به یک SPA در این مرحله سرویس اضافه‌ای بدون قابلیت جدید ایجاد می‌کند. در صورت نیاز آینده به SSR یا صفحات مدیریتی سرور، می‌توان میزبان Razor مستقلی اضافه کرد؛ قرارداد API ثابت می‌ماند.

## قابلیت‌های پیاده‌شده

1. ثبت‌نام شاگرد، ورود cookie برای وب و bearer/refresh برای کلاینت آینده؛ گذرواژه با Identity هش می‌شود.
2. مدیر اولیه فقط با فرمان یک‌بارهٔ سرور ایجاد می‌شود؛ مدیر می‌تواند دسترسی مربی را تأیید یا حذف کند. ثبت‌نام عمومی امکان انتخاب نقش مربی یا مدیر ندارد.
3. مربی شاگردِ از قبل ثبت‌شده را با ایمیل دعوت می‌کند. دعوت داخل پنل است و ایمیلی ارسال نمی‌شود.
4. فقط پس از پذیرش شاگرد، مربی می‌تواند پیشرفت، دفتر غذا و برنامه‌های او را ببیند. لغو رابطه یا حذف نقش مربی روی درخواست بعدی اعمال می‌شود، حتی اگر قبلاً وارد شده باشد.
5. ثبت وزن و دور کمر، نمودار و جدول مقادیر، ثبت جلسهٔ تمرین و وعدهٔ غذا؛ بازهٔ ۳۰/۹۰/۳۶۶ روز و سقف هزار رکورد جدیدتر برای هر سری.
6. برنامهٔ تمرینی با حرکت/ست/تکرار/استراحت، و الگوی غذایی با غذا/گرم. برنامهٔ تخصیص‌یافته snapshot تغییرناپذیر است؛ اصلاح با برنامهٔ جدید انجام می‌شود.
7. کتابخانهٔ ۱۲ حرکت با تصویر و راهنمای منبع؛ جستجوی ۲۸۵۳ غذای CoFID و محاسبهٔ کالری/پروتئین/کربوهیدرات/چربی سمت سرور. سابقهٔ وعده مقدار محاسبه‌شدهٔ زمان ثبت را حفظ می‌کند.
8. رضایت صریح برای ذخیرهٔ رکورد سلامت، CSRF برای وب، کنترل مالکیت رکوردها، محدودسازی اندازهٔ درخواست، صفحه‌بندی فهرست‌ها، index و محدودیت یکتا برای درخواست‌های تکراری.

ثبت برنامهٔ غذایی در این مرحله «الگوی وعده با وزن مواد» است؛ تقویم چند هفته‌ای، جایگزین غذا، آلرژی، پروندهٔ پزشکی، چت، پرداخت و بازار عمومی مربی پیاده نشده‌اند.

## اجرای سریع Windows / Docker

در پوشهٔ `F:\Apps\AmBusiness\JPPerformance.Website`:

```powershell
git fetch origin
git switch feature/coaching-platform-foundation
git pull --ff-only origin feature/coaching-platform-foundation
.\scripts\Start-Platform.ps1 -Build
```

آدرس: `http://localhost:8093/portal/`؛ سایت همان stack روی `http://localhost:8093/` است. اجرای قبلی سایت روی 8092 می‌تواند هم‌زمان بماند. فقط SQLite محلی است و داده در volume `local-data` می‌ماند؛ `down -v` داده را حذف می‌کند.

برای ایجاد مدیر اولیه، پس از healthy شدن:

```powershell
.\scripts\Initialize-LocalAdmin.ps1
```

گذرواژه را امن و محلی وارد کنید؛ در چت یا گیت قرار ندهید. فرمان فقط وقتی هیچ مدیری وجود ندارد موفق می‌شود؛ حساب عمومی موجود را به مدیر ارتقا نمی‌دهد. ابتدا با مدیر وارد شوید و از «Member access» مربی را تأیید کنید. برای بازگشت به شاگرد یا مربی خارج شوید و با حساب او وارد شوید.

سناریوی تست: حساب شاگرد و مربی را بسازید؛ مدیر، مربی را تأیید کند؛ مربی شاگرد را دعوت کند؛ شاگرد دعوت را بپذیرد؛ مربی برنامه تعیین کند؛ شاگرد اندازه‌گیری/وعده/تمرین ثبت کند؛ شاگرد دسترسی مربی را لغو کند و عدم مشاهدهٔ اطلاعات توسط مربی را بررسی کنید. از دادهٔ ساختگی استفاده کنید.

## اجرای بدون Docker برای توسعه

نیاز: .NET SDK 10 و Node.js 22 یا جدیدتر.

```powershell
$env:ASPNETCORE_ENVIRONMENT='Development'
$env:ASPNETCORE_URLS='http://127.0.0.1:5080'
dotnet run --project platform/Api
```

در ترمینال دیگر:

```powershell
npm --prefix platform/Portal ci
npm --prefix platform/Portal run build
npm run dev
```

پیش‌نمایش Node فقط برای توسعه است؛ production با Nginx اجرا می‌شود. Vite نیز اسکریپت dev جدا دارد، اما برای فونت‌ها و تصاویر از مسیر assets روی سایت محلی 8092 استفاده می‌کند.

## تست‌ها و حدود شواهد

```powershell
.\scripts\Test-Platform.ps1
```

- ساخت API: بدون خطا یا هشدار.
- ۴۸ بررسی HTTP واقعی با دیتابیس SQLite موقت: نقش‌ها، رضایت، پذیرش و لغو مربی، عدم دسترسی بین کاربران، CSRF، bearer، اعتبارسنجی، ثبت برنامه و کالری، تکرار درخواست و خروج.
- ۵۶ تست ابزارهای قبلی سایت.
- ساخت production پنل Vue؛ audit وابستگی‌ها بدون آسیب‌پذیری گزارش‌شده هنگام بررسی.
- بررسی تصویری صفحهٔ ورود/عضویت و لوگو؛ در عرض‌های ۳۲۰ و ۳۹۰ پیکسل، محتوای اصلی ورود اسکرول افقی ندارد.
- migration و SQL idempotent برای SQL Server تولید شده است، اما روی SQL Server و Docker واقعی اجرا نشده‌اند؛ در این محیط Docker و SQL Server در دسترس نبود.
- Redis واقعی، ساخت imageها، جریان داخل حساب در مرورگر و فشار production در این محیط تأیید نشده‌اند. تست HTTP جای بررسی کامل رابط کاربر را نمی‌گیرد.

## آماده‌سازی سرور مشترک؛ اجرای کورکورانه ممنوع

این شاخه دیگر تنها یک سایت استاتیک نیست. فرمان قبلی `deploy/deploy.sh` پنل را راه‌اندازی نمی‌کند. قبل از فعال‌سازی overlay، نسخهٔ فعلی `/opt/jpperformance` و تنظیمات Caddy/Nginx را نگه دارید و از پایگاه داده پشتیبان بگیرید. Caddy فعلی نیاز به تغییر مسیر دامنه ندارد.

اطلاعات موردنیاز از میزبان، بدون نمایش رمزها:

```bash
docker inspect kpdc-sql-1 --format '{{json .NetworkSettings.Networks}}'
docker stats --no-stream
free -h
df -h /opt
```

در SQL Server فعلی **دیتابیس مجزای JPPerformance و login مجزا** بسازید. از دیتابیس سایت KPDC یا رمز sa در تنظیمات این سامانه استفاده نکنید. نام شبکهٔ خصوصی SQL را از خروجی inspect بردارید؛ API فقط به همان شبکه و شبکهٔ داخلی خودش متصل می‌شود. کاربر runtime باید تنها مجوزهای لازم همین دیتابیس را داشته باشد؛ اعمال migration به دسترسی DDL همین دیتابیس نیاز دارد. برای عملیات واقعی بهتر است credential migration جدا از runtime باشد.

```bash
cd /opt/jpperformance
cp .env.platform.example .env.platform
chmod 600 .env.platform
nano .env.platform
```

در `.env.platform`، `JP_SQL_NETWORK` و connection string اختصاصی را تنظیم کنید. TLS و گواهی SQL باید معتبر باشند؛ مقدار نمونه `TrustServerCertificate=False` است. اتصال SQL با گواهی فعلی سرور بررسی نشده است. اگر رمز دارای `$` است، در env فایل مطابق قواعد Compose quote کنید و خروجی config کامل را در چت ارسال نکنید. فقط `config --quiet` برای اعتبارسنجی استفاده کنید.

پس از تکمیل SQL/network/secrets و تأیید منابع سرور، اجرای دستی:

```bash
bash deploy/deploy-platform.sh
```

اسکریپت imageها را می‌سازد، Redis را بالا می‌آورد، migration را یک بار اجرا می‌کند و سپس پنل/API را فعال می‌کند. سایت موجود از bind mount فعلی خوانده می‌شود؛ Vue داخل image مجزا در `/opt/portal` است. هیچ پورت عمومی جدیدی ایجاد نمی‌شود. روی سرور مشترک ۴GB، build هم‌زمان Vue/.NET و سایر پروژه‌ها ممکن است حافظه کم بیاورد؛ بهتر است image در ماشین build ساخته و منتقل شود یا منابع build جدا باشند.

ایجاد مدیر در سرور پس از migration:

```bash
cd /opt/jpperformance
read -rp 'New admin email: ' Bootstrap__Email
read -rsp 'New admin password: ' Bootstrap__Password
printf '\n'
export Bootstrap__Email Bootstrap__Password
docker compose --env-file .env.platform -f compose.yml -f compose.platform.yml run --rm --no-deps -e Bootstrap__Email -e Bootstrap__Password jp-api --bootstrap-admin
unset Bootstrap__Password Bootstrap__Email
```

ثبت‌نام عمومی در production پیش‌فرض بسته است. پس از تکمیل پشتیبانی ایمیل، بازیابی رمز، فرایند حذف/خروجی داده، سیاست نگهداری، نسخهٔ پشتیبان قابل بازیابی و بررسی حریم خصوصی، می‌توان در environment سرویس API مقدار `Membership__AllowPublicRegistration: 'true'` را اضافه کرد. غیرفعال‌بودن ثبت‌نام به معنای آماده‌بودن دیگر بخش‌ها برای دادهٔ واقعی نیست.

برای rollback فوری وب، با همان فایل‌های Compose، نسخهٔ قبلی شاخه و config را بازیابی و سرویس web را با image استاتیک قبلی recreate کنید. داده/volumeها را حذف نکنید. migration فعلی تنها اولیه است؛ rollback کد، rollback خودکار schema نیست.

## ظرفیت ۵۰ هزار کاربر ماهانه

۵۰ هزار کاربر ماهانه معادل ۵۰ هزار اتصال هم‌زمان نیست. نمونهٔ فرض محاسبه: ۲۰ مراجعه در ماه × ۳۰ درخواست API برای هر کاربر = ۳۰ میلیون درخواست در ماه، حدود ۱۱٫۶ درخواست در ثانیه به‌طور متوسط؛ اوج ده‌برابری حدود ۱۱۶ درخواست در ثانیه. این **سناریوی فرضی** است و اندازه‌گیری ترافیک واقعی نیست.

API بدون state نشست داخل process طراحی شده، داده در SQL و کش کاتالوگ در Redis است؛ درخواست‌ها async و فهرست‌ها محدود و صفحه‌بندی‌شده‌اند. کلیدهای Data Protection در volume پایدارند؛ برای چند replica روی میزبان‌های مختلف باید key ring مشترک و محافظت‌شده فراهم شود. image این نسخه، SQL مشترک و Redis یک میزبان، HA محسوب نمی‌شوند.

`load-platform.k6.js` برای staging با حساب‌های ساختگی و بار ۱۰→۵۰→۱۰۰ VU آماده است. هر VU در حلقه یک progress request و یک ثانیه مکث دارد؛ هدف اولیه p95 زیر ۵۰۰ms و خطا زیر ۱٪ است. **این تست هنوز اجرا نشده است**. برای ارزیابی واقعی، دیتابیس با حجم نمایندهٔ ۵۰ هزار کاربر و تاریخچهٔ چند ماه، ثبت/خواندن هم‌زمان، ورود، کش سرد، قطع Redis و SQL، و حافظه/CPU سرور مشترک را بررسی کنید؛ فقط یک دیتابیس کوچک یا endpoint سلامت کافی نیست.

محدودکنندهٔ فعلی API به کاربر/connection IP وابسته است. reverse proxy در این نسخه عمداً X-Forwarded-For نامطمئن را trust نمی‌کند؛ ترافیک ناشناس پشت Nginx در یک bucket می‌افتد (۱۲۰ درخواست/دقیقه). پیش از ترافیک عمومی زیاد، زنجیرهٔ پراکسی‌های مورداعتماد Caddy/Nginx/Cloudflare و محدودسازی IP واقعی را با تنظیم صریح trusted proxies تکمیل کنید. صرفاً اعتماد به هر هدر IP راه‌حل نیست. این مورد مانع اعلام ظرفیت production این نسخه است.

## منبع داده و بازتولید

منبع رسمی: https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid

Workbook: https://assets.publishing.service.gov.uk/media/60538b91e90e07527df82ae4/McCance_Widdowsons_Composition_of_Foods_Integrated_Dataset_2021..xlsx

Contains public sector information licensed under the Open Government Licence v3.0: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/

اسکریپت `python scripts/import-cofid.py path/to/workbook.xlsx` شیت Proximates را با کنترل SHA-256 می‌خواند. ردیف‌های فاقد مقادیر عددی لازم حذف و `Tr` به صفر تبدیل می‌شود؛ صفر بودن trace به معنی نبود مطلق ماده نیست. شناسهٔ منبع هر ردیف نگه داشته می‌شود. آماده‌سازی، برند و تفاوت فردی غذاها باعث تفاوت مقادیر واقعی‌اند. داده برای ترکیب غذا است و مجوز تجویز رژیم درمانی یا ادعای اثر سلامت ایجاد نمی‌کند.
