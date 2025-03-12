import { cn } from '@/lib/utils'
import { JSXElement, mergeProps, splitProps } from 'solid-js'

export interface SidebarProps {
  width?: string
  class?: string
  children?: JSXElement
}

export function Sidebar(props: SidebarProps) {
  const [local, others] = splitProps(mergeProps({ width: '240px' }, props), ['width', 'class', 'children'])

  return (
    <aside class={cn('h-full flex flex-col p-4 bg-background border-r border-border flex-shrink-0', local.class)} style={{ 'flex-basis': local.width }} {...others}>
      {local.children}
    </aside>
  )
}
