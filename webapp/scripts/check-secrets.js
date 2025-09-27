#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'src')

const SENSITIVE_ENV_NAMES = [
  'GEMINI_API_KEY',
  'GOOGLE_GEMINI_API_KEY',
  'LINE_CHANNEL_ACCESS_TOKEN',
  'LINE_CHANNEL_SECRET',
  'DATABASE_URL',
  'NEXTAUTH_SECRET'
]

const errors = []

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      // skip node_modules/.next
      if (e.name === 'node_modules' || e.name === '.next') continue
      walk(full)
    } else if (e.isFile()) {
      if (/\.(ts|tsx|js|jsx)$/.test(e.name)) {
        checkFile(full)
      }
    }
  }
}

function checkFile(file) {
  const content = fs.readFileSync(file, 'utf8')
  const isClient = /(^|\n)\s*['"]use client['"]/i.test(content)

  // Rule 1: Forbid NEXT_PUBLIC_*KEY occurrences anywhere
  const nextPublicKey = content.match(/NEXT_PUBLIC_.*KEY/gi)
  if (nextPublicKey) {
    errors.push(`${file}: contains NEXT_PUBLIC_*KEY (${nextPublicKey[0]})`)
  }

  // Rule 2: In client components, forbid referencing sensitive env names
  if (isClient) {
    for (const name of SENSITIVE_ENV_NAMES) {
      const re = new RegExp(name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g')
      if (re.test(content)) {
        errors.push(`${file}: client component references sensitive env name ${name}`)
      }
    }
  }
}

if (fs.existsSync(SRC)) {
  walk(SRC)
}

if (errors.length) {
  console.error('❌ Secret scan failed:')
  for (const e of errors) console.error(' -', e)
  process.exit(1)
} else {
  console.log('✅ Secret scan passed')
}

