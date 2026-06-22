import { resolve, relative, isAbsolute, sep } from 'path'

/**
 * Resolve a vault-relative path and guarantee it stays inside the vault.
 * Throws on traversal attempts (`..`) or absolute escapes. This is the single
 * choke point that keeps all file writes confined to the user's vault folder.
 */
export function resolveInVault(vaultRoot: string, relPath: string): string {
  if (!vaultRoot) throw new Error('No vault is open.')
  const normalizedRoot = resolve(vaultRoot)
  const target = resolve(normalizedRoot, relPath)
  const rel = relative(normalizedRoot, target)
  if (rel === '' ) return target
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Path escapes the vault: ${relPath}`)
  }
  return target
}

/** Turn an absolute path inside the vault back into a forward-slash relative path. */
export function toVaultRelative(vaultRoot: string, absPath: string): string {
  const rel = relative(resolve(vaultRoot), resolve(absPath))
  return rel.split(sep).join('/')
}

/** Make a filesystem-safe slug from a title. */
export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'untitled'
  )
}
