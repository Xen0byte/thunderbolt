import { cn } from '@/lib/utils'
import { JSX, mergeProps, splitProps } from 'solid-js'

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {}

export function Input(props: InputProps) {
  const [local, others] = splitProps(mergeProps({ type: 'text' }, props), ['type', 'class'])

  return (
    <input
      type={local.type}
      class={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
        'placeholder:text-gray-300',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#6ba3d9] focus-visible:border-[#6ba3d9]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'text-sm',
        local.class
      )}
      {...others}
    />
  )
}
