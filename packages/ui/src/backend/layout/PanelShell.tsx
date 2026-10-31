import type { ComponentType, ReactNode } from "react";

export interface PanelNavItem {
  href: string;
  label: string;
}

export interface PanelLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  "aria-current"?: "page";
}

export interface PanelShellProps {
  /** Product area name, e.g. "Mentio — mentor". */
  title: string;
  homeHref: string;
  items: PanelNavItem[];
  currentHref?: string;
  /** Accessible name of the task navigation. */
  navLabel: string;
  /** Visible on keyboard focus; skips the navigation (WCAG 2.4.1). */
  skipLabel: string;
  /** The app passes `next/link`; `ui` cannot import Next. Defaults to a plain anchor. */
  linkComponent?: ComponentType<PanelLinkProps>;
  /** Header content on the right, e.g. the sign-out action. */
  actions?: ReactNode;
  children: ReactNode;
}

function Anchor({ href, className, children, ...rest }: PanelLinkProps) {
  return (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  );
}

/**
 * F8: the panel shell for signed-in task screens. R02.6: task navigation is separate
 * from the content and limited to the current area; Q3: a compact navigation row above
 * the content up to tablet widths (768 px), a separate sidebar on wide screens (1024 px+).
 */
export function PanelShell({ title, homeHref, items, currentHref, navLabel, skipLabel, linkComponent: LinkComponent = Anchor, actions, children }: PanelShellProps) {
  const mainId = "panel-main";
  return (
    <div className="mentio-panel">
      <a href={`#${mainId}`} className="mentio-skip-link">
        {skipLabel}
      </a>
      <aside className="mentio-panel-sidebar">
        <LinkComponent href={homeHref} className="mentio-panel-title">
          {title}
        </LinkComponent>
        <nav aria-label={navLabel} className="mentio-panel-nav">
          <ul>
            {items.map((item) => (
              <li key={item.href}>
                <LinkComponent href={item.href} className="mentio-panel-nav-link" aria-current={item.href === currentHref ? "page" : undefined}>
                  {item.label}
                </LinkComponent>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="mentio-panel-body">
        {actions && <header className="mentio-panel-header">{actions}</header>}
        <main id={mainId} tabIndex={-1} className="mentio-panel-main">
          {children}
        </main>
      </div>
    </div>
  );
}
