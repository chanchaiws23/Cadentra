import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { resolve } from 'node:path'

const dist = resolve('apps/web/dist')
const html = readFileSync(resolve(dist, 'index.html'), 'utf8')
const entryPath = html.match(/<script[^>]+src="\/?([^"]+index-[^"]+\.js)"/)?.[1]

if (!entryPath) throw new Error('Unable to find the web entry chunk. Run npm run build first.')

const gzipBytes = gzipSync(readFileSync(resolve(dist, entryPath))).byteLength
const budgetBytes = 120 * 1024

if (gzipBytes > budgetBytes) {
  throw new Error(`Web entry bundle is ${Math.ceil(gzipBytes / 1024)} KiB gzip; budget is 120 KiB.`)
}

console.log(`Web entry bundle: ${Math.ceil(gzipBytes / 1024)} KiB gzip (budget 120 KiB)`)
