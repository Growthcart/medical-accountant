import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface AdminTextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  withShadow?: boolean
}

export const AdminTextArea = forwardRef<HTMLTextAreaElement, AdminTextAreaProps>(
  function AdminTextArea({ className, withShadow, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full border border-gray-300 rounded-md text-gray-900 px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600',
          withShadow && 'shadow-sm',
          className,
        )}
        {...rest}
      />
    )
  },
)
