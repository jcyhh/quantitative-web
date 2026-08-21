import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const errors = []
const requiredDocumentationSections = ['职责', '入口', '约束', '扩展', '验证']

function reportError(message) {
  errors.push(message)
}

function validateDocumentation(documentationPath, description) {
  const content = readFileSync(documentationPath, 'utf8')

  if (!/^#\s+\S/m.test(content)) reportError(`${description}: documentation must contain a top-level heading`)

  for (const section of requiredDocumentationSections) {
    if (!content.includes(section)) reportError(`${description}: documentation must describe ${section}`)
  }
}

function requireReadme(modulePath) {
  const readmePath = resolve(modulePath, 'README.md')

  if (!existsSync(readmePath)) {
    reportError(`${modulePath}: missing README.md`)
    return
  }

  validateDocumentation(readmePath, `${modulePath}: README.md`)
}

function hasPublicEntry(directoryPath) {
  return existsSync(resolve(directoryPath, 'index.ts')) || existsSync(resolve(directoryPath, 'index.tsx'))
}

function requirePublicChildReadmes(parentPath) {
  if (!existsSync(parentPath)) return

  for (const entry of readdirSync(parentPath, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const childPath = resolve(parentPath, entry.name)
    if (hasPublicEntry(childPath)) requireReadme(childPath)
  }
}

for (const modulePath of [
  'src/app',
  'src/app/config',
  'src/app/router',
  'src/app/styles',
  'src/features',
  'src/shared/api',
  'src/shared/config',
  'src/shared/constants',
  'src/shared/i18n',
  'src/shared/notification',
  'src/shared/theme',
]) {
  requireReadme(modulePath)
}

for (const parentPath of [
  'src/entities',
  'src/features',
  'src/pages',
  'src/widgets',
  'src/shared/lib',
  'src/shared/ui',
]) {
  requirePublicChildReadmes(parentPath)
}

const formatDocumentationPath = resolve('src/shared/lib/format.md')
if (!existsSync(formatDocumentationPath)) {
  reportError('src/shared/lib/format.ts: missing adjacent format.md')
} else {
  validateDocumentation(formatDocumentationPath, 'src/shared/lib/format.md')
}

if (errors.length > 0) {
  for (const error of errors) console.error(`Module documentation validation: ${error}`)
  process.exitCode = 1
}
