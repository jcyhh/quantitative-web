import { useRef } from 'react'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { isSupportedTheme, supportedThemes } from '../../config/theme'
import { useAppTheme, useThemeTransition } from '../../theme'
import styles from './ThemeSwitcher.module.scss'

export function ThemeSwitcher(): ReactElement {
  const { t } = useTranslation()
  const { theme } = useAppTheme()
  const selectRef = useRef<HTMLSelectElement>(null)
  const transitionToTheme = useThemeTransition({ originRef: selectRef })

  return <label className={styles.themeSwitcher}><select ref={selectRef} value={theme} onChange={(event) => { const nextTheme = event.target.value; if (isSupportedTheme(nextTheme)) transitionToTheme(nextTheme) }}>{supportedThemes.map((item) => <option key={item} value={item}>{t(`theme.${item}`)}</option>)}</select></label>
}
