import { cn } from '@/lib/utils'
import { JSX, splitProps } from 'solid-js'

export function Card(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <div data-slot="card" class={cn('bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm', local.class)} {...others}>
      {local.children}
    </div>
  )
}

export function CardHeader(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <div data-slot="card-header" class={cn('flex flex-col gap-1.5 px-6', local.class)} {...others}>
      {local.children}
    </div>
  )
}

export function CardTitle(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <div data-slot="card-title" class={cn('leading-none font-semibold', local.class)} {...others}>
      {local.children}
    </div>
  )
}

export function CardDescription(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <div data-slot="card-description" class={cn('text-muted-foreground text-sm', local.class)} {...others}>
      {local.children}
    </div>
  )
}

export function CardContent(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <div data-slot="card-content" class={cn('px-6', local.class)} {...others}>
      {local.children}
    </div>
  )
}

export function CardFooter(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <div data-slot="card-footer" class={cn('flex items-center px-6', local.class)} {...others}>
      {local.children}
    </div>
  )
}
