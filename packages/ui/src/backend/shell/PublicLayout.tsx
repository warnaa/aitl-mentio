import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface PublicLayoutProps {
  /** Header links and actions, rendered by the host (it knows routes and the session). */
  navigation: ReactNode;
  children: ReactNode;
  /** Replaces the default footer, e.g. the homepage's dark footer. */
  footer?: ReactNode;
  /** Where the wordmark leads. */
  homeHref?: string;
  /** A page variant, e.g. `dm-public-landing` for the full-width homepage. */
  className?: string;
}

/** Public pages: the wordmark header, the page and a footer (prototype `PublicPage`). */
export function PublicLayout({ navigation, children, footer, homeHref = '/', className }: PublicLayoutProps) {
  return <div className={cn('dm-public', className)}>
    <header className="dm-public-header">
      <a className="dm-public-wordmark" href={homeHref}>DevMentor<span aria-hidden="true">✦</span></a>
      <nav aria-label="Main navigation">{navigation}</nav>
    </header>
    <main className="dm-public-main">{children}</main>
    <footer className="dm-public-footer">{footer ?? <>
      <span>Get coding help from a mentor.</span>
      <span className="dm-meta-group"><span>Text sessions</span><span>Written answers</span><span>Private notes</span></span>
    </>}</footer>
  </div>;
}
