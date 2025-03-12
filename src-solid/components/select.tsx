import { cn } from '@/lib/utils'
import { Select as ArkSelect, createListCollection } from '@ark-ui/solid'
import { cva, type VariantProps } from 'class-variance-authority'
import { ChevronDown } from 'lucide-solid'
import { createSignal, For, JSX, mergeProps, splitProps } from 'solid-js'

const selectVariants = cva(
  'inline-flex items-center justify-between whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-background border border-input shadow-xs hover:bg-accent hover:text-accent-foreground',
        outline: 'border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onChange'>, VariantProps<typeof selectVariants> {
  options: SelectOption[]
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
}

export function Select(props: SelectProps) {
  const [local, others] = splitProps(mergeProps({ variant: 'default', size: 'default', placeholder: 'Select an option...' }, props), [
    'variant',
    'size',
    'class',
    'options',
    'placeholder',
    'value',
    'onChange',
    'disabled',
  ])

  const [selectedValue, setSelectedValue] = createSignal(local.value || '')

  const handleChange = (details: { value: string[] }) => {
    const newValue = details.value[0] || ''
    setSelectedValue(newValue)
    local.onChange?.(newValue)
  }

  const collection = createListCollection<SelectOption>({
    items: local.options,
  })

  return (
    <ArkSelect.Root collection={collection} value={[selectedValue()]} onValueChange={handleChange} disabled={local.disabled} {...others}>
      <ArkSelect.Control>
        <ArkSelect.Trigger
          data-slot="select-trigger"
          class={cn(
            selectVariants({
              variant: local.variant,
              size: local.size,
              className: local.class,
            })
          )}
        >
          <ArkSelect.ValueText placeholder={local.placeholder} />
          <ArkSelect.Indicator>
            <ChevronDown class="ml-2 size-4 opacity-50" />
          </ArkSelect.Indicator>
        </ArkSelect.Trigger>
      </ArkSelect.Control>
      <ArkSelect.Positioner>
        <ArkSelect.Content class="z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2">
          <ArkSelect.ItemGroup>
            <For each={local.options}>
              {(option) => (
                <ArkSelect.Item
                  class="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  item={option.value}
                >
                  <ArkSelect.ItemText>{option.label}</ArkSelect.ItemText>
                  <ArkSelect.ItemIndicator class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z"
                        fill="currentColor"
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                      ></path>
                    </svg>
                  </ArkSelect.ItemIndicator>
                </ArkSelect.Item>
              )}
            </For>
          </ArkSelect.ItemGroup>
        </ArkSelect.Content>
      </ArkSelect.Positioner>
    </ArkSelect.Root>
  )
}
