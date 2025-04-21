/**
 * MIT License
 *
 * Copyright (c) 2025 siloneco and other contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */


import fs from 'fs'
import path from 'path'

function readLocaleFiles() {
  const localesDir = path.join('.', 'locales')
  const files = fs
    .readdirSync(localesDir)
    .filter((file) => file.endsWith('.json'))

  const locales = {}

  files.forEach((file) => {
    const filePath = path.join(localesDir, file)
    const content = fs.readFileSync(filePath, 'utf8')
    const locale = JSON.parse(content)
    locales[file] = locale
  })

  return locales
}

export default function checkLocaleKeys() {
  const locales = readLocaleFiles()

  const keyMap = new Map()

  Object.entries(locales).forEach(([filename, locale]) => {
    if (!locale.data) {
      return
    }

    const keys = Object.keys(locale.data)

    keys.forEach((key) => {
      if (!keyMap.has(key)) {
        keyMap.set(key, 0)
      }
      keyMap.set(key, keyMap.get(key) + 1)
    })
  })

  // Check if all values in the map are the same
  const values = Array.from(keyMap.values())
  const allSame = values.every((val) => val === values[0])

  if (allSame) {
    console.log('✅ All locale files implement all keys consistently!')
    console.log(`Total keys: ${keyMap.size}`)
    console.log(`Files per key: ${values[0]}`)
  } else {
    // Calculate the average value
    const sum = values.reduce((acc, val) => acc + val, 0)
    const average = Math.round(sum / values.length)

    console.log('❌ Inconsistent key implementation detected!')
    console.log(`Total unique keys: ${keyMap.size}`)
    console.log(`Estimated correct implementation count: ${average}`)

    // Find keys that differ from the average
    const inconsistentKeys = []
    keyMap.forEach((count, key) => {
      if (count !== average) {
        inconsistentKeys.push({
          key,
          count,
          difference: count - average,
        })
      }
    })

    // Sort by absolute difference from average
    inconsistentKeys.sort(
      (a, b) => Math.abs(b.difference) - Math.abs(a.difference),
    )

    console.log('\nInconsistent keys:')
    inconsistentKeys.forEach((item) => {
      const diffText =
        item.difference > 0
          ? `+${item.difference} (extra implementations)`
          : `${item.difference} (missing implementations)`

      console.log(`- "${item.key}": ${item.count}/${average} ${diffText}`)
    })

    // List which files are missing each inconsistent key
    console.log('\nDetailed analysis:')
    inconsistentKeys.forEach((item) => {
      if (item.difference < 0) {
        console.log(`\nKey "${item.key}" is missing in:`)
        Object.entries(locales).forEach(([fileName, locale]) => {
          if (!Object.prototype.hasOwnProperty.call(locale.data, item.key)) {
            console.log(`- ${fileName}`)
          }
        })
      }
    })

    throw new Error('Inconsistent key implementation detected!')
  }
}
