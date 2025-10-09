import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  title?: string
}

export function Card({ children, className = '', title }: CardProps) {
  return (
    <div className={`card ${className}`}>
      {title && (
        <h3 className="font-semibold text-black dark:text-white mb-2 text-sm">{title}</h3>
      )}
      {children}
    </div>
  )
}
