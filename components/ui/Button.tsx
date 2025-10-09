import React from 'react'

interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  onClick,
  type = 'button',
  className = ''
}: ButtonProps) {
  const baseClasses = "font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#5638a1]/30 backdrop-blur-sm"
  
  const variantClasses = {
    primary: "bg-[#5638a1] hover:bg-[#5638a1]/90 text-white disabled:bg-gray-400 disabled:cursor-not-allowed border border-transparent",
    secondary: "bg-gray-100 dark:bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-black/20 disabled:bg-gray-50 dark:disabled:bg-black/10 border border-gray-200 dark:border-gray-800",
    outline: "border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-black/20 disabled:border-gray-300 dark:disabled:border-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500",
    success: "bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed border border-transparent",
    warning: "bg-orange-600 hover:bg-orange-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed border border-transparent",
    danger: "bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed border border-transparent"
  }
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-1.5 text-base",
    lg: "px-6 py-1.5 text-lg"
  }

  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
