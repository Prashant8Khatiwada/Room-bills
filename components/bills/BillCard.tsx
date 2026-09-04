'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface BillCardProps {
  type: string;
  amount: number;
  month: string;
  paidByName: string;
  prevUnit?: number;
  currentUnit?: number;
  ratePerUnit?: number;
}

export function BillCard({
  type,
  amount,
  month,
  paidByName,
  prevUnit,
  currentUnit,
  ratePerUnit,
}: BillCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg capitalize font-bold text-foreground">{type}</CardTitle>
        <span className="text-sm font-bold text-primary">NPR {amount}</span>
      </CardHeader>
      <CardContent className="text-xs space-y-1 text-muted-foreground">
        <div>Month: {month}</div>
        <div>Paid By: {paidByName}</div>
        {type === 'electricity' && prevUnit !== undefined && currentUnit !== undefined && (
          <div>
            Units: {prevUnit} → {currentUnit} (@ NPR {ratePerUnit}/unit)
          </div>
        )}
      </CardContent>
    </Card>
  );
}
