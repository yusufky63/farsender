'use client'
import { useState, useRef, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StepProps, Recipient } from '@/types'
import { validateRecipients, formatAddress, getChecksumAddress, removeDuplicateRecipients } from '@/lib/validation'
import { validateCSVFile, parseCSV } from '@/lib/csv-parser'
import { useContractInfo } from '@/hooks/useContractInfo'

export function Step2RecipientList({ config, onConfigChange, onNext, onPrev }: StepProps) {
  const [newAddress, setNewAddress] = useState('')
  const [csvError, setCsvError] = useState('')
  const [isLoadingCSV, setIsLoadingCSV] = useState(false)
  const [bulkAddresses, setBulkAddresses] = useState('')
  const [savedWallets, setSavedWallets] = useState<Recipient[]>([])
  const [activeTab, setActiveTab] = useState<'manual' | 'bulk' | 'saved'>('manual')
  const [addressError, setAddressError] = useState('')
  const [bulkParseInfo, setBulkParseInfo] = useState('')
  const [loadedWallets, setLoadedWallets] = useState<Set<string>>(new Set())
  const [saveMessage, setSaveMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Pull max recipient limits from contract (fallback to defaults if undefined)
  const { maxEthRecipients, maxErc20Recipients } = useContractInfo()
  const maxRecipients = useMemo(() => {
    const maxEth = typeof maxEthRecipients === 'number' ? maxEthRecipients : Number(maxEthRecipients ?? 300)
    const maxErc20 = typeof maxErc20Recipients === 'number' ? maxErc20Recipients : Number(maxErc20Recipients ?? 200)
    return config.tokenType === 'ETH' ? maxEth || 300 : maxErc20 || 200
  }, [config.tokenType, maxEthRecipients, maxErc20Recipients])
  const [limitInfo, setLimitInfo] = useState<string>('')
  const validationErrors = validateRecipients(config.recipients)

  // Parse bulk addresses with smart detection
  const parseBulkAddresses = (text: string): { addresses: string[], info: string } => {
    const lines = text.split('\n')
    const addresses: string[] = []
    let validCount = 0
    let invalidCount = 0
    
    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim()
      if (!trimmedLine) return
      
      // Split by common separators (comma, semicolon, space, tab)
      const parts = trimmedLine.split(/[,;\s\t]+/)
      
      parts.forEach(part => {
        const trimmedPart = part.trim()
        if (!trimmedPart) return
        
        // Check if it looks like an Ethereum address
        if (trimmedPart.startsWith('0x') && trimmedPart.length >= 42) {
          addresses.push(trimmedPart)
          validCount++
        } else if (trimmedPart.length === 40 && /^[0-9a-fA-F]+$/.test(trimmedPart)) {
          // Add 0x prefix if missing
          addresses.push('0x' + trimmedPart)
          validCount++
        } else if (trimmedPart.length === 42 && trimmedPart.startsWith('0x')) {
          // Already has 0x prefix
          addresses.push(trimmedPart)
          validCount++
        } else {
          invalidCount++
        }
      })
    })
    
    let info = ''
    if (validCount > 0 && invalidCount > 0) {
      info = `Found ${validCount} valid addresses, ${invalidCount} invalid entries ignored`
    } else if (validCount > 0) {
      info = `Found ${validCount} valid addresses`
    } else if (invalidCount > 0) {
      info = `No valid addresses found. Please check the format.`
    }
    
    return { addresses, info }
  }

  const addRecipient = () => {
    if (config.recipients.length >= maxRecipients) {
      setAddressError(`You can add at most ${maxRecipients} recipients`)
      return
    }
    if (!newAddress.trim()) return

    // Get checksum address
    const checksumAddress = getChecksumAddress(newAddress.trim())
    if (!checksumAddress) {
      setAddressError('Invalid Ethereum address')
      return
    }

    setAddressError('')
    const newRecipient: Recipient = {
      address: checksumAddress,
      amount: ''
    }

    // Add new recipient and remove duplicates
    // Enforce max limit
    const updatedRecipients = removeDuplicateRecipients([...config.recipients, newRecipient]).slice(0, maxRecipients)
    
    onConfigChange({
      ...config,
      recipients: updatedRecipients
    })
    setNewAddress('')
  }

  const addBulkRecipients = () => {
    if (!bulkAddresses.trim()) return

    // Parse addresses with various formats
    const { addresses, info } = parseBulkAddresses(bulkAddresses)
    setBulkParseInfo(info)

    // Convert to checksum addresses and filter out invalid ones
    const validRecipients: Recipient[] = []
    addresses.forEach(address => {
      const checksumAddress = getChecksumAddress(address)
      if (checksumAddress) {
        validRecipients.push({
          address: checksumAddress,
          amount: ''
        })
      }
    })

    // Add new recipients and remove duplicates
    const before = config.recipients.length
    const remaining = Math.max(0, maxRecipients - before)
    const toAdd = validRecipients.slice(0, remaining)
    const ignored = validRecipients.length - toAdd.length
    const updatedRecipients = removeDuplicateRecipients([...config.recipients, ...toAdd])

    onConfigChange({
      ...config,
      recipients: updatedRecipients
    })
    setBulkAddresses('')
    setBulkParseInfo(ignored > 0 ? `Added ${toAdd.length} addresses, ${ignored} ignored (max ${maxRecipients})` : '')
  }

  const saveCurrentRecipients = () => {
    if (config.recipients.length === 0) return
    
    const saved = [...savedWallets, ...config.recipients]
    setSavedWallets(saved)
    
    // Show success message
    setSaveMessage(`Saved ${config.recipients.length} addresses`)
    setTimeout(() => setSaveMessage(''), 3000)
  }

  const saveSingleRecipient = (recipient: Recipient) => {
    // Check if already saved
    const isAlreadySaved = savedWallets.some(w => w.address.toLowerCase() === recipient.address.toLowerCase())
    if (isAlreadySaved) return
    
    const saved = [...savedWallets, recipient]
    setSavedWallets(saved)
    
    // Show success message
    setSaveMessage(`Saved ${formatAddress(recipient.address)}`)
    setTimeout(() => setSaveMessage(''), 2000)
  }

  const loadSavedWallets = (wallets: Recipient[]) => {
    // Convert saved wallets to checksum addresses and remove duplicates
    const before = config.recipients.length
    const remaining = Math.max(0, maxRecipients - before)
    const toAdd = wallets.slice(0, remaining)
    const ignored = wallets.length - toAdd.length
    const updatedRecipients = removeDuplicateRecipients([...config.recipients, ...toAdd]).slice(0, maxRecipients)
    onConfigChange({
      ...config,
      recipients: updatedRecipients
    })
    
    // Mark these wallets as loaded
    const walletAddresses = wallets.map(w => w.address.toLowerCase())
    setLoadedWallets(prev => {
      const newSet = new Set(prev)
      toAdd.map(w => w.address.toLowerCase()).forEach(addr => newSet.add(addr))
      return newSet
    })
    if (ignored > 0) setLimitInfo(`Added ${toAdd.length}, ${ignored} ignored (max ${maxRecipients})`)
  }

  const removeRecipient = (index: number) => {
    const updated = config.recipients.filter((_, i) => i !== index)
    onConfigChange({
      ...config,
      recipients: updated
    })
  }

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoadingCSV(true)
    setCsvError('')

    try {
      const csvText = await validateCSVFile(file)
      const rows = parseCSV(csvText)
      
      // Convert to checksum addresses and filter out invalid ones
      const validRecipients: Recipient[] = []
      rows.forEach(row => {
        const checksumAddress = getChecksumAddress(row.address)
        if (checksumAddress) {
          validRecipients.push({
            address: checksumAddress,
            amount: row.amount || ''
          })
        }
      })

      // Add new recipients and remove duplicates
      const before = config.recipients.length
      const remaining = Math.max(0, maxRecipients - before)
      const toAdd = validRecipients.slice(0, remaining)
      const ignored = validRecipients.length - toAdd.length
      const updatedRecipients = removeDuplicateRecipients([...config.recipients, ...toAdd]).slice(0, maxRecipients)

      onConfigChange({
        ...config,
        recipients: updatedRecipients
      })
      if (ignored > 0) setCsvError(`Added ${toAdd.length}, ${ignored} ignored (max ${maxRecipients})`)
    } catch (error) {
      setCsvError(error instanceof Error ? error.message : 'CSV yüklenirken hata oluştu')
    } finally {
      setIsLoadingCSV(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleNext = () => {
    if (config.recipients.length === 0) return
    if (config.recipients.length > maxRecipients) {
      setLimitInfo(`Recipient limit exceeded. Max ${maxRecipients}`)
      return
    }
    if (validationErrors.length === 0) {
      onNext()
    }
  }

  const canProceed = config.recipients.length > 0 && validationErrors.length === 0 && config.recipients.length <= maxRecipients

  return (
    <Card>
      <div className="space-y-2">

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-transparent border border-gray-200 dark:border-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 px-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'manual'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Manual Add
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`flex-1 py-2 px-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'bulk'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Bulk Add
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-2 px-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'saved'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Saved
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-2">
          {activeTab === 'manual' && (
            <div className="">
              <h4 className="text-sm font-medium text-black dark:text-white mb-2">Manual Add</h4>
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="0x..."
                  value={newAddress}
                  onChange={(value) => {
                    setNewAddress(value)
                    setAddressError('') // Clear error when typing
                  }}
                  className="w-full text-xs"
                />
              </div>
              <Button
                onClick={addRecipient}
                disabled={!newAddress.trim()}
                variant="outline"
                size="sm"
                className="px-3 py-1"
              >
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </Button>
            </div>
            {addressError && (
              <p className="text-xs text-red-600 dark:text-red-400">{addressError}</p>
            )}
          </div>
            </div>
          )}

          {activeTab === 'bulk' && (
            <div className="">
              <h4 className="text-sm font-medium text-black dark:text-white mb-2">Bulk Add</h4>
          <div className="space-y-2">
            <textarea
              placeholder="Enter addresses:&#10;0x1234...5678&#10;0x5678...9abc&#10;&#10;Or: 0x1234...5678, 0x5678...9abc"
              value={bulkAddresses}
              onChange={(e) => {
                setBulkAddresses(e.target.value)
                const { info } = parseBulkAddresses(e.target.value)
                setBulkParseInfo(info)
              }}
              className="w-full p-2 border border-gray-300 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5638a1]/20 bg-white dark:bg-transparent text-xs text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
              rows={4}
            />
            {bulkParseInfo && (
              <p className={`text-xs ${bulkParseInfo.includes('No valid') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {bulkParseInfo}
              </p>
            )}
            <div className="flex space-x-2">
              <Button
                onClick={addBulkRecipients}
                disabled={!bulkAddresses.trim()}
                variant="outline"
                size="sm"
                className="flex-1 py-1"
              >
                Add All ({parseBulkAddresses(bulkAddresses).addresses.length} addresses)
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoadingCSV}
                size="sm"
                className="px-3 py-1"
              >
                {isLoadingCSV ? (
                  <div className="w-4 h-4 border-2 border-[#5638a1] border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
            />
            {csvError && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {csvError.includes('User rejected') || csvError.includes('User denied') 
                  ? 'Transaction was cancelled by user' 
                  : csvError}
              </p>
            )}
          </div>
            </div>
          )}

          {activeTab === 'saved' && (
            <div className="">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-black dark:text-white">Saved Wallets ({savedWallets.length})</h4>
            <div className="flex space-x-2">
              {config.recipients.length > 0 && (
                <div className="flex flex-col items-end space-y-1">
                  <Button
                    onClick={saveCurrentRecipients}
                    variant="outline"
                    size="sm"
                    className="px-3"
                  >
                    Save Current
                  </Button>
                  {saveMessage && (
                    <p className="text-xs text-green-600 dark:text-green-400">{saveMessage}</p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {savedWallets.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {savedWallets.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
                  No saved wallets yet
                </p>
              ) : (
                <div className="space-y-1">
                  {savedWallets.map((wallet, index) => {
                    const isLoaded = loadedWallets.has(wallet.address.toLowerCase())
                    const isInRecipients = config.recipients.some(r => r.address.toLowerCase() === wallet.address.toLowerCase())
                    const showLoaded = isLoaded || isInRecipients
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-black/20 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono text-gray-700 dark:text-gray-300">
                            {formatAddress(wallet.address)}
                          </span>
                          {showLoaded && (
                            <div className="flex items-center space-x-1">
                              <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span className="text-xs text-green-600 dark:text-green-400 font-medium">Loaded</span>
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={() => loadSavedWallets([wallet])}
                          variant="outline"
                          size="sm"
                          className="px-2 py-1 text-xs"
                          disabled={showLoaded}
                        >
                          {showLoaded ? 'Loaded' : 'Load'}
                        </Button>
                      </div>
                    )
                  })}
                  <Button
                    onClick={() => loadSavedWallets(savedWallets)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={savedWallets.every(wallet => 
                      loadedWallets.has(wallet.address.toLowerCase()) || 
                      config.recipients.some(r => r.address.toLowerCase() === wallet.address.toLowerCase())
                    )}
                  >
                    {savedWallets.every(wallet => 
                      loadedWallets.has(wallet.address.toLowerCase()) || 
                      config.recipients.some(r => r.address.toLowerCase() === wallet.address.toLowerCase())
                    ) ? 'All Loaded' : 'Load All Saved'}
                  </Button>
                </div>
              )}
            </div>
          )}
            </div>
          )}
        </div>

        {/* Recipients List */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-black dark:text-white">
              Recipients ({config.recipients.length}/{maxRecipients})
            </h4>
            <div className="flex items-center space-x-2">
              {saveMessage && (
                <p className="text-xs text-green-600 dark:text-green-400">{saveMessage}</p>
              )}
              {config.recipients.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onConfigChange({ ...config, recipients: [] })}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {config.recipients.length === 0 ? (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              <p className="text-xs">No recipients added yet</p>
              <p className="text-xs">Upload CSV or add manually</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {config.recipients.map((recipient, index) => {
                const isAlreadySaved = savedWallets.some(w => w.address.toLowerCase() === recipient.address.toLowerCase())
                return (
                  <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900/50">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs sm:text-sm text-black dark:text-white truncate font-medium">
                        {formatAddress(recipient.address)}
                      </div>
                      {recipient.amount && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {recipient.amount} {config.tokenSymbol || 'Token'}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => saveSingleRecipient(recipient)}
                        disabled={isAlreadySaved}
                        className={`px-2 py-1.5 text-xs font-medium ${
                          isAlreadySaved 
                            ? 'text-green-600 dark:text-green-400 border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20' 
                            : 'text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        }`}
                      >
                        {isAlreadySaved ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeRecipient(index)}
                        className="text-red-600 dark:text-red-400 border-red-200 dark:border-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-600 px-2.5 py-1.5"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Limit & Validation Errors */}
        {config.recipients.length > maxRecipients && (
          <div className="p-2 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">Too many recipients. Max allowed is {maxRecipients}.</p>
          </div>
        )}
        {limitInfo && (
          <div className="p-2 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
            <p className="text-xs text-blue-800 dark:text-blue-200">{limitInfo}</p>
          </div>
        )}
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="p-2 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <h5 className="text-xs font-medium text-red-800 dark:text-red-200 mb-1">Errors:</h5>
            <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>• {error.message}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={onPrev}
            size="sm"
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed}
            className="px-6"
            size="sm"
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  )
}
