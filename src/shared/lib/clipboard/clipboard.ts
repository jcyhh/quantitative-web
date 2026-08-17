import copy from 'copy-to-clipboard'

/**
 * Copies non-empty text through the project-approved cross-browser clipboard library.
 * Callers own user feedback and localization.
 */
export async function copyText(text: string): Promise<boolean> {
  if (text.length === 0) return false

  return copy(text)
}
