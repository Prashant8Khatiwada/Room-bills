import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminHeaderProps {
  title: string;
  description: string;
}

export function AdminHeader({ title, description }: AdminHeaderProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
