import { Braces, CodeXml } from 'lucide-react';
import { technologyIcons } from './technology-icons';

export interface TechnologyChipsProps {
  stacks: string[];
  label?: string;
}

export function TechnologyIcon({ stack }: { stack: string }) {
  const name = stack.trim().toLowerCase();
  const icon = technologyIcons.get(name);
  if (icon) return <svg className="dm-technology-icon dm-technology-brand" data-technology={icon.slug} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d={icon.path} /></svg>;
  if (name === 'api' || name === 'api design') return <Braces className="dm-technology-icon" aria-hidden="true" focusable="false" />;
  return <CodeXml className="dm-technology-icon" aria-hidden="true" focusable="false" />;
}

export function TechnologyChips({ stacks, label = 'Technology stacks' }: TechnologyChipsProps) {
  // A mentor may publish without technologies; an empty labelled list would still be announced.
  if (stacks.length === 0) return null;
  return <ul className="dm-product-tags dm-technology-chips" aria-label={label}>{stacks.map(stack => <li key={stack}><TechnologyIcon stack={stack} /><span>{stack}</span></li>)}</ul>;
}
