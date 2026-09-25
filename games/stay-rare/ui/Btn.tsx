import type { ButtonHTMLAttributes } from 'react';

/** rarefriends.com bracket button. Brackets are aria-hidden so the accessible name is just the label. */
export function Btn({ children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`sr-btn${className ? ` ${className}` : ''}`} {...rest}>
    <span aria-hidden="true">[ </span>{children}<span aria-hidden="true"> ]</span>
  </button>;
}
