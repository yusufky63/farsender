/**
 * Spam/Scam detection utilities for Token filtering
 * Based on advanced filtering system
 */

// Spam/Scam detection patterns
const SPAM_PATTERNS = {
  // Common scam domains and URLs
  domains: [
    '.fi', '.org', '.net', '.com', 'stethaward.net', '.fun', '.xyz', '.io', '.app', '.gg', '.cc', '.tk', '.ml', '.ga', '.cf',
    'wbtcprotocol.org', 'stethpool.com', '5000usdt.us', 'airdrop',
    'claim', 'reward', 'bonus', 'free', 'gift', 'winner', 'lucky'
  ],
  
  // Suspicious keywords - removed common legitimate words
  keywords: [
    'airdrop', 'voucher', 'claim', 'reward', 'bonus', 'free', 'gift', 'winner',
    'lucky', 'prize', 'giveaway', 'promotion', 'exclusive',
    'urgent', 'hurry', 'last chance', 'expires', 'visit', 'go to', '.', 'pro', 'test', 'telegram', 'TEST',
    'click', 'link', 'website', 'site', 'portal',
    // Removed: 'official', 'verified', 'authentic', 'genuine', 'real' - these are often in legitimate tokens
  ],
  
  // Suspicious emojis commonly used in scams
  emojis: [
    '🎁', '🎉', '🎊', '💰', '💎', '🚀', '🔥', '⚡', '✨', '🌟',
    '💸', '💵', '💴', '💶', '💷', '🏆', '🥇', '🎯', '📈', '📊',
    '🎪', '🎭', '🎨', '🎲', '🎰', '🎮', '🕹️', '🎸', '🎺', '🎻'
  ],
  
  // URL patterns
  urlPatterns: [
    /https?:\/\/[^\s]+/gi,
    /www\.[^\s]+/gi,
    /[a-zA-Z0-9-]+\.(com|org|net|io|app|xyz|me|co|tv|gg|cc|tk|ml|ga|cf)/gi,
    /[a-zA-Z0-9-]+\.eth/gi
  ]
};

