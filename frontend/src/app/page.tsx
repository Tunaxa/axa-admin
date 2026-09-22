import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">AXA Admin</h1>
      <p className="text-muted-foreground text-sm">Frontend scaffold.</p>
      <Button>Button</Button>
    </main>
  );
}
