import { useMemo } from 'react'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { MetricCard } from '../../../shared/ui/metric-card'
import { formatCurrency, formatPercent } from '../../../shared/lib/format'
import { useAppTheme } from '../../../shared/theme'
import { TldEChart, readEChartCssVariable, type EChartOption } from '../../../shared/ui/tld-echart'
import styles from './DashboardPage.module.scss'

const strategyRows = [
    { name: '沪深 300 动量轮动', statusKey: 'dashboard.running', returnRate: 0.1248, drawdown: -0.0362 },
    { name: '中性多因子选股', statusKey: 'dashboard.running', returnRate: 0.0864, drawdown: -0.0218 },
    { name: 'CTA 趋势跟踪', statusKey: 'dashboard.paused', returnRate: -0.0113, drawdown: -0.0587 },
]

const equityCurveDays = ['07/08', '07/10', '07/12', '07/16', '07/18', '07/22', '07/24']
const equityCurveValues = [100, 101.4, 100.8, 103.2, 104.6, 106.1, 108.4]

function readChartColor(variableName: string): string {
    return readEChartCssVariable(variableName) || 'transparent'
}

function createEquityCurveOption(isDarkTheme: boolean): EChartOption {
    const lineColor = readChartColor('--color-positive')
    const gridColor = readChartColor('--color-chart-grid')
    const textColor = readChartColor('--color-text-secondary')
    const surfaceColor = readChartColor('--color-surface')

    return {
        darkMode: isDarkTheme,
        animation: false,
        grid: { left: 12, right: 16, top: 16, bottom: 12, containLabel: true },
        tooltip: {
            trigger: 'axis',
            confine: true,
            backgroundColor: surfaceColor,
            borderColor: gridColor,
            textStyle: { color: textColor },
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: equityCurveDays,
            axisTick: { show: false },
            axisLine: { lineStyle: { color: gridColor } },
            axisLabel: { color: textColor, fontSize: 10 },
        },
        yAxis: {
            type: 'value',
            scale: true,
            axisTick: { show: false },
            axisLine: { show: false },
            axisLabel: { color: textColor, fontSize: 10 },
            splitLine: { lineStyle: { color: gridColor } },
        },
        series: [
            {
                type: 'line',
                data: equityCurveValues,
                smooth: true,
                showSymbol: false,
                lineStyle: { color: lineColor, width: 2 },
                areaStyle: { color: lineColor, opacity: 0.08 },
            },
        ],
    }
}

export function DashboardPage(): ReactElement {
    const { t, i18n } = useTranslation()
    const { theme } = useAppTheme()
    const locale = i18n.resolvedLanguage ?? i18n.language
    const equityCurveOption = useMemo(() => createEquityCurveOption(theme === 'dark'), [theme])

    return (
        <section className={styles.page}>
            <div className={styles.pageHeading}>
                <div>
                    <h1>{t('dashboard.greeting')}</h1>
                    <p>{t('dashboard.subtitle')}</p>
                </div>
                <button className={styles.primaryButton} type="button">
                    {t('dashboard.createStrategy')}
                </button>
            </div>
            <div className={styles.metricsGrid}>
                <MetricCard
                    label={t('dashboard.equity')}
                    value={formatCurrency(1_284_560, 'CNY', locale)}
                    change={t('dashboard.equityChange')}
                    trend="positive"
                />
                <MetricCard
                    label={t('dashboard.totalReturn')}
                    value={formatPercent(0.1842, 2, locale)}
                    change={t('dashboard.returnChange')}
                    trend="positive"
                />
                <MetricCard
                    label={t('dashboard.maxDrawdown')}
                    value={formatPercent(-0.0675, 2, locale)}
                    change={t('dashboard.riskLevel')}
                    trend="negative"
                />
                <MetricCard label={t('dashboard.activeStrategies')} value="2 / 3" change={t('dashboard.dataAsOf')} />
            </div>
            <div className={styles.contentGrid}>
                <section className={styles.panel}>
                    <div className={styles.panelHeading}>
                        <div>
                            <h2>{t('dashboard.equityCurve')}</h2>
                            <p>{t('dashboard.equityCurveDescription')}</p>
                        </div>
                        <button className={styles.textButton} type="button">
                            {t('dashboard.viewDetails')}
                        </button>
                    </div>
                    <TldEChart
                        option={equityCurveOption}
                        className={styles.chart}
                        ariaLabel={t('dashboard.equityCurve')}
                    />
                    <p className={styles.chartNote}>{t('dashboard.chartPreview')}</p>
                </section>
                <section className={styles.panel}>
                    <div className={styles.panelHeading}>
                        <h2>{t('dashboard.activity')}</h2>
                    </div>
                    <ul className={styles.activityList}>
                        <li>
                            <span className={`${styles.activityMark} ${styles.positive}`} />
                            {t('dashboard.activityOne')} <time>{t('dashboard.today')}</time>
                        </li>
                        <li>
                            <span className={styles.activityMark} />
                            {t('dashboard.activityTwo')} <time>{t('dashboard.yesterday')}</time>
                        </li>
                        <li>
                            <span className={`${styles.activityMark} ${styles.warning}`} />
                            {t('dashboard.activityThree')} <time>{t('dashboard.august16')}</time>
                        </li>
                    </ul>
                </section>
            </div>
            <section className={`${styles.panel} ${styles.strategiesPanel}`}>
                <div className={styles.panelHeading}>
                    <div>
                        <h2>{t('dashboard.strategyOverview')}</h2>
                        <p>{t('dashboard.strategyDescription')}</p>
                    </div>
                    <button className={styles.textButton} type="button">
                        {t('dashboard.manageStrategies')}
                    </button>
                </div>
                <div className={styles.tableWrap}>
                    <table className={styles.strategyTable}>
                        <thead>
                            <tr>
                                <th>{t('dashboard.table.strategy')}</th>
                                <th>{t('dashboard.table.status')}</th>
                                <th>{t('dashboard.table.return')}</th>
                                <th>{t('dashboard.table.drawdown')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {strategyRows.map((strategy) => (
                                <tr key={strategy.name}>
                                    <td>{strategy.name}</td>
                                    <td>
                                        <span
                                            className={`${styles.statusPill} ${strategy.statusKey === 'dashboard.running' ? styles.running : styles.paused}`}
                                        >
                                            {t(strategy.statusKey)}
                                        </span>
                                    </td>
                                    <td
                                        className={
                                            strategy.returnRate >= 0 ? styles.valuePositive : styles.valueNegative
                                        }
                                    >
                                        {formatPercent(strategy.returnRate, 2, locale)}
                                    </td>
                                    <td>{formatPercent(strategy.drawdown, 2, locale)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </section>
    )
}
