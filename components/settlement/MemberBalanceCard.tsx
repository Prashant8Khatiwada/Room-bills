import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface MemberBalanceProps {
  name: string;
  email: string;
  paid: number;
  owed: number;
  net: number;
}

export function MemberBalanceCard({ name, email, paid, owed, net }: MemberBalanceProps) {
  const isOwed = net >= 0;
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-foreground">{name}</CardTitle>
        <CardDescription className="text-xs">{email}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 text-xs">
        <div>Total Paid: NPR {paid}</div>
        <div>Total Share Owed: NPR {owed}</div>
        <div className="pt-2 text-sm font-bold">
          Net Balance:{' '}
          <span className={isOwed ? 'text-success' : 'text-danger'}>
            {isOwed ? `+NPR ${net} (is owed)` : `-NPR ${Math.abs(net)} (owes)`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
