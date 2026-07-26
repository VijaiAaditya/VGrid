import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

function run(cmd) {
  console.log(`\n🚀 Executing: ${cmd}`)
  execSync(cmd, { cwd: rootDir, stdio: 'inherit' })
}

try {
  const versionType = process.argv[2] || 'patch'

  console.log('📦 Step 1: Running type checks...')
  run('npm run type-check')

  console.log('\n🛠️  Step 2: Building library bundle & TypeScript types...')
  run('npm run build:lib')

  console.log(`\n🏷️  Step 3: Bumping version (${versionType})...`)
  run(`npm version ${versionType} --no-git-tag-version`)

  console.log('\n✅ Library build ready for NPM publish!')
  console.log('\nTo publish to NPM registry, run:')
  console.log('  npm publish --access public\n')
} catch (err) {
  console.error('\n❌ Release preparation failed:', err.message)
  process.exit(1)
}
