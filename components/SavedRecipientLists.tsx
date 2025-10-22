'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Recipient } from '@/types'

interface SavedList {
  id: string
  name: string
  recipients: Recipient[]
  tokenType: string
  createdAt: string
  totalRecipients: number
}

interface SavedRecipientListsProps {
  onLoadList: (recipients: Recipient[]) => void
}

export function SavedRecipientLists({ onLoadList }: SavedRecipientListsProps) {
  const [savedLists, setSavedLists] = useState<SavedList[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // Load saved lists from localStorage
  useEffect(() => {
    const lists = JSON.parse(localStorage.getItem('savedRecipientLists') || '[]')
    setSavedLists(lists)
  }, [])

  // Delete a saved list
  const deleteList = (listId: string) => {
    const updatedLists = savedLists.filter(list => list.id !== listId)
    setSavedLists(updatedLists)
    localStorage.setItem('savedRecipientLists', JSON.stringify(updatedLists))
    setShowDeleteConfirm(null)
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

  if (savedLists.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
        No saved recipient lists yet. Save a list from the batch transaction screen.
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto">
      {savedLists.map((list) => (
        <div key={list.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                  {list.name}
                </h5>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                  {list.tokenType}
                </span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {list.totalRecipients} recipients • {formatDate(list.createdAt)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => onLoadList(list.recipients)}
                size="sm"
                variant="outline"
                className="text-xs px-2 py-1"
              >
                Load
              </Button>
              <button
                onClick={() => setShowDeleteConfirm(list.id)}
                className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {/* Delete Confirmation */}
          {showDeleteConfirm === list.id && (
            <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <p className="text-xs text-red-800 dark:text-red-200 mb-2">
                Are you sure you want to delete &quot;{list.name}&quot;?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => deleteList(list.id)}
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-2 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 text-xs rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
