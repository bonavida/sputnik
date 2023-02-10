import { ButtonHTMLAttributes } from 'react';
/** Styles */
import './Button.scss';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  type?: 'submit' | 'button';
  className?: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

const Button = ({
  type,
  children,
  className,
  disabled = false,
  onClick,
}: ButtonProps) => {
  return (
    <button
      className={`button ${className ?? ''}`}
      type={type}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

Button.defaultProps = {
  type: 'button',
  className: '',
  onClick: () => '',
};

export default Button;
