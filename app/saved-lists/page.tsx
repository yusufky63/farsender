'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Recipient } from '@/types'
import { formatAddress } from '@/lib/validation'
import { ThemeToggle } from "@/components/ThemeToggle"
import { WalletConnection } from "@/components/WalletConnection"
import Image from "next/image"
import Link from "next/link"

interface SavedList {
  id: string
  name: string
  recipients: Recipient[]
  tokenType: string
  createdAt: string
  totalRecipients: number
}

export default function SavedListsPage() {
  const [savedLists, setSavedLists] = useState<SavedList[]>([])
  const [savedWallets, setSavedWallets] = useState<Recipient[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showWalletDeleteConfirm, setShowWalletDeleteConfirm] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'lists' | 'wallets'>('lists')

  // Load saved data from localStorage
  useEffect(() => {
    const lists = JSON.parse(localStorage.getItem('savedRecipientLists') || '[]')
    const wallets = JSON.parse(localStorage.getItem('multisender-saved-wallets') || '[]')
    setSavedLists(lists)
    setSavedWallets(wallets)
  }, [])

  // Delete a saved list
  const deleteList = (listId: string) => {
    const updatedLists = savedLists.filter(list => list.id !== listId)
    setSavedLists(updatedLists)
    localStorage.setItem('savedRecipientLists', JSON.stringify(updatedLists))
    setShowDeleteConfirm(null)
  }

  // Delete a saved wallet
  const deleteWallet = (walletAddress: string) => {
    const updatedWallets = savedWallets.filter(wallet => wallet.address !== walletAddress)
    setSavedWallets(updatedWallets)
    localStorage.setItem('multisender-saved-wallets', JSON.stringify(updatedWallets))
    setShowWalletDeleteConfirm(null)
  }

  // Clear all saved lists
  const clearAllLists = () => {
    setSavedLists([])
    localStorage.removeItem('savedRecipientLists')
  }

  // Clear all saved wallets
  const clearAllWallets = () => {
    setSavedWallets([])
    localStorage.removeItem('multisender-saved-wallets')
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Export lists as JSON
  const exportLists = () => {
    const dataStr = JSON.stringify({ savedLists, savedWallets }, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `farsender-saved-data-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8] dark:bg-black flex flex-col w-full">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur bg-white/70 dark:bg-black/30 border-b border-gray-200/70 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-1 py-2.5">
          <div className="flex items-center justify-between">
            {/* Brand */}
            <Link href="/" className="flex items-center">
              <Image src="/logo.png" alt="FarSender" width={32} height={32} />
              <h1 className="text-base font-bold italic text-[#5638a1]">
                FarSender
              </h1>
            </Link>

            {/* Controls */}
            <div className="flex items-center gap-1">
              <WalletConnection />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-1 space-y-2 flex-1 w-full">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Saved Recipients
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage your saved recipient lists and individual wallets
          </p>
        </div>

        <Card>
          <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-transparent border border-gray-200 dark:border-gray-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('lists')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'lists'
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Saved Lists ({savedLists.length})
              </button>
              <button
                onClick={() => setActiveTab('wallets')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'wallets'
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Saved Wallets ({savedWallets.length})
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <Link href="/">
                <Button variant="outline" size="sm">
                  ← Back to Sender
                </Button>
              </Link>
              
              <div className="flex gap-2">
                <Button
                  onClick={exportLists}
                  variant="outline"
                  size="sm"
                  disabled={savedLists.length === 0 && savedWallets.length === 0}
                >
                  Export Data
                </Button>
                {activeTab === 'lists' && savedLists.length > 0 && (
                  <Button
                    onClick={clearAllLists}
                    variant="outline"
                    size="sm"
                    className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-600"
                  >
                    Clear All Lists
                  </Button>
                )}
                {activeTab === 'wallets' && savedWallets.length > 0 && (
                  <Button
                    onClick={clearAllWallets}
                    variant="outline"
                    size="sm"
                    className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-600"
                  >
                    Clear All Wallets
                  </Button>
                )}
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'lists' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recipient Lists
                </h2>
                
                {savedLists.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="space-y-2">
                      <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm">No saved recipient lists yet</p>
                      <p className="text-xs">Save a list from the batch transaction screen</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {savedLists.map((list) => (
                      <div key={list.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-base font-medium text-gray-900 dark:text-white">
                                {list.name}
                              </h3>
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                                {list.tokenType}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {list.totalRecipients} recipients • Created {formatDate(list.createdAt)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link href="/">
                              <Button size="sm" variant="outline">
                                Go to Sender
                              </Button>
                            </Link>
                            <button
                              onClick={() => setShowDeleteConfirm(list.id)}
                              className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                              title="Delete list"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Recipients Preview */}
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Recipients:</div>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {list.recipients.slice(0, 5).map((recipient, index) => (
                              <div key={index} className="flex items-center justify-between text-xs">
                                <span className="font-mono text-gray-700 dark:text-gray-300">
                                  {formatAddress(recipient.address)}
                                </span>
                                {recipient.displayName && (
                                  <span className="text-gray-500 dark:text-gray-400">
                                    {recipient.displayName}
                                  </span>
                                )}
                              </div>
                            ))}
                            {list.recipients.length > 5 && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                                ... and {list.recipients.length - 5} more
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Delete Confirmation */}
                        {showDeleteConfirm === list.id && (
                          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                            <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                              Are you sure you want to delete &quot;{list.name}&quot;?
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => deleteList(list.id)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'wallets' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Individual Wallets
                </h2>
                
                {savedWallets.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="space-y-2">
                      <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-sm">No saved wallets yet</p>
                      <p className="text-xs">Save individual wallets from the recipient list</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {savedWallets.map((wallet, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                            {formatAddress(wallet.address)}
                          </span>
                          {wallet.displayName && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {wallet.displayName}
                            </span>
                          )}
                          {wallet.farcasterProfile && (
                            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded">
                              Farcaster
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://basescan.org/address/${wallet.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            title="View on BaseScan"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M13.5 3a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM15 3a3 3 0 1 0-6 0 3 3 0 0 0 6 0z" />
                            </svg>
                          </a>
                          <button
                            onClick={() => setShowWalletDeleteConfirm(wallet.address)}
                            className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                            title="Delete wallet"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>

                        {/* Delete Confirmation */}
                        {showWalletDeleteConfirm === wallet.address && (
                          <div className="absolute inset-0 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded flex items-center justify-center">
                            <div className="text-center space-y-2">
                              <p className="text-sm text-red-800 dark:text-red-200">
                                Delete this wallet?
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => deleteWallet(wallet.address)}
                                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                                >
                                  Delete
                                </button>
                                <button
                                  onClick={() => setShowWalletDeleteConfirm(null)}
                                  className="px-2 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 text-xs rounded"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="w-full p-1 space-y-2 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 relative z-0 flex-shrink-0">
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Manage your saved recipient lists and wallets
          </p>
        </div>
      </footer>
    </div>
  )
}
