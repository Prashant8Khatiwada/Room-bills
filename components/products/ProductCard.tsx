'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface ProductCardProps {
  id: string;
  name: string;
  defaultPrice: number;
  unitLabel?: string;
  onDelete: (id: string) => void;
}

export function ProductCard({ id, name, defaultPrice, unitLabel, onDelete }: ProductCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-bold text-foreground">{name}</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-danger hover:bg-danger/10"
          onClick={() => onDelete(id)}
        >
          Delete
        </Button>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        <div>Default Price: NPR {defaultPrice}</div>
        {unitLabel && <div>Unit: {unitLabel}</div>}
      </CardContent>
    </Card>
  );
}
