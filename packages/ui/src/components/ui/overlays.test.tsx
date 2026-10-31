// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle } from './alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from './dropdown-menu';
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from './popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
afterEach(cleanup);

it('alert announces by default and lets static notices opt out', () => {
  render(<><Alert variant="destructive"><AlertTitle>Payment declined</AlertTitle><AlertDescription>No money was taken.</AlertDescription></Alert><Alert role="note"><AlertTitle>Simulated payment</AlertTitle></Alert></>);
  const alert = screen.getByRole('alert');
  expect(alert.className).toBe('mentio-alert mentio-alert-destructive');
  expect(screen.getByRole('note').className).toBe('mentio-alert mentio-alert-default');
  expect(screen.getByText('Payment declined').className).toBe('mentio-alert-title');
});

it('dialog uses the token surface and a named 32px ghost close button', () => {
  render(<Dialog defaultOpen><DialogContent><DialogHeader><DialogTitle>How a text session works</DialogTitle><DialogDescription>Text only.</DialogDescription></DialogHeader><DialogFooter showCloseButton /></DialogContent></Dialog>);
  const dialog = screen.getByRole('dialog', { name: 'How a text session works' });
  expect(dialog.className).toBe('mentio-dialog');
  const close = screen.getAllByRole('button', { name: 'Close' });
  expect(close).toHaveLength(2);
  const icon = close.find(button => button.className.includes('mentio-dialog-close'))!;
  expect(icon.className).toContain('mentio-button-ghost');
  expect(icon.className).toContain('mentio-button-icon-sm');
  expect(close.find(button => button !== icon)!.className).toContain('mentio-button-outline');
  expect(document.querySelector('[data-slot=dialog-overlay]')!.className).toBe('mentio-overlay');
});

it('dialog can omit its close button', () => {
  render(<Dialog defaultOpen><DialogContent showCloseButton={false}><DialogTitle>Rules</DialogTitle><DialogDescription>Text only.</DialogDescription></DialogContent></Dialog>);
  expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
});

it('alert dialog has one size and keeps button variants on its actions', () => {
  render(<AlertDialog defaultOpen><AlertDialogContent><AlertDialogHeader><AlertDialogMedia /><AlertDialogTitle>Remove the slot?</AlertDialogTitle><AlertDialogDescription>Mentees will no longer see it.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep slot</AlertDialogCancel><AlertDialogAction variant="destructive">Remove slot</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>);
  const dialog = screen.getByRole('alertdialog', { name: 'Remove the slot?' });
  expect(dialog.hasAttribute('data-size')).toBe(false);
  expect(dialog.className).toBe('mentio-dialog');
  expect(screen.getByRole('button', { name: 'Keep slot' }).className).toContain('mentio-button-outline');
  expect(screen.getByRole('button', { name: 'Remove slot' }).className).toContain('mentio-button-destructive');
  expect(document.querySelector('[data-slot=alert-dialog-media]')!.className).toBe('mentio-alert-dialog-media');
});

it('dropdown menu exposes token rows and the destructive variant', () => {
  render(<DropdownMenu defaultOpen modal={false}><DropdownMenuTrigger>Page actions</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuLabel inset>Your page</DropdownMenuLabel><DropdownMenuItem>Copy share link<DropdownMenuShortcut>C</DropdownMenuShortcut></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive">Remove slot</DropdownMenuItem></DropdownMenuContent></DropdownMenu>);
  const remove = screen.getByRole('menuitem', { name: 'Remove slot' });
  expect(remove.dataset.variant).toBe('destructive');
  expect(remove.className).toBe('mentio-menu-item');
  expect(screen.getByRole('menu').className).toBe('mentio-menu-content');
  expect(screen.getByText('Your page').dataset.inset).toBe('true');
});

it('popover and tooltip use their token surfaces', () => {
  // Floating positioning measures its anchor; jsdom has no ResizeObserver.
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  render(<TooltipProvider><Popover defaultOpen><PopoverTrigger>Share</PopoverTrigger><PopoverContent aria-labelledby="t"><PopoverHeader><PopoverTitle id="t">Share link</PopoverTitle><PopoverDescription>Copy it.</PopoverDescription></PopoverHeader></PopoverContent></Popover>
    <Tooltip defaultOpen><TooltipTrigger>Copy</TooltipTrigger><TooltipContent>Copy share link</TooltipContent></Tooltip></TooltipProvider>);
  expect(screen.getByRole('dialog', { name: 'Share link' }).className).toBe('mentio-popover');
  expect(screen.getByRole('tooltip')).toHaveProperty('textContent', 'Copy share link');
  expect(document.querySelector('[data-slot=tooltip-content]')!.className).toBe('mentio-tooltip');
});
