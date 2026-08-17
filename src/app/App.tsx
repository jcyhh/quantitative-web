import { RouterProvider } from 'react-router-dom'
import type { ReactElement } from 'react'
import { router } from './router/router'
import { ThemeProvider } from '../shared/theme'

export function App(): ReactElement {
  return <ThemeProvider><RouterProvider router={router} /></ThemeProvider>
}