// Check if text contains spam patterns
export function isSpamText(text: string, isNFT: boolean = false): boolean {
  if (!text || typeof text !== 'string') return false;
  
  const lowerText = text.toLowerCase();
  
  // Check for suspicious emojis (more than 5 different emojis is suspicious for NFTs)
  const emojiCount = SPAM_PATTERNS.emojis.filter(emoji => text.includes(emoji)).length;
  if (emojiCount >= (isNFT ? 6 : 2)) {
    return true;
  }
  
  // Check for URLs or domains - but be more lenient for NFTs
  // Skip URL checking for NFTs as many legitimate NFTs have URLs in metadata
  if (!isNFT) {
    const hasUrl = SPAM_PATTERNS.urlPatterns.some(pattern => pattern.test(text));
    if (hasUrl) {
      return true;
    }
    
    // Additional domain detection - check for .xyz, .io, .cc domains
    const domainPattern = /[a-zA-Z0-9-]+\.(xyz|io|cc|tk|ml|ga|cf|app|gg|fun|net|org|com)/gi;
    const domainMatch = text.match(domainPattern);
    if (domainMatch) {
      return true;
    }
  }
  
  // Check for suspicious domains - skip this for NFTs as many have legitimate domain references
  if (!isNFT) {
    const suspiciousDomain = SPAM_PATTERNS.domains.find(domain => 
      lowerText.includes(domain.toLowerCase())
    );
    if (suspiciousDomain) {
      return true;
    }
  }
  
  // Check for multiple suspicious keywords (5 or more for NFTs, 2 for tokens)
  const foundKeywords = SPAM_PATTERNS.keywords.filter(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
  if (foundKeywords.length >= (isNFT ? 5 : 2)) {
    return true;
  }
  
  // Check for specific high-risk single keywords - but exclude common NFT words
  const highRiskKeywords = isNFT 
    ? ['claim now', 'visit now', 'go to our', 'free mint', 'voucher'] // Much more restrictive for NFTs - only obvious scams
    : ['airdrop', 'voucher', 'claim', 'reward', 'free', 'gift', '.io', '.xyz', '.app', '.fun', '.net', '.org', '.com'];
    
  const foundHighRisk = highRiskKeywords.find(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
  if (foundHighRisk) {
    return true;
  }
  
  return false;
}

// Check if a token is likely spam/scam
export function isSpamToken(token: any): boolean {
  if (!token) return false;
  
  // Check token name
  if (token.name && isSpamText(token.name)) return true;
  
  // Check token symbol
  if (token.symbol && isSpamText(token.symbol)) return true;
  
  // Check token description
  if (token.description && isSpamText(token.description)) return true;
  
  // Check metadata name
  if (token.token_metadata?.name && isSpamText(token.token_metadata.name)) return true;
  
  // Additional token-specific checks
  if (token.name && token.symbol) {
    const name = token.name.toLowerCase();
    const symbol = token.symbol.toLowerCase();
    
    // Very suspicious patterns
    if (name.includes('visit') || name.includes('go to') || name.includes('claim at')) {
      return true;
    }
    if (symbol.includes('visit') || symbol.includes('go to') || symbol.includes('claim')) {
      return true;
    }
    
    // Fake official tokens
    const fakeOfficialPatterns = ['ethereum', 'bitcoin', 'uniswap', 'metamask', 'opensea'];
    if (fakeOfficialPatterns.some(pattern => name.includes(pattern) && name !== pattern)) return true;
  }
  
  return false;
}

// Hard spam detection - ALWAYS filtered regardless of spam filter setting
export function isHardSpamToken(token: any): boolean {
  if (!token) return false;
  
  // Check for obvious scam patterns (links, emojis, suspicious text)
  if (isSpamToken(token)) {
    return true;
  }
  
  return false;
}

// Check if token is unofficial (not from major protocols)
export function isUnofficialToken(token: any): boolean {
  if (!token) return false;
  
  // Official token patterns (major protocols and well-known tokens)
  const officialPatterns = [
    'ethereum', 'bitcoin', 'wrapped bitcoin', 'wbtc', 'usdc', 'usdt', 'tether',
    'dai', 'maker', 'uniswap', 'chainlink', 'link', 'aave', 'compound', 'comp',
    'curve', 'crv', 'yearn', 'yfi', 'sushi', 'sushiswap', 'pancakeswap', 'cake',
    'balancer', 'bal', 'synthetix', 'snx', '0x', 'zrx', 'kyber', 'knc',
    'bancor', 'bnt', '1inch', '1inch', 'paraswap', 'metamask', 'opensea',
    'base', 'optimism', 'arbitrum', 'polygon', 'matic', 'avalanche', 'avax',
    'solana', 'sol', 'cardano', 'ada', 'polkadot', 'dot', 'cosmos', 'atom',
    'binance', 'bnb', 'binance coin', 'binance smart chain', 'bsc',
    // Base chain specific tokens
    'friend', 'friend tech', 'farcaster', 'fc', 'weth', 'wrapped ether',
    'dai', 'usdc', 'usdt', 'wbtc', 'crv', 'bal', 'snx', 'link', 'comp',
    // Popular DeFi tokens
    'lido', 'ldo', 'rocket', 'rpl', 'frax', 'fxs', 'convex', 'cvx',
    'alchemix', 'alcx', 'badger', 'badger', 'harvest', 'farm', 'cream', 'cream'
  ];
  
  const name = (token.name || '').toLowerCase();
  const symbol = (token.symbol || '').toLowerCase();
  
  // Check if token matches official patterns
  const isOfficial = officialPatterns.some(pattern => 
    name.includes(pattern) || symbol.includes(pattern)
  );
  
  // If it's not official and has suspicious characteristics, mark as unofficial
  if (!isOfficial) {
    // Check for very low value (below $0.1)
    if (token.value_usd && parseFloat(token.value_usd) < 0.1) {
      return true;
    }
    
    // Check for low liquidity
    if (token.low_liquidity === true) {
      return true;
    }
    
    // Check for incomplete metadata
    if (!token.name || !token.symbol || token.decimals === undefined) {
      return true;
    }
    
    // Check for missing logo/metadata (resmi tokenlar genelde logo'ya sahip)
    if (!token.token_metadata?.logo && !token.logo) {
      return true;
    }
  }
  
  return false;
}

// Soft spam detection - only filtered when hideSpamScamTokens is true
export function isSoftSpamToken(token: any): boolean {
  if (!token) return false;
  
  const LIQUIDITY_THRESHOLD = 1000;
  
  // Use Sim API's low_liquidity flag (objective measure)
  if (token.low_liquidity === true) {
    return true;
  }
  
  // Check if token has sufficient liquidity
  if (token.pool_size !== undefined && token.pool_size !== null) {
    if (parseFloat(token.pool_size) < LIQUIDITY_THRESHOLD) {
      return true;
    }
  }
  
  // Check for incomplete metadata (but not hard spam)
  if (!token.name || !token.symbol || token.decimals === undefined) {
    return true;
  }
  
  // Check for very low value tokens
  if (token.price_usd && parseFloat(token.price_usd) <= 0) {
    return true;
  }
  
  // Check for unofficial tokens
  if (isUnofficialToken(token)) {
    return true;
  }
  
  return false;
}

// Enhanced token filtering with two-level spam detection
export function filterTokensWithSpamDetection(tokens: any[], hideSpamScamTokens: boolean = true): any[] {
  if (!tokens || !Array.isArray(tokens)) return [];
  
  // If spam filter is disabled, return all tokens (no filtering)
  if (!hideSpamScamTokens) {
    return tokens;
  }
  
  return tokens.filter(token => {
    // Filter hard spam (links, emojis, obvious scams) when filter is enabled
    if (isHardSpamToken(token)) {
      return false;
    }
    
    // Keep native tokens always
    if (token.contractAddress === 'native' || token.contractAddress === '0x0000000000000000000000000000000000000000') {
      return true;
    }
    
    // Apply soft spam filtering when filter is enabled
    if (isSoftSpamToken(token)) {
      return false;
    }
    
    return true;
  });
}
