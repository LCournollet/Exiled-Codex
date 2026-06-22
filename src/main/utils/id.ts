import { randomBytes } from 'crypto'

/** Short, collision-resistant, URL/filename-safe id. */
export function newId(prefix = ''): string {
  const stamp = Date.now().toString(36)
  const rand = randomBytes(4).toString('hex')
  return `${prefix}${stamp}${rand}`
}
