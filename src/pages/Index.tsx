import { useState } from "react";
import Header from "@/components/Header";
import AddressInput from "@/components/AddressInput";
import WalletStats from "@/components/WalletStats";
import Leaderboard from "@/components/Leaderboard";
import Footer from "@/components/Footer";
import { useInjectiveAPI, type WalletStats as WalletStatsType } from "@/hooks/useInjectiveAPI";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [walletStats, setWalletStats] = useState<WalletStatsType | null>(null);
  const { fetchWalletStats, loading } = useInjectiveAPI();

  const handleTrackWallet = async (address: string) => {
    try {
      const stats = await fetchWalletStats(address);
      setWalletStats(stats);
      toast({
        title: "Wallet Tracked!",
        description: `Found ${stats.txCount} transactions for your wallet`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch wallet data. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AddressInput onTrack={handleTrackWallet} loading={loading} />
      {walletStats && <WalletStats stats={walletStats} />}
      <Leaderboard />
      <Footer />
    </div>
  );
};

export default Index;
