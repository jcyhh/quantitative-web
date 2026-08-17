import type { ReactNode } from 'react'
import type { ReactElement } from 'react'
import styles from './MetricCard.module.scss'

interface MetricCardProps { label: string; value: string; change?: string; trend?: 'positive' | 'negative' | 'neutral'; children?: ReactNode }

export function MetricCard({ label, value, change, trend = 'neutral', children }: MetricCardProps): ReactElement {
  return <article className={styles.metricCard}><p className={styles.label}>{label}</p><strong className={styles.value}>{value}</strong>{change && <span className={`${styles.change} ${trend === 'positive' ? styles.positive : trend === 'negative' ? styles.negative : ''}`}>{change}</span>}{children}</article>
}
