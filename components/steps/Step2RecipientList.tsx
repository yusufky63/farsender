'use client'
import { useState, useRef } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StepProps, Recipient } from '@/types'
import { validateRecipients, formatAddress, getChecksumAddress, removeDuplicateRecipients } from '@/lib/validation'
import { validateCSVFile, parseCSV } from '@/lib/csv-parser'

export function Step2RecipientList({ config, onConfigChange, onNext, onPrev }: StepProps) {
  const [newAddress, setNewAddress] = useState('')
  const [csvError, setCsvError] = useState('')
  const [isLoadingCSV, setIsLoadingCSV] = useState(false)
  const [bulkAddresses, setBulkAddresses] = useState('')
  const [savedWallets, setSavedWallets] = useState<Recipient[]>([])
  const [showSavedWallets, setShowSavedWallets] = useState(false)
  const [addressError, setAddressError] = useState('')
  const [bulkParseInfo, setBulkParseInfo] = useState('')
  const [loadedWallets, setLoadedWallets] = useState<Set<string>>(new Set())
  const [saveMessage, setSaveMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const maxRecipients = config.tokenType === 'ETH' ? 300 : 200
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
    const updatedRecipients = removeDuplicateRecipients([...config.recipients, newRecipient])
    
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
    const updatedRecipients = removeDuplicateRecipients([...config.recipients, ...validRecipients])

    onConfigChange({
      ...config,
      recipients: updatedRecipients
    })
    setBulkAddresses('')
    setBulkParseInfo('')
  }

  const saveCurrentRecipients = () => {
    if (config.recipients.length === 0) return
    
    const saved = [...savedWallets, ...config.recipients]
    setSavedWallets(saved)
    
    // Show success message
    setSaveMessage(`Saved ${config.recipients.length} addresses`)
    setTimeout(() => setSaveMessage(''), 3000)
  }

  const loadSavedWallets = (wallets: Recipient[]) => {
    // Convert saved wallets to checksum addresses and remove duplicates
    const updatedRecipients = removeDuplicateRecipients([...config.recipients, ...wallets])
    onConfigChange({
      ...config,
      recipients: updatedRecipients
    })
    
    // Mark these wallets as loaded
    const walletAddresses = wallets.map(w => w.address.toLowerCase())
    setLoadedWallets(prev => {
      const newSet = new Set(prev)
      walletAddresses.forEach(addr => newSet.add(addr))
      return newSet
    })
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
      const updatedRecipients = removeDuplicateRecipients([...config.recipients, ...validRecipients])

      onConfigChange({
        ...config,
        recipients: updatedRecipients
      })
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
    if (config.recipients.length > 0 && validationErrors.length === 0) {
      onNext()
    }
  }

  const canProceed = config.recipients.length > 0 && validationErrors.length === 0

  return (
    <Card>
      <div className="space-y-2">
        {/* CSV Upload */}
        <div>
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoadingCSV}
              className="w-full"
              size="sm"
            >
              {isLoadingCSV ? 'Loading...' : 'Select CSV File'}
            </Button>
            {csvError && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {csvError.includes('User rejected') || csvError.includes('User denied') 
                  ? 'Transaction was cancelled by user' 
                  : csvError}
              </p>
            )}
          </div>
        </div>

        {/* Manual Add */}
        <div className="">
          <h4 className="text-sm font-medium text-black dark:text-white mb-2">Manual Add</h4>
          <div className="space-y-2">
            <Input
              placeholder="0x..."
              value={newAddress}
              onChange={(value) => {
                setNewAddress(value)
                setAddressError('') // Clear error when typing
              }}
              className="w-full text-xs"
            />
            {addressError && (
              <p className="text-xs text-red-600 dark:text-red-400">{addressError}</p>
            )}
            <Button
              onClick={addRecipient}
              disabled={!newAddress.trim()}
              variant="outline"
              size="sm"
              className="w-full py-1"
            >
              Add
            </Button>
          </div>
        </div>

        {/* Bulk Add */}
        <div className="">
          <h4 className="text-sm font-medium text-black dark:text-white mb-2">Bulk Add</h4>
          <div className="space-y-2">
            <textarea
              placeholder="Enter addresses (supports various formats):&#10;0x1234...5678&#10;0x5678...9abc&#10;0x9abc...def0&#10;&#10;Or mixed format:&#10;0x1234...5678, 0x5678...9abc; 0x9abc...def0&#10;&#10;Also supports addresses without 0x prefix"
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
            <Button
              onClick={addBulkRecipients}
              disabled={!bulkAddresses.trim()}
              variant="outline"
              size="sm"
              className="w-full py-1"
            >
              Add All ({parseBulkAddresses(bulkAddresses).addresses.length} addresses)
            </Button>
          </div>
        </div>

        {/* Saved Wallets */}
        <div className="">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-black dark:text-white">Saved Wallets</h4>
            <div className="flex space-x-2">
              <Button
                onClick={() => setShowSavedWallets(!showSavedWallets)}
                variant="outline"
                size="sm"
                className="px-3"
              >
                {showSavedWallets ? 'Hide' : 'Show'} ({savedWallets.length})
              </Button>
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
          
          {showSavedWallets && (
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

        {/* Recipients List */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-black dark:text-white">
              Recipients ({config.recipients.length}/{maxRecipients})
            </h4>
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

          {config.recipients.length === 0 ? (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              <p className="text-xs">No recipients added yet</p>
              <p className="text-xs">Upload CSV or add manually</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {config.recipients.map((recipient, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 border border-gray-200 dark:border-gray-800 rounded">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-black dark:text-white truncate">
                      {formatAddress(recipient.address)}
                    </div>
                    {recipient.amount && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {recipient.amount} {config.tokenSymbol || 'Token'}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeRecipient(index)}
                    className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

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
