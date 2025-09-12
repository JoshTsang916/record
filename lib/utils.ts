export const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

export async function withRetry<T>(fn: () => Promise<T>, retries = 3) {
  let lastErr: any
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      await sleep(200 * Math.pow(2, i))
    }
  }
  throw lastErr
}

export function first160(s: string) {
  const t = (s || '').replace(/\s+/g, ' ').trim()
  return t.slice(0, 160)
}

export function ensureArrayTags(input: string | string[] | undefined) {
  if (!input) return [] as string[]
  if (Array.isArray(input)) return input.map(t => t.trim()).filter(Boolean)
  return input.split(',').map(t => t.trim()).filter(Boolean)
}

