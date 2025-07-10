import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import * as React from 'react'

interface StatusCardProps {
  /**
   * The title can be a string or a React node that includes an icon
   * If it's a string, it will be left-aligned
   * If it's a React node, you can include the icon inline
   */
  title: React.ReactNode
  /**
   * Optional description that appears below the title
   */
  description?: React.ReactNode
  /**
   * Additional CSS classes
   */
  className?: string
}

const StatusCard = React.forwardRef<HTMLDivElement, StatusCardProps>(
  ({ title, description, className, ...props }, ref) => {
    return (
      <Card ref={ref} className={cn('border border-border shadow-sm rounded-md py-0 gap-0', className)} {...props}>
        <CardContent className="px-4 py-3">
          <div className="flex items-center gap-2">
            {typeof title === 'string' ? (
              <span className="text-base font-semibold text-foreground">{title}</span>
            ) : (
              <div className="flex items-center gap-2 text-base font-semibold text-foreground">{title}</div>
            )}
          </div>
          {description && <div className="text-sm text-muted-foreground mt-2">{description}</div>}
        </CardContent>
      </Card>
    )
  },
)

StatusCard.displayName = 'StatusCard'

export { StatusCard }
