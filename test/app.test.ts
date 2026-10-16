import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import { closeAllWindows, renderApp } from './helpers/render-app.ts'

after(() => closeAllWindows())

describe('public edition', () => {
  it('mounts without a runtime error', async () => {
    const { container, errors } = await renderApp()
    assert.deepEqual(errors, [], 'the application must mount without console errors')
    assert.ok(container.innerHTML.length > 500, 'the application must render a real interface')
  })

  it('shows the job seeker interface', async () => {
    const { container } = await renderApp()
    const text = container.textContent ?? ''
    assert.match(text, /اكتشف الوظائف/, 'the seeker navigation must be visible')
    assert.match(text, /اكتشف الفرص الأقرب/, 'the welcome banner must be visible')
  })

  it('lists the seeded jobs', async () => {
    const { container } = await renderApp()
    const text = container.textContent ?? ''
    assert.match(text, /مهندس برمجيات أول/)
    assert.match(text, /مسؤول تسويق رقمي/)
    assert.match(text, /مصمم تجربة وواجهة مستخدم/)
  })

  it('hides every owner only screen', async () => {
    const { container } = await renderApp()
    const text = container.textContent ?? ''
    assert.doesNotMatch(text, /لوحة المالك الوحيد/, 'the owner console must stay hidden')
    assert.doesNotMatch(text, /مركز قيادة هازار/, 'the owner dashboard must stay hidden')
    assert.doesNotMatch(text, /إدارة كاملة/, 'the user administration must stay hidden')
  })

  it('keeps the owner role switcher hidden', async () => {
    const { container } = await renderApp()
    const buttons = [...container.querySelectorAll('button')].map(button => button.textContent ?? '')
    assert.ok(!buttons.some(label => label.includes('المالك')), 'the owner button must not be rendered')
  })
})

describe('owner edition', () => {
  it('mounts without a runtime error', async () => {
    const { container, errors } = await renderApp({ ownerBuild: true, search: '?role=owner' })
    assert.deepEqual(errors, [], 'the owner edition must mount without console errors')
    assert.ok(container.innerHTML.length > 500)
  })

  it('reveals the owner console', async () => {
    const { container } = await renderApp({ ownerBuild: true, search: '?role=owner' })
    const text = container.textContent ?? ''
    assert.match(text, /لوحة المالك الوحيد/, 'the owner console must be available')
    assert.match(text, /مركز قيادة هازار/, 'the owner dashboard must be available')
  })

  it('keeps the owner role switcher available', async () => {
    const { container } = await renderApp({ ownerBuild: true })
    const buttons = [...container.querySelectorAll('button')].map(button => button.textContent ?? '')
    assert.ok(buttons.some(label => label.includes('المالك')), 'the owner button must be rendered')
  })
})

describe('language switching', () => {
  it('keeps the document direction in sync with the language', async () => {
    const { dom } = await renderApp()
    const html = dom.window.document.documentElement
    assert.equal(html.getAttribute('lang'), 'ar')
    assert.equal(html.getAttribute('dir'), 'rtl')
  })
})
