import type { ButtonHTMLAttributes, Ref } from 'react';
import type { LucideIcon } from 'lucide-react';

type Size = 'sm' | 'md' | 'lg';
type Variant = 'ghost' | 'solid';

interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'children'
> {
  /** Accessible name and tooltip: icon-only buttons always need one */
  label: string;
  icon: LucideIcon;
  size?: Size;
  variant?: Variant;
  /** For toggles (shuffle, repeat): rendered as aria-pressed */
  isPressed?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

const SIZES: Record<Size, string> = {
  sm: 'size-7 [&_svg]:size-4',
  md: 'size-9 [&_svg]:size-5',
  lg: 'size-11 [&_svg]:size-5',
};

const VARIANTS: Record<Variant, string> = {
  ghost: 'enabled:hover:bg-raised',
  solid: 'bg-accent text-canvas enabled:hover:opacity-90 [&_svg]:fill-current',
};

export const IconButton = ({
  label,
  icon: Icon,
  size = 'md',
  variant = 'ghost',
  isPressed,
  className = '',
  type = 'button',
  ...props
}: IconButtonProps) => (
  <button
    type={type}
    aria-label={label}
    title={label}
    aria-pressed={isPressed}
    className={`no-drag inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full transition disabled:cursor-default disabled:opacity-40 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
    {...props}
  >
    <Icon aria-hidden="true" strokeWidth={1.75} />
  </button>
);
