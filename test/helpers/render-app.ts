import { build } from 'esbuild'
import { JSDOM, VirtualConsole } from 'jsdom'

/**
 * Bundles the real application with esbuild and mounts it inside a jsdom
 * document, exactly the way the browser does. The bundle is produced with the
 * same build time flags the shipping builds use, so the test covers the
 * public edition and the private owner edition.
 */
export type RenderResult = {
  dom: JSDOM
  container: HTMLElement
  errors: string[]
  warnings: string[]
}

const entryPoint = new URL('../../src/main.tsx', import.meta.url).pathname

const openWindows: JSDOM[] = []

/** Releases the timers and the animation frames of every mounted document. */
export function closeAllWindows() {
  while (openWindows.length) {
    const dom = openWindows.pop()
    try {
      dom?.window.close()
    } catch {
      // A window that is already closed is not an error for the test run.
    }
  }
}

async function bundleApp(ownerBuild: boolean) {
  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    jsx: 'automatic',
    logLevel: 'silent',
    loader: {
      '.css': 'empty',
      '.png': 'dataurl',
      '.svg': 'dataurl',
    },
    define: {
      'import.meta.env': JSON.stringify({
        VITE_OWNER_BUILD: ownerBuild ? 'true' : 'false',
        VITE_API_URL: '',
        VITE_MANUAL_PAYMENTS: 'false',
        VITE_OWNER_PAYMENT_METHOD: '',
        VITE_OWNER_PAYMENT_RECIPIENT: '',
        VITE_OWNER_PAYMENT_ACCOUNT: '',
        VITE_OWNER_PHONE: '',
        MODE: 'test',
        PROD: false,
        DEV: true,
        SSR: false,
        BASE_URL: '/',
      }),
      'process.env.NODE_ENV': JSON.stringify('development'),
    },
  })
  return result.outputFiles[0].text
}

export async function renderApp(options: { ownerBuild?: boolean; search?: string; storage?: Record<string, string> } = {}): Promise<RenderResult> {
  const ownerBuild = options.ownerBuild ?? false
  const search = options.search ?? ''
  const code = await bundleApp(ownerBuild)

  const errors: string[] = []
  const warnings: string[] = []

  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', (error: Error) => {
    errors.push(error.message)
  })
  virtualConsole.on('error', (...args: unknown[]) => {
    errors.push(args.map(String).join(' '))
  })
  virtualConsole.on('warn', (...args: unknown[]) => {
    warnings.push(args.map(String).join(' '))
  })

  const dom = new JSDOM(
    `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>`,
    { url: `https://hazar-job.com/${search}`, pretendToBeVisual: true, runScripts: 'dangerously', virtualConsole },
  )

  const { window } = dom

  // The browser APIs the application relies on and jsdom does not implement.
  window.scrollTo = () => undefined
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia

  // No network in the test: the application has to fall back to its bundled data.
  window.fetch = (() => Promise.reject(new Error('offline in the test environment'))) as typeof window.fetch

  // The application reads its saved state while the module is evaluated.
  for (const [key, value] of Object.entries(options.storage ?? {})) {
    window.localStorage.setItem(key, value)
  }

  window.eval(code)
  openWindows.push(dom)

  const container = window.document.getElementById('root') as HTMLElement
  // Let React flush the initial render and the effects that follow it.
  await new Promise(resolve => setTimeout(resolve, 120))

  return { dom, container, errors, warnings }
}

/** Clicks the first element whose text contains the given label. */
export async function clickByText(container: HTMLElement, label: string) {
  const candidate = [...container.querySelectorAll('button, a, label')].find(element =>
    (element.textContent ?? '').includes(label),
  )
  if (!candidate) throw new Error(`no clickable element found for "${label}"`)
  candidate.dispatchEvent(new (candidate.ownerDocument.defaultView as unknown as { MouseEvent: typeof MouseEvent }).MouseEvent('click', { bubbles: true, cancelable: true }))
  // The transitions are animated, so the DOM needs a moment to settle.
  await new Promise(resolve => setTimeout(resolve, 350))
}
