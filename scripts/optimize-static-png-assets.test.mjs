import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import sharp from 'sharp'
import { createFileSystem, isAnimatedPng, optimizeStaticPngAssets } from './optimize-static-png-assets.mjs'

async function createLargePng(filePath) {
    const width = 600
    const height = 600
    const pixels = randomBytes(width * height * 4)

    await sharp(pixels, { raw: { channels: 4, height, width } })
        .png({ compressionLevel: 0 })
        .toFile(filePath)
}

async function createSmallPng(filePath) {
    await sharp({
        create: {
            background: { alpha: 1, b: 30, g: 20, r: 10 },
            channels: 4,
            height: 16,
            width: 16,
        },
    })
        .png()
        .toFile(filePath)
}

function createCrc32Table() {
    const table = new Uint32Array(256)

    for (let index = 0; index < table.length; index += 1) {
        let value = index
        for (let bit = 0; bit < 8; bit += 1) {
            value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0)
        }
        table[index] = value >>> 0
    }

    return table
}

const crc32Table = createCrc32Table()

function crc32(buffer) {
    let value = 0xffffffff
    for (const byte of buffer) {
        value = crc32Table[(value ^ byte) & 0xff] ^ (value >>> 8)
    }

    return (value ^ 0xffffffff) >>> 0
}

function createPngChunk(type, data) {
    const typeBuffer = Buffer.from(type, 'ascii')
    const lengthBuffer = Buffer.alloc(4)
    const checksumBuffer = Buffer.alloc(4)
    lengthBuffer.writeUInt32BE(data.length)
    checksumBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])))
    return Buffer.concat([lengthBuffer, typeBuffer, data, checksumBuffer])
}

function createFrameControl(sequence, width, height) {
    const frameControl = Buffer.alloc(26)
    frameControl.writeUInt32BE(sequence, 0)
    frameControl.writeUInt32BE(width, 4)
    frameControl.writeUInt32BE(height, 8)
    frameControl.writeUInt16BE(42, 20)
    frameControl.writeUInt16BE(1000, 22)
    return frameControl
}

function createApngFromStaticPng(pngBuffer, width, height) {
    const signature = pngBuffer.subarray(0, 8)
    const output = [signature]
    const idatChunks = []
    let offset = 8
    let insertedControls = false

    while (offset + 12 <= pngBuffer.length) {
        const length = pngBuffer.readUInt32BE(offset)
        const type = pngBuffer.toString('ascii', offset + 4, offset + 8)
        const data = pngBuffer.subarray(offset + 8, offset + 8 + length)

        if (type === 'IHDR') {
            output.push(createPngChunk(type, data))
            output.push(createPngChunk('acTL', Buffer.from([0, 0, 0, 2, 0, 0, 0, 0])))
            output.push(createPngChunk('fcTL', createFrameControl(0, width, height)))
            insertedControls = true
        } else if (type === 'IDAT') {
            idatChunks.push(data)
            output.push(createPngChunk(type, data))
        } else if (type === 'IEND') {
            assert.equal(insertedControls, true)
            output.push(createPngChunk('fcTL', createFrameControl(1, width, height)))
            let sequence = 2
            for (const idatChunk of idatChunks) {
                const sequenceBuffer = Buffer.alloc(4)
                sequenceBuffer.writeUInt32BE(sequence)
                output.push(createPngChunk('fdAT', Buffer.concat([sequenceBuffer, idatChunk])))
                sequence += 1
            }
            output.push(createPngChunk(type, data))
        } else {
            output.push(createPngChunk(type, data))
        }

        offset += length + 12
    }

    return Buffer.concat(output)
}

async function createAnimatedPng(filePath) {
    const width = 600
    const frameHeight = 300
    const pixels = randomBytes(width * frameHeight * 4)
    const pngBuffer = await sharp(pixels, {
        raw: {
            channels: 4,
            height: frameHeight,
            width,
        },
    })
        .png({ compressionLevel: 0 })
        .toBuffer()
    const apngBuffer = createApngFromStaticPng(pngBuffer, width, frameHeight)

    assert.equal(isAnimatedPng(apngBuffer), true)
    await writeFile(filePath, apngBuffer)
}

