import { Moon, Sun } from 'lucide-react';
import { useCallback, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/context/use-theme';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Theme } from '@/context/theme-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

type AnimationVariant = 'circle' | 'circle-blur' | 'gif' | 'polygon';
type StartPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface ModeToggleProps {
  showLabel?: boolean;
  variant?: AnimationVariant;
  start?: StartPosition;
  url?: string;
  className?: string;
}

export const ModeToggle = ({
  showLabel = false,
  variant = 'circle',
  start = 'center',
  url,
  className,
}: ModeToggleProps) => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleThemeChange = useCallback((newTheme: Theme) => {
    const styleId = `theme-transition-${Date.now()}`;
    const style = document.createElement('style');
    style.id = styleId;

    let css = '';
    const positions = {
      center: 'center',
      'top-left': 'top left',
      'top-right': 'top right',
      'bottom-left': 'bottom left',
      'bottom-right': 'bottom right',
    };

    if (variant === 'circle') {
      const cx = start === 'center' ? '50' : start.includes('left') ? '0' : '100';
      const cy = start === 'center' ? '50' : start.includes('top') ? '0' : '100';
      css = `
        @supports (view-transition-name: root) {
          ::view-transition-old(root) { animation: none; }
          ::view-transition-new(root) {
            animation: circle-expand 0.4s ease-out;
            transform-origin: ${positions[start]};
          }
          @keyframes circle-expand {
            from { clip-path: circle(0% at ${cx}% ${cy}%); }
            to   { clip-path: circle(150% at ${cx}% ${cy}%); }
          }
        }
      `;
    } else if (variant === 'circle-blur') {
      const cx = start === 'center' ? '50' : start.includes('left') ? '0' : '100';
      const cy = start === 'center' ? '50' : start.includes('top') ? '0' : '100';
      css = `
        @supports (view-transition-name: root) {
          ::view-transition-old(root) { animation: none; }
          ::view-transition-new(root) {
            animation: circle-blur-expand 0.5s ease-out;
            transform-origin: ${positions[start]};
            filter: blur(0);
          }
          @keyframes circle-blur-expand {
            from { clip-path: circle(0% at ${cx}% ${cy}%); filter: blur(4px); }
            to   { clip-path: circle(150% at ${cx}% ${cy}%); filter: blur(0); }
          }
        }
      `;
    } else if (variant === 'gif' && url) {
      css = `
        @supports (view-transition-name: root) {
          ::view-transition-old(root) { animation: fade-out 0.4s ease-out; }
          ::view-transition-new(root) {
            animation: gif-reveal 2.5s cubic-bezier(0.4, 0, 0.2, 1);
            mask-image: url('${url}');
            mask-size: 0%;
            mask-repeat: no-repeat;
            mask-position: center;
          }
          @keyframes fade-out { to { opacity: 0; } }
          @keyframes gif-reveal {
            0%   { mask-size: 0%; }
            20%  { mask-size: 35%; }
            60%  { mask-size: 35%; }
            100% { mask-size: 300%; }
          }
        }
      `;
    } else if (variant === 'polygon') {
      css = `
        @supports (view-transition-name: root) {
          ::view-transition-old(root) { animation: none; }
          ::view-transition-new(root) {
            animation: ${theme === 'light' ? 'wipe-in-dark' : 'wipe-in-light'} 0.4s ease-out;
          }
          @keyframes wipe-in-dark {
            from { clip-path: polygon(0 0, 0 0, 0 100%, 0 100%); }
            to   { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
          }
          @keyframes wipe-in-light {
            from { clip-path: polygon(100% 0, 100% 0, 100% 100%, 100% 100%); }
            to   { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
          }
        }
      `;
    }

    if (css) {
      style.textContent = css;
      document.head.appendChild(style);
      setTimeout(() => document.getElementById(styleId)?.remove(), 3000);
    }

    if ('startViewTransition' in document) {
      const doc = document as Document & {
        startViewTransition: (callback: () => void) => { finished: Promise<void> };
      };
      doc.startViewTransition(() => setTheme(newTheme));
    } else {
      setTheme(newTheme);
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('user_settings')
          .update({ theme: newTheme })
          .eq('account_id', user.id)
          .then();
      }
    });
  }, [setTheme, variant, start, url, theme]);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip open={isOpen ? false : undefined}>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger
              className={cn(
                'relative overflow-hidden transition-all rounded-full',
                'inline-flex items-center justify-center',
                'text-muted-foreground hover:text-foreground hover:bg-accent',
                showLabel ? 'h-9 px-4 gap-2' : 'h-9 w-9',
                className
              )}
            >
              <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
              {showLabel && (
                <span className="text-sm">
                  {theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'}
                </span>
              )}
              <span className="sr-only">Toggle theme</span>
            </DropdownMenuTrigger>
          </TooltipTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleThemeChange('light'); }}>
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleThemeChange('dark'); }}>
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleThemeChange('system'); }}>
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <TooltipContent side="bottom" className="text-xs">
          Theme
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};