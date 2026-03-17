import path from 'path'
import fs from 'fs'

function findFirstExistingPath(candidates: string[]): string | undefined {
  return candidates.find((candidate) => fs.existsSync(candidate))
}

function resolveAssetCandidates(fileNames: string[]): string[] {
  const candidates: string[] = []

  for (const fileName of fileNames) {
    candidates.push(path.join(__dirname, '../assets', fileName))
    candidates.push(path.join(process.cwd(), 'src/renderer/assets', fileName))
    candidates.push(path.join(process.cwd(), 'assets', fileName))
  }

  return candidates
}

export function resolveWindowIconPath(): string | undefined {
  return findFirstExistingPath(resolveAssetCandidates(['icon.png']))
}

export function resolveTrayIconPath(): string | undefined {
  return findFirstExistingPath(
    resolveAssetCandidates([
      'mascot.png',
      'mascot-placeholder.svg',
      'icon-tray.png',
      'icon.png',
    ]),
  )
}
