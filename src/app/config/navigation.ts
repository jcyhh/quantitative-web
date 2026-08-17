export interface NavigationItem {
  labelKey: string
  to: string
  icon: string
  end?: boolean
}

export const navigationItems: NavigationItem[] = [
  { labelKey: 'navigation.dashboard', to: routePaths.dashboard, icon: '▦', end: true },
  { labelKey: 'navigation.strategies', to: routePaths.strategies, icon: '⌁' },
  { labelKey: 'navigation.research', to: routePaths.research, icon: '◌' },
  { labelKey: 'navigation.portfolio', to: routePaths.portfolio, icon: '◫' },
  { labelKey: 'navigation.settings', to: routePaths.settings, icon: '⚙' },
]
import { routePaths } from './routes'
