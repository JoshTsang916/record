import * as React from 'react'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost'
}

export function Button({ className = '', variant = 'default', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none h-10 px-4 py-2'
  const variants: Record<string,string> = {
    // Keep strong contrast in dark mode (dark surface + white text)
    default: 'bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700',
    outline: 'border border-gray-300 hover:bg-gray-50 text-gray-900 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-800',
    ghost: 'text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800'
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}
