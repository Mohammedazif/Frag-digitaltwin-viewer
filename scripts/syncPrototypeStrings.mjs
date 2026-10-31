// Adds to static/dashboard/js/i18n/en.js and ar.js every string key the prototype pack has and ours does not.
// Existing keys are never changed (the Arabic is under client review). Safe to run again: a key already added is skipped.
// Usage: node scripts/syncPrototypeStrings.mjs <pack folder>
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pack = process.argv[2]
if (!pack) { console.error('usage: node scripts/syncPrototypeStrings.mjs <pack folder>'); process.exit(1) }

const strings = (file, lang) => {
  const window = {}
  vm.runInContext(fs.readFileSync(file, 'utf8'), vm.createContext({ window }))
  return window.EKO_I18N[lang]
}

// The index of the brace that closes the object literal opened by `opener` (the file may carry code after it)
function objectEnd(src, opener) {
  let i = src.indexOf(opener)
  if (i < 0) throw new Error(`${opener} not found`)
  i += opener.length
  for (let depth = 1, q = null; i < src.length; i++) {
    const c = src[i]
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue }
    if (c === '"' || c === "'" || c === '`') q = c
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) return i
  }
  throw new Error(`no closing brace for ${opener}`)
}

for (const lang of ['en', 'ar']) {
  const ourFile = path.join(ROOT, 'static/dashboard/js/i18n', lang + '.js')
  const ours = strings(ourFile, lang), theirs = strings(path.join(pack, 'js/i18n', lang + '.js'), lang)
  const missing = Object.keys(theirs).filter(k => !(k in ours))
  if (!missing.length) { console.log(`${lang}.js: nothing to add`); continue }
  const src = fs.readFileSync(ourFile, 'utf8')
  const end = objectEnd(src, `window.EKO_I18N.${lang} = {`)
  const head = src.slice(0, end).replace(/\s*$/, '')
  const lines = missing.map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(theirs[k])}`).join(',\n')
  fs.writeFileSync(ourFile, `${head}${head.endsWith(',') ? '' : ','}\n${lines}\n${src.slice(end)}`)
  const check = strings(ourFile, lang)
  console.log(`${lang}.js: added ${missing.length} keys (now ${Object.keys(check).length})`)
}
