import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header / Navbar */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-lg shadow-md">
            R
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Room Bills
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button className="bg-primary hover:bg-primary/90">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-16 flex flex-col items-center text-center space-y-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
          <span>✨ Smart Multi-Room Expense & Settlement Manager</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-3xl leading-tight">
          Effortless Room Expenses & <span className="bg-gradient-to-r from-primary via-accent to-success bg-clip-text text-transparent">Instant Settlements</span>
        </h1>

        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl">
          Track recurring rent, calculate electricity per unit, auto-split groceries, and minimize debts across roommate accounts with complete transparency.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
          <Link href="/dashboard">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-base px-8 h-12 shadow-lg">
              Go to Dashboard
            </Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline" className="text-base px-8 h-12">
              Create Free Room
            </Button>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid gap-6 md:grid-cols-3 text-left w-full pt-12">
          <Card className="border-border shadow-sm hover:shadow-md transition-all">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-primary">⚡ Smart Room Bills</CardTitle>
              <CardDescription>
                Rent, waste, wifi, and precision electricity unit calculations with unit rates.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Computes exact total amounts from meter readings (Prev Unit → Current Unit @ Rate).
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm hover:shadow-md transition-all">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-accent">🛒 Expense Splits</CardTitle>
              <CardDescription>
                Log daily groceries or fixed product catalog items with automated equal splits.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Exclude absent members with a checkbox or save items for instant price autocompletion.
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm hover:shadow-md transition-all">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-success">⚖️ Debt Minimization</CardTitle>
              <CardDescription>
                Simplified net balance summary showing exactly who owes whom per settlement period.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Room owners can close settlement periods to finalize balances and start fresh periods.
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Room Bills Expense Tracker. All rights reserved.
      </footer>
    </div>
  );
}
