import { useTranslation } from 'react-i18next'
import type { ReactElement } from 'react'
import styles from './PlaceholderPage.module.scss'

interface PlaceholderPageProps { titleKey: string; descriptionKey: string }

export function PlaceholderPage({ titleKey, descriptionKey }: PlaceholderPageProps): ReactElement {
  const { t } = useTranslation()
  return <section className={styles.page}><p className={styles.eyebrow}>COMING SOON</p><h1>{t(titleKey)}</h1><p className={styles.description}>{t(descriptionKey)}</p></section>
}
