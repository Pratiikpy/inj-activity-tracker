import { useState } from 'react';

export interface WalletStats {
  address: string;
  rank: number;
  txCount: number;
  balance: string;
  nftCount: number;
  totalVolume: string;
  totalGas: string;
  badge: string;
  lastActivity: string;
}

export const useInjectiveAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWalletStats = async (address: string): Promise<WalletStats> => {
    setLoading(true);
    setError(null);

    try {
      // Get basic transactions
      const txResponse = await fetch(
        `https://testnet.blockscout-api.injective.network/api?module=account&action=txlist&address=${address}&page=1&offset=1000&sort=desc`
      );
      const txData = await txResponse.json();
      
      // Get balance
      const balanceResponse = await fetch(
        `https://testnet.blockscout-api.injective.network/api?module=account&action=balance&address=${address}`
      );
      const balanceData = await balanceResponse.json();
      
      // Get NFT transfers
      const nftResponse = await fetch(
        `https://testnet.blockscout-api.injective.network/api?module=account&action=tokennfttx&address=${address}`
      );
      const nftData = await nftResponse.json();
      
      // Process the data
      const txCount = txData.result && Array.isArray(txData.result) ? txData.result.length : 0;
      const balance = balanceData.result ? (parseInt(balanceData.result) / 1e18).toFixed(4) : '0';
      const nftCount = nftData.result && Array.isArray(nftData.result) ? nftData.result.length : 0;
      
      // Calculate total volume
      const totalVolume = txData.result && Array.isArray(txData.result) ? 
        txData.result.reduce((sum, tx) => sum + (parseInt(tx.value || '0') / 1e18), 0).toFixed(4) : '0';
      
      // Calculate total gas used  
      const totalGas = txData.result && Array.isArray(txData.result) ?
        txData.result.reduce((sum, tx) => sum + (parseInt(tx.gasUsed || '0') / 1e18), 0).toFixed(4) : '0';
      
      // Determine badge
      let badge = 'New User';
      if (txCount > 100) badge = 'Power User';
      if (nftCount > 10) badge = 'NFT Hunter';
      if (txCount > 500) badge = 'Whale';
      if (parseFloat(totalVolume) > 1000) badge = 'Bridge Master';
      
      // Get last activity
      const lastActivity = txData.result && Array.isArray(txData.result) && txData.result.length > 0 ? 
        new Date(parseInt(txData.result[0].timeStamp) * 1000).toLocaleDateString() : 'No activity';
      
      // Calculate rank (simplified for demo - in real app would compare with all users)
      const rank = Math.max(1, Math.floor(Math.random() * 1000) + 1 - (txCount / 10));
      
      return {
        address,
        txCount,
        balance,
        nftCount,
        totalVolume,
        totalGas,
        badge,
        lastActivity,
        rank: Math.floor(rank)
      };
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch wallet data';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    fetchWalletStats,
    loading,
    error
  };
};