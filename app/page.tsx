'use client'
import { WalletStatusCard } from '@/components/WalletStatusCard'
import { ThemeToggle } from '@/components/ThemeToggle'
import { StepIndicator } from '@/components/StepIndicator'
import { Step1TokenSelect } from '@/components/steps/Step1TokenSelect'
import { Step2RecipientList } from '@/components/steps/Step2RecipientList'
import { Step3AmountConfig } from '@/components/steps/Step3AmountConfig'
import { Step4Review } from '@/components/steps/Step4Review'
import { Step5Transaction } from '@/components/steps/Step5Transaction'
import { WalletConnection } from '@/components/WalletConnection'
import { ChainSelector } from '@/components/ChainSelector'
import { useAccount } from 'wagmi'
import { useMultisender } from '@/hooks/useMultisender'
import Image from 'next/image'

export default function HomePage() {
  const { isConnected, address } = useAccount()
  const {
    currentStep,
    config,
    nextStep,
    prevStep,
    updateConfig
  } = useMultisender()

  const renderCurrentStep = () => {
    
    const stepProps = {
      config,
      onConfigChange: updateConfig,
      onNext: nextStep,
      onPrev: prevStep
    }

    switch (currentStep) {
      case 1:
        return <Step1TokenSelect {...stepProps} />
      case 2:
        return <Step2RecipientList {...stepProps} />
      case 3:
        return <Step3AmountConfig {...stepProps} />
      case 4:
        return <Step4Review {...stepProps} />
      case 5:
        return <Step5Transaction {...stepProps} />
      default:
        return <Step1TokenSelect {...stepProps} />
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8] dark:bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur bg-white/70 dark:bg-black/30 border-b border-gray-200/70 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-3 py-2.5">
          <div className="flex items-center justify-between">
            {/* Brand */}
            <div className="flex items-center ">
              <Image src="/logo.png" alt="FarSender" width={32} height={32} />
              <h1 className="text-base font-bold italic text-[#5638a1]">
                FarSender
              </h1>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1">
              {/* {isConnected && address && <ChainSelector />} */}
              <WalletConnection />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-3 space-y-2">
        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} />
        
        {/* Step Title */}
        <div className="text-center">
          {currentStep === 1 && (
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Token Select
            </h2>
          )}
          {currentStep === 2 && (
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Recipient List
            </h2>
          )}
          {currentStep === 3 && (
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Amount Configuration
            </h2>
          )}
          {currentStep === 4 && (
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Review & Send
            </h2>
          )}
          {currentStep === 5 && (
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Transaction
            </h2>
          )}
        </div>
        
        {/* Current Step Component */}
        {renderCurrentStep()}
      </main>

      {/* Footer */}
    
    </div>
  )
}
