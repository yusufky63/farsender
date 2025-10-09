'use client'
import { useState } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { SUPPORTED_CHAINS } from '@/lib/chains'

export function ChainSelector() {
  const { chain } = useAccount()
  const { switchChain } = useSwitchChain()
  const [isOpen, setIsOpen] = useState(false)
  const single = SUPPORTED_CHAINS.length === 1

  const currentChain = SUPPORTED_CHAINS.find(c => c.id === chain?.id) || SUPPORTED_CHAINS[0]

  const handleChainSelect = (chainId: number) => {
    switchChain({ chainId })
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => { if (!single) setIsOpen(!isOpen) }}
        className={`flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs bg-white/70 dark:bg-gray-900/50 ${single ? '' : 'hover:bg-gray-50 dark:hover:bg-gray-900'} transition-colors shadow-sm ${single ? 'cursor-default' : ''}`}
        aria-disabled={single}
      >
       
        <span className="text-xs font-medium text-black dark:text-white">
          {currentChain?.name || 'Select Chain'}
        </span>
        {!single && (
          <svg 
            className={`w-3 h-3 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {isOpen && !single && (
        <div className="absolute top-full right-0 mt-1 min-w-[10rem] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden">
          {SUPPORTED_CHAINS.map((chainInfo) => (
            <button
              key={chainInfo.id}
              onClick={() => handleChainSelect(chainInfo.id)}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 ${
                chain?.id === chainInfo.id ? 'bg-[#5638a1] dark:bg-[#5638a1] text-[#5638a1] dark:text-[#5638a1]' : 'text-gray-900 dark:text-white'
              }`}
            >
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#5638a1] text-white text-[10px] font-semibold">
                {chainInfo.name[0]}
              </span>
              {chainInfo.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
