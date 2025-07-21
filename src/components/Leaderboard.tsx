import React, { useState, useEffect, useRef, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Crown } from "lucide-react";
import { SmartCache } from "../lib/cache";
import { apiErrorMessages, getAPIErrorMessage } from "../lib/api";
import { useErrorRecovery } from "../hooks/useErrorRecovery";
import Blockies from 'react-blockies';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Copy } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

// Badge icon map
import { Star, Gem, Zap, User } from 'lucide-react';
const badgeIcons: Record<string, JSX.Element> = {
  'Whale': <Crown className="w-4 h-4 mr-1 text-yellow-500" />, // Whale
  'Power User': <Zap className="w-4 h-4 mr-1 text-blue-500" />, // Power User
  'NFT Hunter': <Gem className="w-4 h-4 mr-1 text-pink-500" />, // NFT Hunter
  'Bridge Master': <Star className="w-4 h-4 mr-1 text-green-500" />, // Bridge Master
  'Active User': <Trophy className="w-4 h-4 mr-1 text-orange-500" />, // Active User
  'Holder': <Award className="w-4 h-4 mr-1 text-gray-500" />, // Holder
  'Inactive': <User className="w-4 h-4 mr-1 text-muted-foreground" />, // Inactive
  'New User': <Award className="w-4 h-4 mr-1 text-muted-foreground" />, // New User
};
const badgeDescriptions: Record<string, string> = {
  'Whale': '500+ transactions',
  'Power User': '100+ transactions',
  'NFT Hunter': '10+ NFTs',
  'Bridge Master': '100+ tINJ volume',
  'Active User': '10+ transactions',
  'Holder': 'No tx, positive balance',
  'Inactive': 'No tx, no balance',
  'New User': 'New or low activity',
};

// Define types for address and transaction
interface AddressEntry {
  address: string;
  balance?: string;
}
interface Transaction {
  hash: string;
  value: string;
  gasUsed: string;
  timeStamp: string;
}

interface LeaderboardEntry {
  rank: number;
  address: string;
  txCount: number;
  totalVolume: string;
  balance: string;
  badge: string;
  activityScore: number;
  lastUpdate: number;
}

const cache = new SmartCache(1); // Only 1 leaderboard entry cached
const LEADERBOARD_CACHE_KEY = "leaderboard";
const LEADERBOARD_TTL = 600000; // 10 minutes

const getBadge = (txCount: number, balance: number, nftCount: number, totalVolume: number) => {
  if (txCount === 0 && balance === 0) return "Inactive";
  else if (txCount === 0 && balance > 0) return "Holder";
  else if (txCount > 500) return "Whale";
  else if (nftCount > 10) return "NFT Hunter";
  else if (txCount > 100) return "Power User";
  else if (totalVolume > 100) return "Bridge Master";
  else if (txCount >= 10) return "Active User";
  else return "New User";
};

const fetchAllAddresses = async (executeWithRetry: (op: () => Promise<Response>, ctx: string) => Promise<Response>): Promise<AddressEntry[]> => {
  const addresses: AddressEntry[] = [];
  let page = 1;
  const maxPages = 20;
  while (page <= maxPages) {
    try {
      const response = await executeWithRetry(
        () => fetch(`https://testnet.blockscout-api.injective.network/api?module=account&action=listaccounts&page=${page}&offset=100`),
        `fetchAllAddresses page ${page}`
      );
      if (!response.ok) {
        if (response.status === 429) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        throw new Error(getAPIErrorMessage(response.status, `HTTP ${response.status}`));
      }
      const data = await response.json();
      if (!data.result || !Array.isArray(data.result) || data.result.length === 0) {
        break;
      }
      addresses.push(...data.result);
      page++;
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      if (page === 1) throw error;
      break;
    }
  }
  return addresses;
};

const smartSampleAddresses = (addresses: AddressEntry[], sampleSize: number): AddressEntry[] => {
  const sorted = addresses.sort((a, b) => {
    const balanceA = parseInt(a.balance || "0");
    const balanceB = parseInt(b.balance || "0");
    return balanceB - balanceA;
  });
  const topByBalance = sorted.slice(0, Math.floor(sampleSize * 0.5));
  const randomSample = sorted.slice(Math.floor(sampleSize * 0.5))
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.ceil(sampleSize * 0.5));
  return [...topByBalance, ...randomSample];
};

const validateTransactionData = (txData: unknown): { isValid: boolean; transactions: Transaction[] } => {
  if (!txData || typeof txData !== "object") return { isValid: false, transactions: [] };
  const result = (txData as { result?: unknown }).result;
  if (!result || !Array.isArray(result)) return { isValid: true, transactions: [] };
  const validTransactions = (result as Transaction[]).filter(
    (tx: Transaction) =>
      tx &&
      typeof tx.hash === "string" &&
      typeof tx.value === "string" &&
      typeof tx.gasUsed === "string" &&
      typeof tx.timeStamp === "string" &&
      !isNaN(parseInt(tx.value)) &&
      !isNaN(parseInt(tx.gasUsed))
  );
  return { isValid: true, transactions: validTransactions };
};

