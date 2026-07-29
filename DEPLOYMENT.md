# نشر Hazar-Job.com

## البنية المركزية

تستخدم نسخ الويب وAndroid وWindows عنوان Worker المركزي المجاني:

```env
VITE_API_URL=https://hazar-job.hazarjob-yemen-app.workers.dev
```

تقرأ التطبيقات `GET /api/snapshot` عند التشغيل، ثم كل 12 ثانية، وعند عودة المستخدم إلى التطبيق. تعديلات الوظائف والإعدادات تُرسل إلى الخادم المركزي، لذلك لا تحتاج التطبيقات إلى تحديث من المتجر عند تغيير المحتوى.

## Cloudflare

المشروع مجهز كـ Cloudflare Worker يقدم الموقع وAPI من النطاق نفسه، مع قاعدة D1.

1. تسجيل الدخول:

```bash
npx wrangler login
```

2. إنشاء قاعدة البيانات:

```bash
npm run cloudflare:db:create
```

3. ضع `database_id` الناتج مكان القيمة المؤقتة في `wrangler.jsonc`.

4. إنشاء الجداول:

```bash
npm run cloudflare:db:migrate
```

5. إنشاء مفتاح قوي للمالك وحفظه كسر:

```bash
npx wrangler secret put OWNER_API_TOKEN
```

6. ضع المفتاح نفسه مرة واحدة داخل:

`إعدادات المالك > الأمان والصلاحيات > مفتاح مزامنة المالك`

7. النشر:

```bash
npm run cloudflare:deploy
```

8. عنوان الإنتاج الحالي:

- `hazar-job.hazarjob-yemen-app.workers.dev`

شراء نطاق `.com` اختياري ويمكن تأجيله. عند شرائه لاحقًا يضاف من صفحة Domains داخل Worker دون تغيير قاعدة البيانات.

## نسخ التطبيقات

```bash
# Android العام
npm run android:sync

# Windows العام للمتجر
npm run windows:public:build

# Windows الخاص بالمالك
npm run windows:build
```

نسخة المالك لا تُرفع إلى متجر عام. نسخة Windows العامة وAndroid تقرآن البيانات من الخادم المركزي، ولا تعرضان مركز المالك.

## ما يلزم قبل الإرسال للمتاجر

- تثبيت البريد القانوني وبريد الدعم في صفحات الخصوصية والمتاجر.
- إنشاء حساب Google Play Console وحساب Microsoft Partner Center باسم المالك.
- إنشاء مفتاح توقيع Android وحفظه في مستودع GitHub خاص.
- استضافة مثبت Windows العام على رابط HTTPS ثابت.
- إدخال بيانات المطور والضرائب والدفع المطلوبة من كل متجر.
- تنفيذ اختبار داخلي قبل الإنتاج.
