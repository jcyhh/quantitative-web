import { Link, useRouteError } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ReactElement } from 'react'
import styles from './RouteErrorPage.module.scss'

export function RouteErrorPage(): ReactElement {
  const error = useRouteError()
  const { t } = useTranslation()
  const detail = error instanceof Error ? error.message : t('error.unknown')

  return <main className={styles.page}><p className={styles.eyebrow}>ERROR</p><h1>{t('error.title')}</h1><p>{detail}</p><Link className={styles.button} to="/">{t('error.backHome')}</Link></main>
}
