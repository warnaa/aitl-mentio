'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { MentorDirectory } from '@devmentor/ui/components/mentors/MentorProfileCard';

export interface MentorListFilterProps {
  /** Stack tag options from core's vocabulary; ui must not import core, so the page passes them. */
  options: readonly { value: string; label: string }[];
  selected: string | null;
  resultCount: number;
  empty: ReactNode;
  children: ReactNode;
}

/** The design system's stack filter, driven by the `?tag=` URL so a filtered list can be shared. */
export function MentorListFilter({ options, selected, resultCount, empty, children }: MentorListFilterProps) {
  const router = useRouter();
  const labelOf = (value: string | null) => options.find(option => option.value === value)?.label ?? null;
  return <MentorDirectory stacks={options.map(option => option.label)} selectedStack={labelOf(selected)} resultCount={resultCount} empty={empty}
    onStackChange={label => {
      const value = options.find(option => option.label === label)?.value;
      router.push(value ? `/mentors?tag=${encodeURIComponent(value)}` : '/mentors');
    }}>
    {children}
  </MentorDirectory>;
}
