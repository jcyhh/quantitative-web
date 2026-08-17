import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ReactElement } from 'react'
import { navigationItems } from '../../../app/config/navigation'
import { LanguageSwitcher } from '../../../shared/ui/language-switcher'
import { ThemeSwitcher } from '../../../shared/ui/theme-switcher'
import { sharedConfig } from '../../../shared/config'
import styles from './AppLayout.module.scss'

export function AppLayout(): ReactElement {
  const { t } = useTranslation()
  return <div className={styles.appShell}><aside className={styles.sidebar}><a className={styles.brand} href="/" aria-label={`${sharedConfig.application.name} home`}><span className={styles.brandMark}>Q</span><span>{sharedConfig.application.name}</span></a><nav className={styles.mainNav} aria-label="Main navigation">{navigationItems.map((item) => <NavLink key={item.to} className={({ isActive }) => `${styles.navItem}${isActive ? ` ${styles.isActive}` : ''}`} end={item.end ?? false} to={item.to}><span className={styles.navIcon} aria-hidden="true">{item.icon}</span>{t(item.labelKey)}</NavLink>)}</nav><div className={styles.sidebarFooter}><span className={styles.connectionDot} aria-hidden="true" />{t('layout.environment')}</div></aside><main className={styles.mainContent}><header className={styles.topbar}><div><p className={styles.eyebrow}>{t('layout.workspace')}</p><p className={styles.marketStatus}><span /> {t('layout.marketConnected')}</p></div><div className={styles.topbarActions}><ThemeSwitcher /><LanguageSwitcher /><button className={styles.userMenu} type="button" aria-label={t('layout.userMenu')}>JC</button></div></header><Outlet /></main></div>
}