const fetchAddressStatsInBatches = async (
  addresses: AddressEntry[],
  executeWithRetry: (op: () => Promise<Response>, ctx: string) => Promise<Response>,
  setProgress: (n: number) => void
): Promise<LeaderboardEntry[]> => {
  const BATCH_SIZE = 5;
  const results: LeaderboardEntry[] = [];
  for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
    const batch = addresses.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (addr) => {
      const maxRetries = 3;
      let retries = 0;
      while (retries < maxRetries) {
        try {
          const txResponse = await fetch(
            `https://testnet.blockscout-api.injective.network/api?module=account&action=txlist&address=${addr.address}&page=1&offset=1000&sort=desc`
          );
          if (!txResponse.ok) {
            if (txResponse.status === 429) {
              await new Promise((resolve) => setTimeout(resolve, 1000 * (retries + 1)));
              retries++;
              continue;
            }
            throw new Error(getAPIErrorMessage(txResponse.status, `HTTP ${txResponse.status}`));
          }
          const txData = await txResponse.json();
          const validation = validateTransactionData(txData);
          if (!validation.isValid) {
            throw new Error("Invalid transaction data");
          }
          const txCount = validation.transactions.length;
          const totalVolume = validation.transactions.reduce((sum: number, tx: Transaction) => {
            try {
              return sum + parseInt(tx.value || "0") / 1e18;
            } catch {
              return sum;
            }
          }, 0);
          // NFT count (optional, not always available)
          let nftCount = 0;
          try {
            const nftResponse = await fetch(
              `https://testnet.blockscout-api.injective.network/api?module=account&action=tokennfttx&address=${addr.address}`
            );
            if (nftResponse.ok) {
              const nftData = await nftResponse.json();
              nftCount = Array.isArray(nftData.result) ? nftData.result.length : 0;
            }
          } catch (e) {
            // ignore NFT errors
          }
          const balance = parseInt(addr.balance || "0") / 1e18;
          const activityScore = txCount + totalVolume * 0.1;
          return {
            address: addr.address,
            txCount,
            totalVolume: totalVolume.toFixed(4),
            balance: balance.toFixed(4),
            badge: getBadge(txCount, balance, nftCount, totalVolume),
            activityScore,
            lastUpdate: Date.now(),
            rank: 0 // will be set later
          };
        } catch (error: unknown) {
          retries++;
          if (retries >= maxRetries) {
            return {
              address: addr.address,
              txCount: 0,
              totalVolume: "0.0000",
              balance: "0.0000",
              badge: "Inactive",
              activityScore: 0,
              lastUpdate: Date.now(),
              rank: 0
            };
          }
          await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
        }
      }
    });
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(Boolean) as LeaderboardEntry[]);
    setProgress(Math.min(i + BATCH_SIZE, addresses.length));
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return results;
};

