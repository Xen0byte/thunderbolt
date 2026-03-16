import ReactDOM from 'react-dom/client'
import { App } from './app'
import './polyfills'

import './index.css'
import { initializeLinkInterception } from './lib/intercept-links'

// After an update+relaunch, the WebView may restore a stale route (e.g. /waitlist
// verify screen). Detect this and force a clean start at root.
if (localStorage.getItem('thunderbolt_post_update')) {
  localStorage.removeItem('thunderbolt_post_update')
  if (window.location.pathname !== '/') {
    window.location.replace('/')
  }
}

initializeLinkInterception()

const root = document.getElementById('root') as HTMLElement

ReactDOM.createRoot(root).render(<App />)
