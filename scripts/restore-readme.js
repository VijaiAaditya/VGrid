import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const rootReadme = path.join(rootDir, 'README.md')
const dotBakReadme = path.join(rootDir, '.README.tmp.bak')

if (fs.existsSync(dotBakReadme)) {
  fs.copyFileSync(dotBakReadme, rootReadme)
  fs.unlinkSync(dotBakReadme)
  console.log('✅ Restored full GitHub README.md successfully!')
} else {
  console.log('ℹ️ No backup found. README.md is intact.')
}
