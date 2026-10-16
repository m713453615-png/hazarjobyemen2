import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import { clickByText, closeAllWindows, renderApp } from './helpers/render-app.ts'

after(() => closeAllWindows())

const approvedLicense = JSON.stringify({
  id: 77,
  companyName: 'يمن تك للحلول',
  legalType: 'شركة',
  licenseNumber: '12345',
  imageData: '',
  imageName: '',
  submittedAt: '19 يوليو 2026',
  status: 'approved',
  archived: false,
})

describe('job seeker navigation', () => {
  const views: Array<[string, RegExp]> = [
    ['اكتشف الوظائف', /اكتشف الفرص الأقرب/],
    ['طلباتي', /طلبات التوظيف/],
    ['المحفوظات', /الوظائف المحفوظة/],
    ['تنبيهات الوظائف', /تنبيهات الوظائف/],
    ['مميزات التطبيق', /مميزات هازار للوظائف/],
    ['Feedback', /Feedback وملاحظاتك/],
    ['الخصوصية والأمان', /كيف نحمي بيانات المستخدمين/],
  ]

  for (const [label, expected] of views) {
    it(`opens "${label}" without an error`, async () => {
      const { container, errors } = await renderApp()
      await clickByText(container, label)
      assert.match(container.textContent ?? '', expected, `the ${label} view must render`)
      assert.deepEqual(errors, [], `the ${label} view must not log an error`)
    })
  }
})

describe('employer navigation', () => {
  const storage = { 'hazar-company-license': approvedLicense }

  const views: Array<[string, RegExp]> = [
    ['نظرة عامة', /مرحباً، فريق يمن تك/],
    ['إضافة وظيفة', /أدخل تفاصيل واضحة/],
    ['إدارة المتقدمين', /راجع أفضل المرشحين/],
    ['مميزات التطبيق', /مميزات هازار للوظائف/],
    ['Feedback', /Feedback وملاحظاتك/],
    ['الخصوصية والأمان', /كيف نحمي بيانات المستخدمين/],
  ]

  for (const [label, expected] of views) {
    it(`opens "${label}" without an error`, async () => {
      const { container, errors } = await renderApp({ search: '?role=employer', storage })
      await clickByText(container, label)
      assert.match(container.textContent ?? '', expected, `the ${label} view must render`)
      assert.deepEqual(errors, [], `the ${label} view must not log an error`)
    })
  }

  it('keeps an unverified employer inside the verification flow', async () => {
    const { container } = await renderApp({ search: '?role=employer' })
    await clickByText(container, 'نظرة عامة')
    assert.match(container.textContent ?? '', /توثيق الشركة أو المنشأة/)
  })
})

describe('owner navigation', () => {
  const views: Array<[string, RegExp]> = [
    ['مركز التحكم', /مركز قيادة هازار/],
    ['الوظائف والمدفوعات', /راجع المحتوى، تحقق من الإيصالات/],
    ['تراخيص المنشآت', /عاين وثائق التسجيل/],
    ['أرشيف المستندات', /ملفات محفوظة داخل مساحة التطبيق/],
    ['رسائل Feedback', /الملاحظات والاقتراحات المحفوظة/],
    ['المستخدمون', /إدارة حسابات طالبي العمل/],
    ['إعدادات المنصة', /كل إعدادات المشروع تحت تحكم/],
  ]

  for (const [label, expected] of views) {
    it(`opens "${label}" without an error`, async () => {
      const { container, errors } = await renderApp({ ownerBuild: true, search: '?role=owner' })
      await clickByText(container, label)
      assert.match(container.textContent ?? '', expected, `the ${label} view must render`)
      assert.deepEqual(errors, [], `the ${label} view must not log an error`)
    })
  }
})

describe('interactions', () => {
  it('expands a job and applies to it', async () => {
    const { container, errors } = await renderApp()
    const findCard = (title: string) =>
      [...container.querySelectorAll('.job-card')].find(card => (card.textContent ?? '').includes(title)) as HTMLElement | undefined

    const card = findCard('مصمم تجربة وواجهة مستخدم')
    assert.ok(card, 'the job card must be rendered')

    const header = card.querySelector('.job-main') as HTMLElement
    header.dispatchEvent(new (container.ownerDocument.defaultView as unknown as { MouseEvent: typeof MouseEvent }).MouseEvent('click', { bubbles: true, cancelable: true }))
    await new Promise(resolve => setTimeout(resolve, 400))

    const expanded = findCard('مصمم تجربة وواجهة مستخدم')
    assert.ok(expanded, 'the job card must still be rendered')
    assert.match(expanded.textContent ?? '', /تقديم سريع/, 'the job details must open')

    const applyButton = [...expanded.querySelectorAll('button')].find(button => (button.textContent ?? '').includes('تقديم سريع'))
    assert.ok(applyButton, 'the apply button must be rendered')
    applyButton.dispatchEvent(new (container.ownerDocument.defaultView as unknown as { MouseEvent: typeof MouseEvent }).MouseEvent('click', { bubbles: true, cancelable: true }))
    await new Promise(resolve => setTimeout(resolve, 400))

    assert.match(findCard('مصمم تجربة وواجهة مستخدم')?.textContent ?? '', /تم التقديم/, 'the applied state must be visible')
    assert.deepEqual(errors, [])
  })

  it('saves a job to the saved list', async () => {
    const { container, errors } = await renderApp()
    const saveButton = container.querySelector('.save-button') as HTMLElement | null
    assert.ok(saveButton, 'the save button must be rendered')
    saveButton.dispatchEvent(new (container.ownerDocument.defaultView as unknown as { MouseEvent: typeof MouseEvent }).MouseEvent('click', { bubbles: true, cancelable: true }))
    await new Promise(resolve => setTimeout(resolve, 80))
    assert.deepEqual(errors, [])
  })
})
