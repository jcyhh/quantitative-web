import assert from 'node:assert/strict'
import test from 'node:test'
import { downloadFile, downloadText } from './download'

interface FakeAnchor {
    clicked: boolean
    download: string
    href: string
    removed: boolean
    style: { display: string }
    click(): void
    remove(): void
}

interface DownloadHarness {
    links: FakeAnchor[]
    objectUrls: Blob[]
    revokedUrls: string[]
    restore(): void
}

function createDownloadHarness(): DownloadHarness {
    const links: FakeAnchor[] = []
    const objectUrls: Blob[] = []
    const revokedUrls: string[] = []
    const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
    const createObjectUrlDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
    const revokeObjectUrlDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')

    const documentStub = {
        body: {
            append: (_link: FakeAnchor): void => undefined,
        },
        createElement: (tagName: string): FakeAnchor => {
            assert.equal(tagName, 'a')
            const link: FakeAnchor = {
                clicked: false,
                download: '',
                href: '',
                removed: false,
                style: { display: '' },
                click(): void {
                    link.clicked = true
                },
                remove(): void {
                    link.removed = true
                },
            }
            links.push(link)
            return link
        },
    }
    const windowStub = {
        setTimeout: (callback: () => void): number => {
            callback()
            return 0
        },
    }

    Object.defineProperty(globalThis, 'document', { configurable: true, value: documentStub })
    Object.defineProperty(globalThis, 'window', { configurable: true, value: windowStub })
    Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: (blob: Blob): string => {
            objectUrls.push(blob)
            return `blob:download-${String(objectUrls.length)}`
        },
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: (url: string): void => {
            revokedUrls.push(url)
        },
    })

    return {
        links,
        objectUrls,
        revokedUrls,
        restore(): void {
            restoreGlobalProperty('document', documentDescriptor)
            restoreGlobalProperty('window', windowDescriptor)
            restoreUrlMethod('createObjectURL', createObjectUrlDescriptor)
            restoreUrlMethod('revokeObjectURL', revokeObjectUrlDescriptor)
        },
    }
}

test('inline-friendly Blob files use an attachment MIME type and download attribute', async () => {
    const harness = createDownloadHarness()

    try {
        downloadFile(new Blob(['%PDF-1.7'], { type: 'application/pdf' }), 'report.pdf')
        downloadText('plain text', 'notes.txt')

        assert.equal(harness.links.length, 2)
        assert.equal(harness.links[0]?.download, 'report.pdf')
        assert.equal(harness.links[1]?.download, 'notes.txt')
        assert.equal(harness.links[0]?.clicked, true)
        assert.equal(harness.links[1]?.clicked, true)
        assert.equal(harness.links[0]?.removed, true)
        assert.equal(harness.links[1]?.removed, true)
        assert.deepEqual(
            harness.objectUrls.map((blob) => blob.type),
            ['application/octet-stream', 'application/octet-stream'],
        )
        assert.equal(await harness.objectUrls[0]?.text(), '%PDF-1.7')
        assert.equal(await harness.objectUrls[1]?.text(), 'plain text')
        assert.deepEqual(harness.revokedUrls, ['blob:download-1', 'blob:download-2'])
    } finally {
        harness.restore()
    }
})

test('URL sources keep the requested filename for the browser download hint', () => {
    const harness = createDownloadHarness()

    try {
        downloadFile('https://example.com/report.pdf', 'report.pdf')

        assert.equal(harness.links[0]?.href, 'https://example.com/report.pdf')
        assert.equal(harness.links[0]?.download, 'report.pdf')
        assert.equal(harness.links[0]?.clicked, true)
        assert.equal(harness.objectUrls.length, 0)
    } finally {
        harness.restore()
    }
})

function restoreGlobalProperty(name: 'document' | 'window', descriptor: PropertyDescriptor | undefined): void {
    if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor)
        return
    }
    Reflect.deleteProperty(globalThis, name)
}

function restoreUrlMethod(
    name: 'createObjectURL' | 'revokeObjectURL',
    descriptor: PropertyDescriptor | undefined,
): void {
    if (descriptor) {
        Object.defineProperty(URL, name, descriptor)
        return
    }
    Reflect.deleteProperty(URL, name)
}
