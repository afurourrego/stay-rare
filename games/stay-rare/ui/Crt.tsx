import type { ButtonHTMLAttributes, ReactNode } from 'react';

/** Full-size pixel CRT used by Level up!, Paused and Run log. `screen` content sits on the ink screen. */
export function Crt({ title, titleId, reducedMotion, children, footer, modal = true }: { title: string; titleId: string; reducedMotion: boolean; children: ReactNode; footer?: ReactNode; modal?: boolean }) {
  return <div className={`sr-crt${reducedMotion ? ' sr-still' : ''}`} role={modal ? 'dialog' : 'region'} aria-modal={modal || undefined} aria-labelledby={titleId}>
    <div className="sr-crt-head"><h2 id={titleId}>{title}</h2><span className="sr-crt-led" aria-hidden="true" /></div>
    <div className="sr-crt-screen">{children}</div>
    {footer}
    <div className="sr-crt-base" aria-hidden="true" />
  </div>;
}

/** Console option: "> LABEL" with a blinking cursor on focus/hover; the accessible name is just the label. */
export function ConsoleBtn({ children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`sr-console-btn${className ? ` ${className}` : ''}`} {...rest}>
    <span aria-hidden="true">&gt; </span>{children}<span className="sr-cursor" aria-hidden="true">_</span>
  </button>;
}

/** A console line typed in after `delay` ms (CSS steps). */
export function TypedLine({ children, delay, className }: { children: ReactNode; delay: number; className?: string }) {
  return <p className={`sr-crt-log${className ? ` ${className}` : ''}`} style={{ animationDelay: `${delay}ms` }}>{children}</p>;
}
