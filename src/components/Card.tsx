import { HTMLAttributes, forwardRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'outline';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800',
      glass: 'bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-neutral-200 dark:border-white/10 shadow-xl shadow-black/5 dark:shadow-2xl dark:shadow-black/50',
      outline: 'border border-neutral-200 dark:border-neutral-800',
    };

    return (
      <div
        ref={ref}
        className={cn('rounded-2xl p-4', variants[variant], className)}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

export { Card };
