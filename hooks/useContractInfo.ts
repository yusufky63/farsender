import { useReadContract } from 'wagmi'
import { SAFE_MULTISENDER_ABI, getContractAddress } from '@/lib/contracts'

export function useContractInfo(chainId: number) {
  const contractAddress = getContractAddress(chainId)
  
  const { data: flatFee, error: flatFeeError } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: SAFE_MULTISENDER_ABI,
    functionName: 'flatFee',
    query: {
      enabled: !!contractAddress,
    },
  })
  
  if (flatFeeError) {
    console.error('flatFee error:', flatFeeError)
  }
  
  const { data: feeRecipient } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: SAFE_MULTISENDER_ABI,
    functionName: 'feeRecipient',
  })
  
  const { data: maxEthRecipients } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: SAFE_MULTISENDER_ABI,
    functionName: 'MAX_ETH_RECIPIENTS',
  })
  
  const { data: maxErc20Recipients } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: SAFE_MULTISENDER_ABI,
    functionName: 'MAX_ERC20_RECIPIENTS',
  })
  
  return {
    flatFee: flatFee as bigint | undefined,
    feeRecipient: feeRecipient as string | undefined,
    maxEthRecipients: maxEthRecipients as number | undefined,
    maxErc20Recipients: maxErc20Recipients as number | undefined,
  }
}
