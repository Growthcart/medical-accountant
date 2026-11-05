import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface AdminSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  withShadow?: boolean
}

export const AdminSelect = forwardRef<HTMLSelectElement, AdminSelectProps>(
  function AdminSelect({ className, withShadow, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'w-full border border-gray-300 rounded-md text-gray-900 px-3 py-2 text-sm bg-white',
          'focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600',
          withShadow && 'shadow-sm',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    )
  },
)
