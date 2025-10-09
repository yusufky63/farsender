import React from 'react'

interface InputProps {
  label?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'number' | 'email' | 'file'
  error?: string
  disabled?: boolean
  className?: string
  step?: string
  min?: string | number
  max?: string | number
  variant?: 'default' | 'filled'
}

export function Input({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  type = 'text',
  error,
  disabled = false,
  className = '',
  step,
  min,
  max,
  variant = 'default'
}: InputProps) {
  const variantClasses = {
    default: "bg-white dark:bg-transparent border border-gray-300 dark:border-gray-800 focus:border-[#5638a1] dark:focus:border-[#5638a1] focus:ring-2 focus:ring-[#5638a1]/30",
    filled: "bg-gray-50 dark:bg-transparent border border-gray-200 dark:border-gray-800 focus:border-[#5638a1] dark:focus:border-[#5638a1] focus:ring-2 focus:ring-[#5638a1]/30"
  }

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        step={step}
        min={min}
        max={max}
        className={`w-full px-3 py-2 text-sm rounded-lg focus:outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-400 dark:disabled:text-gray-500 ${variantClasses[variant]} ${error ? 'border-red-500 dark:border-red-400' : ''} ${className}`}
      />
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
