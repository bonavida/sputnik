import type { ButtonHTMLAttributes, Ref } from 'react';
import type { LucideIcon } from 'lucide-react';

type Size = 'sm' | 'md' | 'lg';

interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'children'
> {
  /** Accessible name and tooltip: icon-only buttons always need one */
  label: string;
  icon: LucideIcon;
  size?: Size;
  /** For toggles (shuffle, repeat): rendered as aria-pressed */
  isPressed?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

const SIZES: Record<Size, string> = {
  sm: 'size-7 [&_svg]:size-4',
  md: 'size-9 [&_svg]:size-5',
  lg: 'size-11 [&_svg]:size-5',
};

export const IconButton = ({
  label,
  icon: Icon,
  size = 'md',
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
    className={`no-drag inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-raised ${SIZES[size]} ${className}`}
    {...props}
  >
    <Icon aria-hidden="true" strokeWidth={1.75} />
  </button>
);
