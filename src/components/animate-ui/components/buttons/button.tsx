'use client';

import { cva, type VariantProps } from 'class-variance-authority';

import {
  Button as ButtonPrimitive,
  type ButtonProps as ButtonPrimitiveProps,
} from '@/components/animate-ui/primitives/buttons/button';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[box-shadow,_color,_background-color,_border-color,_outline-color,_text-decoration-color,_fill,_stroke] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        accent:
          'bg-accent text-accent-foreground shadow-xs hover:bg-accent/90',
        destructive:
          'border-2 border-destructive bg-destructive/80 text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/10 dark:text-destructive dark:border-destructive/30 dark:hover:bg-destructive/20 dark:hover:border-destructive/50 dark:focus-visible:ring-destructive/20',
        success:
          'border-2 border-success bg-success/80 text-white shadow-xs hover:bg-success/90 focus-visible:ring-success/20 dark:bg-success/10 dark:text-success dark:border-success/30 dark:hover:bg-success/20 dark:hover:border-success/50 dark:focus-visible:ring-success/20',
        pending:
          'border-2 border-pending bg-pending/80 text-white shadow-xs hover:bg-pending/90 focus-visible:ring-pending/20 dark:bg-pending/10 dark:text-pending dark:border-pending/30 dark:hover:bg-pending/20 dark:hover:border-pending/50 dark:focus-visible:ring-pending/20',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        'outline-success':
          'border border-success/30 bg-success/5 text-success shadow-xs hover:bg-success/10 hover:border-success/50 focus-visible:ring-success/20',
        'outline-destructive':
          'border border-destructive/30 bg-destructive/5 text-destructive shadow-xs hover:bg-destructive/10 hover:border-destructive/50 focus-visible:ring-destructive/20',
        'outline-pending':
          'border border-pending/30 bg-pending/5 text-pending shadow-xs hover:bg-pending/10 hover:border-pending/50 focus-visible:ring-pending/20',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link:
          'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8 rounded-md',
        'icon-lg': 'size-10 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type ButtonProps = ButtonPrimitiveProps & VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants, type ButtonProps };