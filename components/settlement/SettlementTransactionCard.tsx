import { Card } from '@/components/ui/card';

interface SettlementTransactionProps {
  debtorName: string;
  creditorName: string;
  amount: number;
}

export function SettlementTransactionCard({ debtorName, creditorName, amount }: SettlementTransactionProps) {
  return (
    <Card className="p-4 flex items-center justify-between border-border">
      <div className="text-sm font-medium">
        <span className="font-bold text-danger">{debtorName}</span> pays{' '}
        <span className="font-bold text-success">{creditorName}</span>
      </div>
      <div className="text-base font-bold text-primary">NPR {amount}</div>
    </Card>
  );
}
