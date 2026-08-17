/**
 * Stable project identifiers and public static asset paths.
 * Update this single module when a high-frequency project name or asset changes.
 */
export const projectConstants = {
  shortName: 'Quant Lab',
  abbreviation: 'QL',
  assets: {
    faviconPath: '/favicon.svg',
    iconSpritePath: '/icons.svg',
  },
} as const

export type ProjectConstant = typeof projectConstants
