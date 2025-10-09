'use client'
import { useReadContract } from 'wagmi'
import { Card } from '@/components/ui/Card'
import { useContractInfo } from '@/hooks/useContractInfo'
import { SAFE_MULTISENDER_ABI } from '@/lib/contracts'
import { formatEther } from 'viem'

export function ContractStats() {
  const { contractAddress } = useContractInfo()

  const { data: uniqueUsers, isLoading: uniqueUsersLoading } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: SAFE_MULTISENDER_ABI,
    functionName: 'uniqueUsers',
    query: {
      enabled: !!contractAddress,
    },
  })

  const { data: totalTransfers, isLoading: totalTransfersLoading } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: SAFE_MULTISENDER_ABI,
    functionName: 'totalTransfers',
    query: {
      enabled: !!contractAddress,
    },
  })

  const { data: totalRecipients, isLoading: totalRecipientsLoading } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: SAFE_MULTISENDER_ABI,
    functionName: 'totalRecipients',
    query: {
      enabled: !!contractAddress,
    },
  })

  const { data: totalEthSent, isLoading: totalEthSentLoading } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: SAFE_MULTISENDER_ABI,
    functionName: 'totalEthSent',
    query: {
      enabled: !!contractAddress,
    },
  })

  const isLoading = uniqueUsersLoading || totalTransfersLoading || totalRecipientsLoading || totalEthSentLoading

  if (isLoading) {
    return (
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-[#5638a1] border-t-[#5638a1] rounded-full animate-spin"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Loading stats...</span>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  if (!contractAddress) {
    return (
      <Card>
        <div className="p-4">
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Contract not available on this network</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-lg font-bold text-[#5638a1]">
                {uniqueUsers?.toString() || '0'}
              </div>
              <div className="text-xs text-gray-500">Users</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-[#5638a1]">
                {totalTransfers?.toString() || '0'}
              </div>
              <div className="text-xs text-gray-500">Transfers</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-[#5638a1]">
                {totalRecipients?.toString() || '0'}
              </div>
              <div className="text-xs text-gray-500">Recipients</div>
            </div>
{/*             
            <div className="text-center">
              <div className="text-lg font-bold text-[#5638a1]">
                {totalEthSent && typeof totalEthSent === 'bigint' ? parseFloat(formatEther(totalEthSent)).toFixed(1) : '0.0'}
              </div>
              <div className="text-xs text-gray-500">ETH Sent</div>
            </div> */}
          </div>
        </div>
      </div>
    </Card>
  )
}
