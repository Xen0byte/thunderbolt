import './index.css'

import { JSXElement } from 'solid-js'

export default function App({ children }: { children?: JSXElement }) {
  return <main class="flex h-screen w-screen">{children}</main>
}
