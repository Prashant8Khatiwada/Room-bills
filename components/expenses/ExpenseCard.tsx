'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface ExpenseCardProps {
  id: string;
  itemName: string;
  expenseDate: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paidByName: string;
  onDelete: (id: string) => void;
}

export function ExpenseCard({
  id,
  itemName,
  expenseDate,
  quantity,
  unitPrice,
  totalAmount,
  paidByName,
  onDelete,
}: ExpenseCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-bold text-foreground">{itemName}</CardTitle>
          <span className="text-xs text-muted-foreground">
            {expenseDate} · Qty: {quantity} @ NPR {unitPrice}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-base font-bold text-primary">NPR {totalAmount}</span>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-danger/10"
            onClick={() => onDelete(id)}
          >
            Delete
          </Button>
        </div>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        <div>Paid By: {paidByName}</div>
      </CardContent>
    </Card>
  );
}
