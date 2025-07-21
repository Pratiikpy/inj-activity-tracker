import { Zap } from "lucide-react";

const Header = () => {
  return (
    <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="injective-logo h-10 w-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Injective Tracker
            </h1>
            <p className="text-sm text-muted-foreground">EVM Testnet Analytics</p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Chain ID: 1439
        </div>
      </div>
    </header>
  );
};

export default Header;