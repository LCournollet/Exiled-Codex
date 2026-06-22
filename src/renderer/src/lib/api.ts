import type { Result } from '@shared/types'

/**
 * Unwrap a Result<T> coming from the IPC bridge, throwing a real Error on failure
 * so callers can use try/catch instead of checking `.ok` everywhere.
 */
export async function unwrap<T>(p: Promise<Result<T>>): Promise<T> {
  const res = await p
  if (!res.ok) throw new Error(res.error || 'Unknown error')
  return res.data as T
}

/** The typed bridge exposed by the preload script. */
export const api = window.api
