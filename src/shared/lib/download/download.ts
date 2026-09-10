export type DownloadSource = Blob | string

const attachmentMimeType = 'application/octet-stream'

/**
 * Downloads a Blob or an already-resolved URL. Prefer a Blob for generated CSV,
 * JSON and report content so the caller does not need to create object URLs itself.
 * Inline-friendly Blob MIME types are exposed as an attachment to reduce the
 * chance that browsers open PDF or text content in a new viewer.
 */
export function downloadFile(source: DownloadSource, fileName: string): void {
    let objectUrl: string | undefined
    let href: string

    if (source instanceof Blob) {
        const downloadBlob = toDownloadBlob(source)
        objectUrl = URL.createObjectURL(downloadBlob)
        href = objectUrl
    } else {
        href = source
    }

    const link = document.createElement('a')

    link.href = href
    link.download = fileName
    link.style.display = 'none'
    document.body.append(link)
    link.click()
    link.remove()

    if (objectUrl) window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}

export function downloadText(content: string, fileName: string, type = 'text/plain;charset=utf-8'): void {
    downloadFile(new Blob([content], { type }), fileName)
}

function toDownloadBlob(source: Blob): Blob {
    return isInlineMimeType(source.type) ? new Blob([source], { type: attachmentMimeType }) : source
}

function isInlineMimeType(type: string): boolean {
    const normalizedType = type.split(';', 1)[0]?.trim().toLowerCase() ?? ''

    return (
        normalizedType === 'application/pdf' ||
        normalizedType.startsWith('text/') ||
        normalizedType === 'application/json' ||
        normalizedType === 'application/xml' ||
        normalizedType === 'application/xhtml+xml' ||
        normalizedType === 'image/svg+xml'
    )
}
