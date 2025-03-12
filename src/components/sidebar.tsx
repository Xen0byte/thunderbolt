import { cn } from '@/lib/utils'
import React from 'react'

export interface SidebarProps {
  width?: string
  className?: string
  children?: React.ReactNode
}

export function Sidebar({ width = '240px', className, children, ...props }: SidebarProps) {
  return (
    <aside className={cn('h-full flex flex-col p-4 bg-background border-r border-border flex-shrink-0', className)} style={{ flexBasis: width }} {...props}>
      {children}
    </aside>
  )
}
