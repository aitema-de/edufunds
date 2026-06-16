import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    }
  },
  usePathname() {
    return ''
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => {
    return <a {...props}>{children}</a>
  }
})

// Mock window.matchMedia (nur in jsdom — node-Umgebung fuer Route-Tests hat kein window)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Mock IntersectionObserver (Plan 02.1-01: vollstaendige Schnittstelle fuer AntragSectionNav-Tests)
class MockIntersectionObserver {
  observe = jest.fn()
  unobserve = jest.fn()
  disconnect = jest.fn()
  takeRecords = jest.fn(() => [])
  root = null
  rootMargin = ""
  thresholds: number[] = []
  constructor(_cb: IntersectionObserverCallback, _opts?: IntersectionObserverInit) {}
}

;(global as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver

// Polyfill fuer fetch-API-Globals in jsdom (Node 18+ hat native Request/Response/Headers).
// Benoetigt fuer Tests die Next.js App-Router-Routen (z.B. stripe/webhook) importieren.
// jsdom ueberschreibt globalThis; daher explizit in global setzen.
{
  const g = global as unknown as Record<string, unknown>
  // Jedes Global einzeln setzen: jsdom liefert teils Request, aber NICHT fetch —
  // ein gemeinsames `if (!g.Request)`-Gate liess fetch dann undefiniert
  // ("fetch is not defined" in Komponenten, die im useEffect fetchen).
  if (!g.Request && typeof globalThis.Request !== 'undefined') g.Request = globalThis.Request
  if (!g.Response && typeof globalThis.Response !== 'undefined') g.Response = globalThis.Response
  if (!g.Headers && typeof globalThis.Headers !== 'undefined') g.Headers = globalThis.Headers
  if (!g.fetch) {
    // Hermetischer Default-Mock (kein echtes Netz): Komponenten-Tests, die beim
    // Mount fetchen, sollen nicht crashen/haengen. Tests mit konkreten
    // Erwartungen ueberschreiben global.fetch selbst.
    g.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
      })
    )
  }
}

// Polyfill fuer TextEncoder/TextDecoder — jsdom liefert diese nicht global.
// Benoetigt von Tests, die lib/payments/invoice.ts (lexoffice-Pfad) ueber den
// stripe/webhook-Handler laden. Node stellt sie in 'node:util' bereit.
{
  const g = global as unknown as Record<string, unknown>
  if (!g.TextEncoder || !g.TextDecoder) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { TextEncoder, TextDecoder } = require('node:util')
    if (!g.TextEncoder) g.TextEncoder = TextEncoder
    if (!g.TextDecoder) g.TextDecoder = TextDecoder
  }
}

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn()
  disconnect = jest.fn()
  unobserve = jest.fn()
}

// window-abhaengige Mocks nur in jsdom setzen (node-Umgebung hat kein window)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'scrollTo', {
    writable: true,
    value: jest.fn(),
  })
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: MockResizeObserver,
  })
}
