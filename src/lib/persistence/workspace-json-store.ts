import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export function readWorkspaceJsonArray<T>({
  fileName,
  isItem
}: {
  fileName: string
  isItem: (value: unknown) => value is T
}) {
  const filePath = getWorkspaceStorePath(fileName)

  if (!existsSync(filePath)) {
    return []
  }

  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isItem)
  } catch {
    return []
  }
}

export function writeWorkspaceJsonArray<T>(fileName: string, items: T[]) {
  const filePath = getWorkspaceStorePath(fileName)

  try {
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, `${JSON.stringify(items, null, 2)}\n`)
  } catch {
    // Runtime persistence is best-effort; the in-memory store remains
    // authoritative for this process if the filesystem cannot be written.
  }
}

export function getWorkspaceStorePath(fileName: string) {
  return join(process.cwd(), '.tollora', fileName)
}
