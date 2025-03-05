import { Route, Router } from '@solidjs/router'
import { lazy } from 'solid-js'
import { render } from 'solid-js/web'
import App from './App'

const Main = lazy(() => import('./Home'))
const Settings = lazy(() => import('./Settings'))
const NotFound = lazy(() => import('./NotFound'))

render(
  () => (
    <Router root={App}>
      <Route path="/" component={Main} />
      <Route path="/settings" component={Settings} />
      <Route path="*404" component={NotFound} />
    </Router>
  ),
  document.getElementById('root') as HTMLElement
)
