import { isValidElement, type ReactElement, type ReactNode } from 'react';

/*
 * Test support for server components, which AGENTS.md says to test by invoking them
 * and asserting the returned element tree, with no DOM and no renderer. Nested
 * components stay unexpanded (`<AuthLayout>` is an element whose `children` prop holds
 * the form), so these helpers walk element props — `children` and any other prop that
 * holds elements, such as a `footer` or `nav` slot — in document order.
 */

type AnyElement = ReactElement<Record<string, unknown>>;

function* walk(node: unknown): Generator<AnyElement> {
  if (Array.isArray(node)) {
    for (const child of node) {
      yield* walk(child);
    }
    return;
  }
  if (!isValidElement(node)) {
    return;
  }
  const element = node as AnyElement;
  yield element;
  for (const value of Object.values(element.props)) {
    yield* walk(value);
  }
}

/** Every element in `tree` matching `predicate`, in document order. */
export function findAll(tree: ReactNode, predicate: (element: AnyElement) => boolean): AnyElement[] {
  return [...walk(tree)].filter(predicate);
}

/** Every element of `type` (a tag name or a component function). */
export function findAllByType(tree: ReactNode, type: unknown): AnyElement[] {
  return findAll(tree, (element) => element.type === type);
}

/** The only element of `type`; throws when there is none or more than one. */
export function findByType(tree: ReactNode, type: unknown): AnyElement {
  const found = findAllByType(tree, type);
  if (found.length !== 1) {
    throw new Error(`expected exactly one ${String((type as { name?: string }).name ?? type)}, found ${found.length}`);
  }
  return found[0]!;
}

/** The text a node renders directly (strings and numbers in `children`, recursively). */
export function textOf(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(textOf).join('');
  }
  if (isValidElement(node)) {
    return textOf((node as AnyElement).props.children);
  }
  return '';
}

/** The position of `element` in `tree`'s document order. */
export function orderOf(tree: ReactNode, element: AnyElement): number {
  return [...walk(tree)].indexOf(element);
}
