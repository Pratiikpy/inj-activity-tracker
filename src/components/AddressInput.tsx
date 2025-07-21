import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AddressInputProps {
  onTrack: (address: string) => void;
  loading: boolean;
}

const AddressInput = ({ onTrack, loading }: AddressInputProps) => {
  const [address, setAddress] = useState("");

  const validateAddress = (addr: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address.trim()) {
      toast({
        title: "Address Required",
        description: "Please enter a wallet address to track",
        variant: "destructive",
      });
      return;
    }

    if (!validateAddress(address)) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Ethereum address (0x...)",
        variant: "destructive",
      });
      return;
    }

    onTrack(address);
  };

  return (
    <section className="py-20 bg-gradient-hero">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
          Track Your Injective Journey
        </h2>
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          Enter your wallet address to see your rank, activity stats, and compete on the Injective EVM testnet leaderboard
        </p>
        
        <Card className="max-w-2xl mx-auto p-8 shadow-card bg-gradient-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter wallet address (0x...)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="pl-10 h-12 text-lg"
                disabled={loading}
              />
            </div>
            <Button 
              type="submit" 
              variant="hero" 
              size="lg"
              className="w-full h-12 text-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Tracking Wallet...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  Track Wallet
                </>
              )}
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
};

export default AddressInput;