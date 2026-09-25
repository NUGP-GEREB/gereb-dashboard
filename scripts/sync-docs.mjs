import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = process.cwd()
const docsDir = join(root, 'docs')
const distDir = join(root, 'dist')

await rm(docsDir, { recursive: true, force: true })
await mkdir(docsDir, { recursive: true })
await cp(join(distDir, 'index.html'), join(docsDir, 'index.html'))
await cp(join(distDir, 'assets'), join(docsDir, 'assets'), { recursive: true })

const htmlPath = join(docsDir, 'index.html')
const html = await readFile(htmlPath, 'utf8')
const docsHtml = html
  .replaceAll('../assets/', './assets/')
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n')
await writeFile(htmlPath, docsHtml)
await writeFile(join(root, 'index.html'), docsHtml.replaceAll('./assets/', './docs/assets/'))
