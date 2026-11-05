import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface AdminInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Adds a subtle shadow — matches the style used on the posts editor. */
  withShadow?: boolean
  /** Compact padding for inline grids. */
  size?: 'default' | 'sm'
}

export const AdminInput = forwardRef<HTMLInputElement, AdminInputProps>(
  function AdminInput({ className, withShadow, size = 'default', ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full border border-gray-300 rounded-md text-gray-900',
          'focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600',
          size === 'sm' ? 'px-2 py-1 text-sm' : 'px-3 py-2 text-sm',
          withShadow && 'shadow-sm',
          className,
        )}
        {...rest}
      />
    )
  },
)
