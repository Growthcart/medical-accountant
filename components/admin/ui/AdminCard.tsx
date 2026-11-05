import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface AdminCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds the hover-shadow lift used on list cards. */
  hover?: boolean
}

export const AdminCard = forwardRef<HTMLDivElement, AdminCardProps>(
  function AdminCard({ className, hover, children, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-white rounded-lg shadow-sm p-4 sm:p-6',
          hover && 'hover:shadow-md transition-shadow group',
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    )
  },
)