async function createFixture() {
    const rootDirectory = await mkdtemp(join(tmpdir(), 'quant-lab-static-assets-'))
    const assetDirectory = join(rootDirectory, 'src', 'shared', 'assets')
    const pageDirectory = join(rootDirectory, 'src', 'pages', 'dashboard')
    const widgetDirectory = join(rootDirectory, 'src', 'widgets', 'hero')

    await Promise.all([
        mkdir(assetDirectory, { recursive: true }),
        mkdir(pageDirectory, { recursive: true }),
        mkdir(widgetDirectory, { recursive: true }),
    ])
    await Promise.all([
        createLargePng(join(assetDirectory, 'large.png')),
        createLargePng(join(assetDirectory, 'unreferenced.png')),
        createAnimatedPng(join(assetDirectory, 'animated.png')),
        createSmallPng(join(assetDirectory, 'small.png')),
    ])
    await writeFile(
        join(pageDirectory, 'DashboardPage.tsx'),
        "import visual from '../../shared/assets/large.png'\nexport const dashboardVisual = visual\n",
        'utf8',
    )
    await writeFile(
        join(widgetDirectory, 'Hero.module.scss'),
        ".hero { background-image: url('../../shared/assets/large.png'); }\n",
        'utf8',
    )

    return rootDirectory
}

test('migrates one large static PNG and synchronizes TSX and SCSS references', async () => {
    const rootDirectory = await createFixture()
    const assetDirectory = join(rootDirectory, 'src', 'shared', 'assets')
    const pngPath = join(assetDirectory, 'large.png')
    const webpPath = join(assetDirectory, 'large.webp')
    const originalSize = (await stat(pngPath)).size

    try {
        const result = await optimizeStaticPngAssets({ logger: { log() {} }, rootDirectory })

        assert.equal(result.migrated.length, 1)
        assert.equal(await stat(webpPath).then(() => true), true)
        assert.ok((await stat(webpPath)).size < originalSize)
        await assert.rejects(stat(pngPath), { code: 'ENOENT' })
        assert.match(
            await readFile(join(rootDirectory, 'src', 'pages', 'dashboard', 'DashboardPage.tsx'), 'utf8'),
            /large\.webp/,
        )
        assert.match(
            await readFile(join(rootDirectory, 'src', 'widgets', 'hero', 'Hero.module.scss'), 'utf8'),
            /large\.webp/,
        )
        assert.equal(await stat(join(assetDirectory, 'small.png')).then(() => true), true)
        assert.equal(await stat(join(assetDirectory, 'unreferenced.png')).then(() => true), true)
        assert.equal(await stat(join(assetDirectory, 'animated.png')).then(() => true), true)
        assert.deepEqual(result.skipped.map((entry) => entry.reason).sort(), [
            'animated PNG',
            'no supported static source reference',
            'smaller than 512 KiB',
        ])
    } finally {
        await rm(rootDirectory, { force: true, recursive: true })
    }
})

test('rolls back changed source files and removes generated WebP when a commit write fails', async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), 'quant-lab-static-assets-failure-'))
    const assetDirectory = join(rootDirectory, 'src', 'shared', 'assets')
    const firstSource = join(rootDirectory, 'src', 'a.ts')
    const failingSource = join(rootDirectory, 'src', 'z.scss')
    const pngPath = join(assetDirectory, 'large.png')
    const webpPath = join(assetDirectory, 'large.webp')

    await Promise.all([
        mkdir(assetDirectory, { recursive: true }),
        mkdir(join(rootDirectory, 'src'), { recursive: true }),
    ])
    await createLargePng(pngPath)
    await writeFile(firstSource, "export const asset = './shared/assets/large.png'\n", 'utf8')
    await writeFile(failingSource, "body { background: url('./shared/assets/large.png'); }\n", 'utf8')

    const firstOriginal = await readFile(firstSource, 'utf8')
    const failingOriginal = await readFile(failingSource, 'utf8')
    const fileSystem = createFileSystem({
        async rename(sourcePath, targetPath) {
            if (sourcePath.includes('.z.scss.') && targetPath === failingSource) {
                throw new Error('simulated source write failure')
            }

            const { rename } = await import('node:fs/promises')
            await rename(sourcePath, targetPath)
        },
    })

    try {
        await assert.rejects(
            optimizeStaticPngAssets({ fileSystem, logger: { log() {} }, rootDirectory }),
            /simulated source write failure/,
        )

        assert.equal(await readFile(firstSource, 'utf8'), firstOriginal)
        assert.equal(await readFile(failingSource, 'utf8'), failingOriginal)
        assert.equal(await stat(pngPath).then(() => true), true)
        await assert.rejects(stat(webpPath), { code: 'ENOENT' })
    } finally {
        await rm(rootDirectory, { force: true, recursive: true })
    }
})
