export type DownloadSource = Blob | string

/**
 * Downloads a Blob or an already-resolved URL. Prefer a Blob for generated CSV,
 * JSON and report content so the caller does not need to create object URLs itself.
 */
export function downloadFile(source: DownloadSource, fileName: string): void {
  let objectUrl: string | undefined
  let href: string

  if (source instanceof Blob) {
    objectUrl = URL.createObjectURL(source)
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
