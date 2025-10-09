'use client'
import { cn } from '@/lib/utils'

interface StepIndicatorProps {
  currentStep: number
  totalSteps?: number
}

export function StepIndicator({ currentStep, totalSteps = 5 }: StepIndicatorProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1)

  return (
    <div className="flex items-center justify-center space-x-1 py-2">
      {steps.map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
              step === currentStep
                ? "bg-black dark:bg-white text-white dark:text-black"
                : step < currentStep
                ? "bg-gray-600 dark:bg-gray-400 text-white dark:text-black"
                : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
            )}
          >
            {step}
          </div>
          {step < totalSteps && (
            <div
              className={cn(
                "w-4 h-0.5 mx-0.5 transition-colors",
                step < currentStep ? "bg-gray-600 dark:bg-gray-400" : "bg-gray-200 dark:bg-gray-700"
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}
