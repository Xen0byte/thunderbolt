import { Outlet } from 'react-router'
import './index.css'

export default function App() {
  return (
    <main className="flex h-screen w-screen">
      <Outlet />
    </main>
  )
}
