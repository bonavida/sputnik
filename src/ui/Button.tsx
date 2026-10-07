import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-fg text-canvas hover:opacity-90',
  secondary: 'border border-line hover:bg-raised',
  ghost: 'hover:bg-raised',
};

export const Button = ({
  variant = 'secondary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) => (
  <button
    type={type}
    className={`no-drag inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition ${VARIANTS[variant]} ${className}`}
    {...props}
  />
);
