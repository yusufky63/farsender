"use client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StepIndicator } from "@/components/StepIndicator";
import { Step1TokenSelect } from "@/components/steps/Step1TokenSelect";
import { Step2RecipientList } from "@/components/steps/Step2RecipientList";
import { Step3AmountConfig } from "@/components/steps/Step3AmountConfig";
import { Step4Review } from "@/components/steps/Step4Review";
import { Step5Transaction } from "@/components/steps/Step5Transaction";
import { WalletConnection } from "@/components/WalletConnection";
import { ContractStats } from "@/components/ContractStats";
import { useMultisender } from "@/hooks/useMultisender";
import Image from "next/image";
import { useState } from "react";

export default function HomePage() {
  const { currentStep, config, nextStep, prevStep, updateConfig } =
    useMultisender();

  const [isMoreAppsOpen, setIsMoreAppsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  // Apps data
  const apps = [
    {
      id: 1,
      name: "fRevoke",
      icon: "/assets/frevoke-icon.png",
      url: "https://farcaster.xyz/miniapps/aXupmg6n1SY4/frevoke",
    },
    {
      id: 2,
      name: "Base Counter",
      icon: "/assets/base-counter-icon.png",
      url: "https://farcaster.xyz/miniapps/7upwS7ktoVAn/base-counter",
    },
    {
      id: 3,
      name: "8BitCoiner",
      icon: "/assets/8bitcoiner-icon.png",
      url: "https://farcaster.xyz/miniapps/VJFTWn45l8cA/8bitcoiner",
    },
  ];

  const renderCurrentStep = () => {
    const stepProps = {
      config,
      onConfigChange: updateConfig,
      onNext: nextStep,
      onPrev: prevStep,
    };

    switch (currentStep) {
      case 1:
        return <Step1TokenSelect {...stepProps} />;
      case 2:
        return <Step2RecipientList {...stepProps} />;
      case 3:
        return <Step3AmountConfig {...stepProps} />;
      case 4:
        return <Step4Review {...stepProps} />;
      case 5:
        return <Step5Transaction {...stepProps} />;
      default:
        return <Step1TokenSelect {...stepProps} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8] dark:bg-black flex flex-col w-full">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur bg-white/70 dark:bg-black/30 border-b border-gray-200/70 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-1 py-2.5">
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
      <main className="max-w-4xl mx-auto p-1 space-y-2 flex-1 w-full">
        
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
      <footer className="w-full p-1 space-y-2 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 relative z-0 flex-shrink-0">
        {/* Navigation Buttons */}
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm">
          <button
            onClick={() => setIsHowItWorksOpen(true)}
            className="px-2 py-1 text-gray-600 dark:text-gray-400 hover:text-[#5638a1] dark:hover:text-[#5638a1] hover:bg-transparent rounded-lg transition-all duration-200 font-medium"
          >
            How it Works
          </button>
          <button
            onClick={() => setIsStatsOpen(true)}
            className="px-2 py-1 text-gray-600 dark:text-gray-400 hover:text-[#5638a1] dark:hover:text-[#5638a1] hover:bg-transparent rounded-lg transition-all duration-200 font-medium"
          >
            Platform Stats
          </button>
          <button
            onClick={() => setIsMoreAppsOpen(true)}
            className="px-2 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-transparent rounded-lg transition-all duration-200 font-medium"
          >
            More Apps
          </button>
        </div>
      </footer>

      {/* More Apps Modal */}
      {isMoreAppsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-3">
          <div className="bg-white dark:bg-transparent rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  More Apps
                </h2>
                <button
                  onClick={() => setIsMoreAppsOpen(false)}
                  className="p-2 hover:bg-transparent rounded-lg transition-colors"
                >
                  <svg
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-2">
                {apps.map((app) => (
                  <div
                    key={app.id}
                    className="border border-gray-200 dark:border-gray-800 rounded-lg p-2 hover:border-[#5638a1] dark:hover:border-[#5638a1] transition-colors bg-white dark:bg-transparent"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden">
                        <Image
                          src={app.icon}
                          alt={app.name}
                          width={36}
                          height={36}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {app.name}
                        </h3>
                      </div>
                      <a
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-2 py-1 bg-[#5638a1] text-white text-sm rounded-lg hover:bg-[#5638a1]/90 transition-colors"
                      >
                        <svg
                          width="12"
                          height="12"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                        Open
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Platform Stats Modal */}
      {isStatsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-3">
          <div className="bg-white dark:bg-transparent rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  Platform Statistics
                </h2>
                <button
                  onClick={() => setIsStatsOpen(false)}
                  className="p-2 hover:bg-transparent rounded-lg transition-colors"
                >
                  <svg
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="mt-4">
                <ContractStats />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* How it Works Modal */}
      {isHowItWorksOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-3">
          <div className="bg-white dark:bg-transparent rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  How it Works
                </h2>
                <button
                  onClick={() => setIsHowItWorksOpen(false)}
                  className="p-2 hover:bg-transparent rounded-lg transition-colors"
                >
                  <svg
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                {/* Process Steps */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Process:</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-gray-600 dark:bg-gray-400 text-white dark:text-gray-900 text-sm rounded-full flex items-center justify-center font-semibold">1</span>
                      <p className="text-gray-700 dark:text-gray-300">Select your token (ETH or ERC20) from your wallet</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-gray-600 dark:bg-gray-400 text-white dark:text-gray-900 text-sm rounded-full flex items-center justify-center font-semibold">2</span>
                      <p className="text-gray-700 dark:text-gray-300">Add recipient addresses (wallet addresses, Farcaster usernames, or Base.eth domains)</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-gray-600 dark:bg-gray-400 text-white dark:text-gray-900 text-sm rounded-full flex items-center justify-center font-semibold">3</span>
                      <p className="text-gray-700 dark:text-gray-300">Configure amounts (equal distribution or custom amounts)</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-gray-600 dark:bg-gray-400 text-white dark:text-gray-900 text-sm rounded-full flex items-center justify-center font-semibold">4</span>
                      <p className="text-gray-700 dark:text-gray-300">Review and confirm the transaction</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-gray-600 dark:bg-gray-400 text-white dark:text-gray-900 text-sm rounded-full flex items-center justify-center font-semibold">5</span>
                      <p className="text-gray-700 dark:text-gray-300">Send tokens to multiple recipients in one transaction</p>
                    </div>
                  </div>
                </div>

                {/* Data Collection */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Data We Collect:</h3>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Wallet addresses (for transaction processing)</li>
                    <li>Token amounts (for distribution calculation)</li>
                    <li>Transaction hash (for verification)</li>
                    <li>No personal information is stored</li>
                    <li>All data is processed on-chain</li>
                  </ul>
                </div>

                {/* APIs & Integrations */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">APIs & Integrations:</h3>
                  <div className="space-y-3">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">D</span>
                        </div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-100">Dune API</h4>
                      </div>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Fetches your token balances and metadata from blockchain data.
                      </p>
                    </div>
                    
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">N</span>
                        </div>
                        <h4 className="font-medium text-purple-900 dark:text-purple-100">Neynar API</h4>
                      </div>
                      <p className="text-sm text-purple-800 dark:text-purple-200">
                        Resolves Farcaster usernames (@username) to wallet addresses.
                      </p>
                    </div>
                    
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">B</span>
                        </div>
                        <h4 className="font-medium text-green-900 dark:text-green-100">Base.eth Resolution</h4>
                      </div>
                      <p className="text-sm text-green-800 dark:text-green-200">
                        Resolves .base.eth domains to Ethereum addresses.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fees */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Fees:</h3>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span>Platform Fee:</span>
                        <span className="font-medium text-[#5638a1]">0.1 USD per recipient</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Network Fee:</span>
                        <span className="text-gray-600 dark:text-gray-400">Variable (Base network)</span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        * Fee is calculated based on the number of recipients, not the amount sent
                      </div>
                    </div>
                  </div>
                </div>

                {/* Limits */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Limits:</h3>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>ETH: Up to 300 recipients per transaction</li>
                    <li>ERC20: Up to 200 recipients per transaction</li>
                    <li>Minimum amount: 0.000001 tokens</li>
                  </ul>
                </div>

                {/* Security */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Security:</h3>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Smart contract is verified</li>
                    <li>No private keys are stored</li>
                    <li>All transactions are transparent on-chain</li>
                    <li>You maintain full control of your wallet</li>
                  </ul>
                </div>

                {/* Support */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Support:</h3>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                    
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          For support and questions, contact us on Farcaster:
                        </p>
                        <a 
                          href="https://farcaster.xyz/codexsha" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[#5638a1] hover:text-[#5638a1]/80 font-medium text-sm"
                        >
                          @codexsha
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
