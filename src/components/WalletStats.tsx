import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Activity, 
  Coins, 
  Zap, 
  Trophy, 
  Calendar,
  Share2,
  ExternalLink 
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface WalletStatsProps {
  stats: {
    address: string;
    rank: number;
    txCount: number;
    balance: string;
    nftCount: number;
    totalVolume: string;
    totalGas: string;
    badge: string;
    lastActivity: string;
  };
}

const WalletStats = ({ stats }: WalletStatsProps) => {
  const handleShare = () => {
    const shareText = `🚀 I'm ranked #${stats.rank} on Injective EVM Testnet with ${stats.txCount} transactions! Badge: ${stats.badge}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'My Injective Tracker Stats',
        text: shareText,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast({
        title: "Copied to Clipboard!",
        description: "Share your stats on social media",
      });
    }
  };

  const handleViewOnExplorer = () => {
    window.open(`https://testnet.blockscout.injective.network/address/${stats.address}`, '_blank');
  };

  const getBadgeVariant = (badge: string) => {
    switch (badge) {
      case 'Whale': return 'default';
      case 'Power User': return 'secondary';
      case 'NFT Hunter': return 'outline';
      default: return 'secondary';
    }
  };

  const getRankColor = (rank: number) => {
    if (rank <= 10) return 'text-yellow-500';
    if (rank <= 100) return 'text-primary';
    return 'text-muted-foreground';
  };

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Trophy className={`h-8 w-8 ${getRankColor(stats.rank)}`} />
              <h2 className="text-4xl font-bold">
                Rank #{stats.rank}
              </h2>
            </div>
            <p className="text-muted-foreground mb-4">
              {stats.address.slice(0, 6)}...{stats.address.slice(-4)}
            </p>
            <div className="flex items-center justify-center gap-4">
              <Badge variant={getBadgeVariant(stats.badge)} className="text-lg px-4 py-2">
                {stats.badge}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
                Share Stats
              </Button>
              <Button variant="outline" size="sm" onClick={handleViewOnExplorer}>
                <ExternalLink className="h-4 w-4" />
                View on Explorer
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 shadow-card hover:shadow-hover transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Activity className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-bold">{stats.txCount.toLocaleString()}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-card hover:shadow-hover transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Coins className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="text-2xl font-bold">{stats.balance} tINJ</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-card hover:shadow-hover transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Volume</p>
                  <p className="text-2xl font-bold">{stats.totalVolume} tINJ</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-card hover:shadow-hover transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Zap className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gas Used</p>
                  <p className="text-2xl font-bold">{stats.totalGas} tINJ</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-card hover:shadow-hover transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">NFT Activity</p>
                  <p className="text-2xl font-bold">{stats.nftCount}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-card hover:shadow-hover transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Activity</p>
                  <p className="text-lg font-semibold">{stats.lastActivity}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WalletStats;