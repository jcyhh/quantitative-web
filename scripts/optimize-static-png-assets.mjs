import { access, mkdir, readFile, readdir, rename, rm, stat, unlink, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

export const minimumPngBytes = 512 * 1024

const sourceExtensions = new Set(['.css', '.html', '.js', '.jsx', '.mjs', '.scss', '.ts', '.tsx', '.vue'])

function createFileSystem(overrides = {}) {
  return {
    access,
    mkdir,
    readFile,
    readdir,
    rename,
    rm,
    stat,
    unlink,
    writeFile,
    ...overrides,
  }
}

function isWithinDirectory(filePath, directoryPath) {
  const pathFromDirectory = relative(directoryPath, filePath)
  return pathFromDirectory !== '' && !pathFromDirectory.startsWith(`..${sep}`) && pathFromDirectory !== '..' && !isAbsolute(pathFromDirectory)
}

function isManagedAsset(filePath, sourceDirectory) {
  return relative(sourceDirectory, dirname(filePath)).split(sep).includes('assets')
}

function splitSpecifier(specifier) {
  const match = specifier.match(/^([^?#]+)([?#][\s\S]*)?$/)
  if (match === null) return null

  return {
    pathname: match[1],
    suffix: match[2] ?? '',
  }
}

function resolveStaticAssetSpecifier(specifier, importerPath, sourceDirectory, rootDirectory) {
  const parts = splitSpecifier(specifier)
  if (parts === null || extname(parts.pathname).toLowerCase() !== '.png') return null

  let resolvedPath

  if (parts.pathname.startsWith('/src/')) {
    resolvedPath = resolve(rootDirectory, parts.pathname.slice(1))
  } else if (parts.pathname.startsWith('./') || parts.pathname.startsWith('../')) {
    resolvedPath = resolve(dirname(importerPath), parts.pathname)
  } else {
    return null
  }

  return isWithinDirectory(resolvedPath, sourceDirectory) ? resolvedPath : null
}

function toWebpSpecifier(specifier) {
  return specifier.replace(/\.png(?=([?#]|$))/i, '.webp')
}

function isAnimatedPng(pngBuffer) {
  const pngSignatureLength = 8
  let offset = pngSignatureLength

  while (offset + 12 <= pngBuffer.length) {
    const chunkLength = pngBuffer.readUInt32BE(offset)
    const chunkType = pngBuffer.toString('ascii', offset + 4, offset + 8)

    if (chunkType === 'acTL') return true
    offset += chunkLength + 12
  }

  return false
}

function collectStaticSpecifierMatches(content) {
  const matches = []
  const seenOffsets = new Set()

  const addMatch = (specifier, start, end) => {
    const key = `${start}:${end}`
    if (seenOffsets.has(key)) return

    seenOffsets.add(key)
    matches.push({ specifier, start, end })
  }

  const quotedSpecifier = /(['"])([^'"\r\n]*?\.png(?:[?#][^'"\r\n]*)?)\1/gi
  for (const match of content.matchAll(quotedSpecifier)) {
    const specifier = match[2]
    const start = (match.index ?? 0) + 1
    addMatch(specifier, start, start + specifier.length)
  }

  const unquotedCssUrl = /url\(\s*([^'"\s)][^\s)]*?\.png(?:[?#][^\s)]*)?)\s*\)/gi
  for (const match of content.matchAll(unquotedCssUrl)) {
    const specifier = match[1]
    const start = (match.index ?? 0) + match[0].indexOf(specifier)
    addMatch(specifier, start, start + specifier.length)
  }

  const unquotedMarkupUrl = /\b(?:href|poster|src)\s*=\s*([^\s'"=>][^\s=>]*?\.png(?:[?#][^\s=>]*)?)/gi
  for (const match of content.matchAll(unquotedMarkupUrl)) {
    const specifier = match[1]
    const start = (match.index ?? 0) + match[0].lastIndexOf(specifier)
    addMatch(specifier, start, start + specifier.length)
  }

  return matches
}

function replaceReferences(content, references) {
  let updatedContent = content

  for (const reference of [...references].sort((left, right) => right.start - left.start)) {
    updatedContent = `${updatedContent.slice(0, reference.start)}${toWebpSpecifier(reference.specifier)}${updatedContent.slice(reference.end)}`
  }

  return updatedContent
}

async function walkFiles(directoryPath, fileSystem) {
  const entries = await fileSystem.readdir(directoryPath, { withFileTypes: true })
  const files = []

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = join(directoryPath, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await walkFiles(entryPath, fileSystem)))
      continue
    }

    if (entry.isFile()) files.push(entryPath)
  }

  return files
}

async function fileExists(filePath, fileSystem) {
  try {
    await fileSystem.access(filePath, constants.F_OK)
    return true
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return false
    throw error
  }
}

async function readTextFile(filePath, fileSystem) {
  try {
    return await fileSystem.readFile(filePath, 'utf8')
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return null
    throw error
  }
}

function findReferencesForAsset(sourceFiles, assetPath, sourceDirectory, rootDirectory) {
  const references = []

  for (const sourceFile of sourceFiles.values()) {
    for (const match of collectStaticSpecifierMatches(sourceFile.nextContent)) {
      const referencedPath = resolveStaticAssetSpecifier(match.specifier, sourceFile.path, sourceDirectory, rootDirectory)
      if (referencedPath === assetPath) {
        references.push({
          ...match,
          sourcePath: sourceFile.path,
        })
      }
    }
  }

  return references
}

function groupReferencesBySource(references) {
  const grouped = new Map()

  for (const reference of references) {
    const sourceReferences = grouped.get(reference.sourcePath) ?? []
    sourceReferences.push(reference)
    grouped.set(reference.sourcePath, sourceReferences)
  }

  return grouped
}

async function createMigrationPlan(rootDirectory, fileSystem) {
  const sourceDirectory = resolve(rootDirectory, 'src')
  const sourceFiles = new Map()

  for (const filePath of await walkFiles(sourceDirectory, fileSystem)) {
    if (!sourceExtensions.has(extname(filePath))) continue

    const content = await readTextFile(filePath, fileSystem)
    if (content === null) continue

    sourceFiles.set(filePath, {
      nextContent: content,
      originalContent: content,
      path: filePath,
    })
  }

  const candidates = (await walkFiles(sourceDirectory, fileSystem))
    .filter((filePath) => extname(filePath).toLowerCase() === '.png' && isManagedAsset(filePath, sourceDirectory))
  const skipped = []
  const migrations = []

  for (const pngPath of candidates) {
    let pngBuffer
    let pngStats

    try {
      ;[pngBuffer, pngStats] = await Promise.all([fileSystem.readFile(pngPath), fileSystem.stat(pngPath)])
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ENOENT') {
        skipped.push({ path: pngPath, reason: 'source disappeared during scan' })
        continue
      }

      throw error
    }

    if (pngStats.size < minimumPngBytes) {
      skipped.push({ path: pngPath, reason: 'smaller than 512 KiB' })
      continue
    }

    if (isAnimatedPng(pngBuffer)) {
      skipped.push({ path: pngPath, reason: 'animated PNG' })
      continue
    }

    const webpPath = join(dirname(pngPath), `${basename(pngPath, extname(pngPath))}.webp`)
    if (await fileExists(webpPath, fileSystem)) {
      skipped.push({ path: pngPath, reason: 'same-name WebP already exists' })
      continue
    }

    const references = findReferencesForAsset(sourceFiles, pngPath, sourceDirectory, rootDirectory)
    if (references.length === 0) {
      skipped.push({ path: pngPath, reason: 'no supported static source reference' })
      continue
    }

    const webpBuffer = await sharp(pngBuffer).webp({ alphaQuality: 100, quality: 90 }).toBuffer()
    if (webpBuffer.length >= pngStats.size) {
      skipped.push({ path: pngPath, reason: 'WebP is not smaller' })
      continue
    }

    for (const [sourcePath, sourceReferences] of groupReferencesBySource(references)) {
      const sourceFile = sourceFiles.get(sourcePath)
      sourceFile.nextContent = replaceReferences(sourceFile.nextContent, sourceReferences)
    }

    migrations.push({
      pngBuffer,
      pngPath,
      references,
      webpBuffer,
      webpPath,
    })
  }

  const changedSourceFiles = [...sourceFiles.values()].filter((sourceFile) => sourceFile.nextContent !== sourceFile.originalContent)

  return {
    changedSourceFiles,
    migrations,
    rootDirectory,
    skipped,
    sourceDirectory,
  }
}

function temporaryPath(filePath) {
  return join(dirname(filePath), `.${basename(filePath)}.${randomUUID()}.tmp`)
}

async function cleanTemporaryFiles(temporaryPaths, fileSystem) {
  await Promise.all(temporaryPaths.map((filePath) => fileSystem.rm(filePath, { force: true }).catch(() => undefined)))
}

async function verifyNoRemainingStaticReferences(migrations, sourceDirectory, rootDirectory, fileSystem) {
  const pngPaths = new Set(migrations.map((migration) => migration.pngPath))

  for (const filePath of await walkFiles(sourceDirectory, fileSystem)) {
    if (!sourceExtensions.has(extname(filePath))) continue

    const content = await readTextFile(filePath, fileSystem)
    if (content === null) continue

    for (const match of collectStaticSpecifierMatches(content)) {
      const referencedPath = resolveStaticAssetSpecifier(match.specifier, filePath, sourceDirectory, rootDirectory)
      if (referencedPath !== null && pngPaths.has(referencedPath)) {
        throw new Error(`Static PNG reference remained after migration: ${filePath}`)
      }
    }
  }
}

async function commitMigrationPlan(plan, fileSystem) {
  const activeChanges = []

  for (const sourceFile of plan.changedSourceFiles) {
    if (await fileExists(sourceFile.path, fileSystem)) {
      activeChanges.push(sourceFile)
    }
  }

  const activeSourcePaths = new Set(activeChanges.map((sourceFile) => sourceFile.path))
  const activeMigrations = plan.migrations.filter((migration) => migration.references.some((reference) => activeSourcePaths.has(reference.sourcePath)))
  const temporaryFiles = []
  const committedSourceFiles = []
  const committedWebpFiles = []
  const deletedPngFiles = []

  try {
    for (const migration of activeMigrations) {
      if (await fileExists(migration.webpPath, fileSystem)) {
        throw new Error(`Refusing to overwrite an existing WebP: ${migration.webpPath}`)
      }
    }

    for (const sourceFile of activeChanges) {
      const pathForTemporarySource = temporaryPath(sourceFile.path)
      await fileSystem.writeFile(pathForTemporarySource, sourceFile.nextContent, 'utf8')
      temporaryFiles.push(pathForTemporarySource)
      sourceFile.temporaryPath = pathForTemporarySource
    }

    for (const migration of activeMigrations) {
      const pathForTemporaryWebp = temporaryPath(migration.webpPath)
      await fileSystem.writeFile(pathForTemporaryWebp, migration.webpBuffer)
      temporaryFiles.push(pathForTemporaryWebp)
      migration.temporaryPath = pathForTemporaryWebp
    }

    for (const sourceFile of activeChanges) {
      await fileSystem.rename(sourceFile.temporaryPath, sourceFile.path)
      committedSourceFiles.push(sourceFile)
    }

    for (const migration of activeMigrations) {
      await fileSystem.rename(migration.temporaryPath, migration.webpPath)
      committedWebpFiles.push(migration)
    }

    await verifyNoRemainingStaticReferences(activeMigrations, plan.sourceDirectory, plan.rootDirectory, fileSystem)

    for (const migration of activeMigrations) {
      await fileSystem.unlink(migration.pngPath)
      deletedPngFiles.push(migration)
    }
  } catch (error) {
    await Promise.all(committedSourceFiles.map((sourceFile) => fileSystem.writeFile(sourceFile.path, sourceFile.originalContent, 'utf8').catch(() => undefined)))
    await Promise.all(committedWebpFiles.map((migration) => fileSystem.rm(migration.webpPath, { force: true }).catch(() => undefined)))
    await Promise.all(deletedPngFiles.map((migration) => fileSystem.writeFile(migration.pngPath, migration.pngBuffer).catch(() => undefined)))
    await cleanTemporaryFiles(temporaryFiles, fileSystem)
    throw error
  }

  await cleanTemporaryFiles(temporaryFiles, fileSystem)
  return activeMigrations
}

export async function optimizeStaticPngAssets(options = {}) {
  const rootDirectory = resolve(options.rootDirectory ?? process.cwd())
  const fileSystem = createFileSystem(options.fileSystem)
  const logger = options.logger ?? console
  const plan = await createMigrationPlan(rootDirectory, fileSystem)
  const migrated = await commitMigrationPlan(plan, fileSystem)

  for (const migration of migrated) {
    logger.log(`[assets:optimize] ${relative(rootDirectory, migration.pngPath)} -> ${relative(rootDirectory, migration.webpPath)} (${migration.references.length} references)`)
  }

  for (const skipped of plan.skipped) {
    logger.log(`[assets:optimize] skipped ${relative(rootDirectory, skipped.path)}: ${skipped.reason}`)
  }

  return {
    migrated,
    skipped: plan.skipped,
  }
}

const invokedPath = process.argv[1] === undefined ? '' : resolve(process.argv[1])
const currentPath = fileURLToPath(import.meta.url)

if (invokedPath === currentPath) {
  optimizeStaticPngAssets().catch((error) => {
    console.error(`[assets:optimize] ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
}

export { createFileSystem, isAnimatedPng }
