import { createElement, lazy, Suspense } from 'react'
import type { ComponentType, ReactElement } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../../widgets/app-layout'
import { routePaths } from '../config/routes'
import { RouteErrorPage } from './ui/RouteErrorPage'

function lazyPage(load: () => Promise<{ default: ComponentType<Record<string, never>> }>): ReactElement {
  const page = lazy(load)
  return <Suspense fallback={<div className="route-loading">Loading...</div>}>{createElement(page)}</Suspense>
}

function placeholderPage(titleKey: string, descriptionKey: string): ReactElement {
  return lazyPage(() => import('../../pages/placeholder').then(({ PlaceholderPage }) => ({ default: (): ReactElement => <PlaceholderPage titleKey={titleKey} descriptionKey={descriptionKey} /> })))
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: lazyPage(() => import('../../pages/dashboard').then(({ DashboardPage: Page }) => ({ default: Page }))) },
      { path: routePaths.strategies.slice(1), element: placeholderPage('pages.strategies.title', 'pages.strategies.description') },
      { path: routePaths.research.slice(1), element: placeholderPage('pages.research.title', 'pages.research.description') },
      { path: routePaths.portfolio.slice(1), element: placeholderPage('pages.portfolio.title', 'pages.portfolio.description') },
      { path: routePaths.settings.slice(1), element: placeholderPage('pages.settings.title', 'pages.settings.description') },
    ],
  },
  { path: '*', element: <Navigate to={routePaths.dashboard} replace /> },
])
