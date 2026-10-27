'use client';

import { Monitor, Moon, Sun } from 'lucide-react';

import { useTheme } from '@/components/providers/theme-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { theme, resolved, setTheme } = useTheme();
  const Icon = resolved === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          className="relative overflow-hidden"
        >
          <Icon className="size-4 transition-transform duration-200" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ThemeOption
          value="light"
          label="Light"
          icon={Sun}
          active={theme === 'light'}
          onSelect={() => setTheme('light')}
        />
        <ThemeOption
          value="dark"
          label="Dark"
          icon={Moon}
          active={theme === 'dark'}
          onSelect={() => setTheme('dark')}
        />
        <ThemeOption
          value="system"
          label="System"
          icon={Monitor}
          active={theme === 'system'}
          onSelect={() => setTheme('system')}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThemeOption({
  label,
  icon: Icon,
  active,
  onSelect,
}: {
  value: string;
  label: string;
  icon: typeof Sun;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem onSelect={onSelect}>
      <Icon className="size-4" />
      <span>{label}</span>
      {active ? <span className="bg-primary ml-auto size-1.5 rounded-full" aria-hidden /> : null}
    </DropdownMenuItem>
  );
}
