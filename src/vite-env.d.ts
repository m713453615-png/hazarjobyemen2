/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'true' enables the private owner console. Any other value keeps the build public. */
  readonly VITE_OWNER_BUILD?: string
  /** Base URL of the central API. Empty means the same origin that serves the app. */
  readonly VITE_API_URL?: string
  /** 'true' asks the employer for a transfer reference and a receipt before publishing. */
  readonly VITE_MANUAL_PAYMENTS?: string
  readonly VITE_OWNER_PAYMENT_METHOD?: string
  readonly VITE_OWNER_PAYMENT_RECIPIENT?: string
  readonly VITE_OWNER_PAYMENT_ACCOUNT?: string
  readonly VITE_OWNER_PHONE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
