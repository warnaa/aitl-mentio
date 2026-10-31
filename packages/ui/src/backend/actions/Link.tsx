import type { ComponentProps } from 'react';
import { cn } from '@mentio/ui/lib/utils';

export type LinkProps = ComponentProps<'a'> & { href: string };

/** Navigation keeps native anchor semantics; actions use Button. */
export function Link({ className, ...props }: LinkProps) {
  return <a data-slot="link" className={cn('mentio-link', className)} {...props} />;
}
