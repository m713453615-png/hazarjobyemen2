# Hazar.Job 1.2.2 - تقرير التسليم

تاريخ التجهيز النهائي: 22 يوليو 2026

## الملفات الجاهزة

- `HazarJob-Public-Setup-1.2.2.exe`: نسخة Windows العامة دون مركز المالك أو بيانات الدفع.
- `owner/HazarJob-Setup-1.2.2.exe`: نسخة Windows الخاصة بالمالك.
- `HazarJob-Android-Project-1.2.2.zip`: مشروع Android المتزامن والجاهز لبناء AAB.
- `HazarJob-Web-Public-1.2.2.zip`: نسخة الويب العامة.
- `HazarJob-Source-1.2.2.zip`: كود المصدر الكامل للتطبيق والخادم وAndroid وElectron وCloudflare.
- `HazarJob-Store-Assets-1.2.2.zip`: نصوص وصور Google Play وMicrosoft Store.
- `HazarJob-Owner-Code-Summary-1.2.2.md`: ملف مستقل خاص بالمالك يلخص بنية الكود وطريقة إعادة البناء.

## المزايا المعتمدة

- العربية RTL والإنجليزية LTR مع حفظ اختيار المستخدم.
- فصل كامل بين النسخة العامة ونسخة المالك.
- مركز التحكم وأرشيف المستندات ومراجعة الإيصالات في نسخة المالك فقط.
- زر رجوع إلى مركز التحكم في جميع صفحات المالك.
- نشر الوظائف مجانًا في النسخة العامة الأولى لتوافق Google Play.
- توثيق صاحب العمل بصورة الترخيص ورقم الترخيص عند التسجيل الأول.
- البحث والمدن والتصنيفات والمطابقة الذكية والتقديم وحالة الطلب.
- صفحات الخصوصية وحذف الحساب وبريد المراجعة `hazarjob2020@gmail.com`.
- مزامنة مركزية مجهزة باستخدام Cloudflare Worker وD1.

## حالة Cloudflare

العامل `hazar-job` وقاعدة D1 مهيآن، والعنوان المسجل هو:

`https://hazar-job.hazarjob-yemen-app.workers.dev`

لوحة Cloudflare تعرض النطاق والعامل والربط مع `ASSETS` و`DB`. لكن اختبار DNS من شبكة الجهاز يعيد `NXDOMAIN` لنطاقات `workers.dev`. يرجح أن السبب حجب محلي من مزود الاتصال. يجب اختبار العنوان من شبكة أخرى، أو ربط نطاق مخصص، قبل الإطلاق العام في المتاجر.

## النشر في المتاجر

- لم يتم إرسال التطبيق علنًا إلى Google Play أو Microsoft Store.
- بناء Android AAB يحتاج JDK وAndroid SDK أو تشغيل GitHub Actions المجهز في `.github/workflows/build-artifacts.yml`.
- يلزم إنشاء مفتاح توقيع Android وحفظه في GitHub Secrets قبل بناء AAB صالح للرفع.
- نسخة المالك لا تُرفع إلى أي متجر عام.

## الأمان والملكية

- المؤلف والمالك المسجل في المشروع: Mahmoud Abdulrahman Mohammed Al-Nazari.
- مفتاح مزامنة المالك غير موجود داخل أرشيف المصدر أو أي حزمة عامة.
- المفتاح الخاص محفوظ محليًا في `release/HazarJob-Owner-Sync-Key.txt`.