const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const executeWithRetry = useErrorRecovery();
  const totalToProcess = useRef(0);
  const { toast } = useToast();

  // Analytics
  const trackLeaderboardLoaded = (loadTime: number, entryCount: number) => {
    // Placeholder for analytics integration
    // e.g., analytics.trackLeaderboardLoad(loadTime, entryCount);
    // console.log('leaderboard_loaded', { loadTime, entryCount });
  };
  const trackApiError = (errorType: string, endpoint: string, retryCount: number) => {
    // Placeholder for analytics integration
    // e.g., analytics.trackError(errorType, endpoint, retryCount);
    // console.warn('api_error', { errorType, endpoint, retryCount });
  };

  // Copy address handler
  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    toast({ title: 'Copied!', description: 'Address copied to clipboard.' });
  };

  // Main leaderboard fetch logic
  const fetchRealLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      // Check cache first
      const cached = cache.get(LEADERBOARD_CACHE_KEY);
      if (cached && Array.isArray(cached) && Date.now() - cached[0]?.lastUpdate < LEADERBOARD_TTL) {
        setLeaderboard(cached as LeaderboardEntry[]);
        setLoading(false);
        return;
      }
      // Step 1: Get all addresses
      const allAddresses = await fetchAllAddresses(executeWithRetry);
      if (!allAddresses.length) throw new Error(apiErrorMessages.emptyResponse);
      // Step 2: Smart sample
      const sampleAddresses = smartSampleAddresses(allAddresses, Math.min(200, allAddresses.length));
      totalToProcess.current = sampleAddresses.length;
      // Step 3: Fetch stats in batches
      setProgress(0);
      const addressStats = await fetchAddressStatsInBatches(sampleAddresses, executeWithRetry, setProgress);
      // Step 4: Sort and rank
      const sorted = addressStats
        .filter((a) => a && a.address)
        .sort((a, b) => b.activityScore - a.activityScore)
        .slice(0, 20)
        .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
      cache.set(LEADERBOARD_CACHE_KEY, sorted, LEADERBOARD_TTL);
      setLeaderboard(sorted);
      setLoading(false);
      trackLeaderboardLoaded(Date.now(), sorted.length);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Leaderboard unavailable");
        trackApiError(err.message, "leaderboard", 0);
      } else {
        setError("Leaderboard unavailable");
        trackApiError("Unknown error", "leaderboard", 0);
      }
      setLoading(false);
    }
  };

  // Auto-refresh every 10 minutes
  useEffect(() => {
    fetchRealLeaderboard();
    const interval = setInterval(fetchRealLeaderboard, LEADERBOARD_TTL);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Trophy className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <Award className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getBadgeVariant = (badge: string) => {
    switch (badge) {
      case "Whale":
        return "default";
      case "Power User":
        return "secondary";
      case "NFT Hunter":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getRankStyle = (rank: number) => {
    if (rank <= 3) return "bg-gradient-primary text-primary-foreground";
    return "bg-muted text-muted-foreground";
  };

  if (loading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6">
            <h2 className="text-4xl font-bold mb-4">Top 20 Leaderboard</h2>
            <Progress value={progress > 0 && totalToProcess.current > 0 ? (progress / totalToProcess.current) * 100 : 10} className="w-full h-2 mb-4" />
            <p className="text-muted-foreground">
              {progress > 0 && totalToProcess.current > 0
                ? `Processing leaderboard data... ${Math.round((progress / totalToProcess.current) * 100)}% (${progress}/${totalToProcess.current})`
                : "Loading rankings..."}
            </p>
          </div>
          <div className="max-w-4xl mx-auto space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-muted rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-1/3"></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Top 20 Leaderboard</h2>
            <p className="text-red-500">{error}</p>
            <button
              className="mt-4 px-4 py-2 bg-primary text-white rounded"
              onClick={fetchRealLeaderboard}
            >
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Top 20 Leaderboard
          </h2>
          <p className="text-muted-foreground">
            Compete with the most active wallets on Injective EVM Testnet
          </p>
        </div>
        <div className="max-w-4xl mx-auto">
          {/* Top 3 Podium */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            {leaderboard.slice(0, 3).map((entry, index) => (
              <Card
                key={entry.address}
                className={`p-6 text-center shadow-card hover:shadow-hover transition-all duration-200 relative overflow-visible
                  ${index === 0 ? 'z-10 scale-105 border-4 border-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 animate-pulse-slow' :
                    index === 1 ? 'z-9 border-2 border-gradient-to-r from-gray-400 to-gray-200 animate-pulse-slow' :
                    index === 2 ? 'z-8 border-2 border-gradient-to-r from-amber-600 to-yellow-400 animate-pulse-slow' : ''}
                `}
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className="flex justify-center mb-4">
                  <Avatar className="mx-auto mb-2">
                    <Blockies seed={entry.address.toLowerCase()} size={8} scale={5} className="rounded-full" />
                  </Avatar>
                  {getRankIcon(entry.rank)}
                </div>
                <div
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold mb-3 ${getRankStyle(
                    entry.rank
                  )}`}
                >
                  {entry.rank}
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={() => handleCopy(entry.address)} className="focus:outline-none">
                        <span className="font-mono text-sm">{entry.address.slice(0, 6)}...{entry.address.slice(-4)}</span>
                        <Copy className="inline ml-1 w-4 h-4 text-muted-foreground hover:text-primary align-middle" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Copy address</TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold mb-2">{entry.txCount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mb-3">transactions</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center">
                      {badgeIcons[entry.badge]}
                      <Badge variant={getBadgeVariant(entry.badge)} className="text-xs">
                        {entry.badge}
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{badgeDescriptions[entry.badge]}</TooltipContent>
                </Tooltip>
                <div className="mt-2 text-xs text-muted-foreground">
                  {entry.totalVolume} tINJ • {entry.balance} tINJ
                </div>
              </Card>
            ))}
          </div>
          {/* Remaining Rankings - Responsive Card Layout */}
          <div className="space-y-3">
            {leaderboard.slice(3).map((entry) => (
              <Card key={entry.address} className="p-4 shadow-card hover:shadow-hover transition-all duration-200 flex flex-col sm:flex-row items-center justify-between">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <Avatar className="hidden sm:block">
                    <Blockies seed={entry.address.toLowerCase()} size={8} scale={4} className="rounded-full" />
                  </Avatar>
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${getRankStyle(entry.rank)}`}>
                      {entry.rank}
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={() => handleCopy(entry.address)} className="focus:outline-none">
                          <span className="font-mono text-sm">{entry.address.slice(0, 6)}...{entry.address.slice(-4)}</span>
                          <Copy className="inline ml-1 w-4 h-4 text-muted-foreground hover:text-primary align-middle" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Copy address</TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">
                      {entry.txCount.toLocaleString()} txs
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">
                      {entry.totalVolume} tINJ
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">
                      {entry.balance} tINJ
                    </span>
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center mt-2 sm:mt-0">
                      {badgeIcons[entry.badge]}
                      <Badge variant={getBadgeVariant(entry.badge)} className="text-xs">
                        {entry.badge}
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{badgeDescriptions[entry.badge]}</TooltipContent>
                </Tooltip>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Leaderboard;