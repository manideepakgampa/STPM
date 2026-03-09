import { useState } from "react";
import { CheckCircle2, Gift, Loader2, Plus, Wallet, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface WalletSectionProps {
  wallet: { balance: number; transactions: any[] } | null;
  onAddMoney: (amount: number) => Promise<void>;
}

const WalletSection = ({ wallet, onAddMoney }: WalletSectionProps) => {
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(500);
  const [customAmount, setCustomAmount] = useState("");
  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAdd = async () => {
    const amount = customAmount ? parseInt(customAmount, 10) : selectedAmount;
    if (!amount || amount <= 0) return;
    setAdding(true);
    await onAddMoney(amount);
    setAdding(false);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setAddMoneyOpen(false);
    }, 1500);
  };

  const balance = wallet?.balance ?? 0;

  return (
    <>
      <section>
        <h2 className="font-display text-xl font-bold mb-4">Transport Wallet</h2>
        <div className="glass-card p-6 mb-4 glow-subtle">
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-3xl font-display font-bold">₹{balance.toFixed(0)}</p>
              </div>
            </div>
            <button onClick={() => setAddMoneyOpen(true)} className="px-5 py-2.5 rounded-2xl gradient-blue-orange font-semibold text-sm text-primary-foreground hover-lift flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Money
            </button>
          </div>
          <div className="rounded-xl bg-secondary/10 border border-secondary/20 px-4 py-3 flex items-center gap-3">
            <Gift className="h-5 w-5 text-secondary" />
            <p className="text-sm"><span className="font-semibold text-secondary">Manual test funding</span> lets you simulate approvals, purchases, and travel scans in real time.</p>
          </div>
        </div>
      </section>

      {addMoneyOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => !adding && setAddMoneyOpen(false)}>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
          <div onClick={(event) => event.stopPropagation()} className="relative glass-card w-full max-w-sm p-6 animate-slide-up">
            <button onClick={() => setAddMoneyOpen(false)} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-muted transition-colors">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>

            {success ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
                <p className="font-display font-bold text-lg">Funds added successfully</p>
                <p className="text-sm text-muted-foreground">New balance: ₹{balance.toFixed(0)}</p>
              </div>
            ) : (
              <>
                <h2 className="font-display text-xl font-bold mb-6">Add Money</h2>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[100, 500, 1000].map((amount) => (
                    <button key={amount} onClick={() => { setSelectedAmount(amount); setCustomAmount(""); }} className={`py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${selectedAmount === amount && !customAmount ? "gradient-blue-orange text-primary-foreground glow-blue" : "bg-muted hover:bg-muted/80 text-muted-foreground"}`}>
                      ₹{amount}
                    </button>
                  ))}
                </div>
                <Input value={customAmount} onChange={(event) => setCustomAmount(event.target.value.replace(/\D/g, ""))} placeholder="Or enter custom amount" className="bg-surface-2 border-border mb-4" />
                <button onClick={handleAdd} disabled={adding} className="w-full py-3.5 rounded-2xl gradient-blue-orange font-semibold text-primary-foreground hover-lift flex items-center justify-center gap-2">
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : `Add ₹${customAmount || selectedAmount}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default WalletSection;
