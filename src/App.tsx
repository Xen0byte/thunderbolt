import { JSXElement } from 'solid-js'

import { createTray } from './lib/tray'

import './App.css'

export default function App({ children }: { children?: JSXElement }) {
  createTray()

  return <div>{children}</div>
}
