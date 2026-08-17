import { supportedLanguages, useAppLanguage } from '../../i18n'
import type { ReactElement } from 'react'
import styles from './LanguageSwitcher.module.scss'

const languageLabels = { 'zh-CN': '简体中文', 'en-US': 'English' } as const

export function LanguageSwitcher(): ReactElement {
  const { language, changeLanguage } = useAppLanguage()

  return <label className={styles.languageSwitcher}><select value={language} onChange={(event) => changeLanguage(event.target.value)}>{supportedLanguages.map((item) => <option key={item} value={item}>{languageLabels[item]}</option>)}</select></label>
}
