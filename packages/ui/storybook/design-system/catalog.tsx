import type { ReactNode } from 'react';
import { Unstyled } from '@storybook/addon-docs/blocks';
import { z } from 'zod';
import { Button } from '@mentio/ui/components/button';
import { Input } from '@mentio/ui/components/input';
import { Textarea } from '@mentio/ui/components/textarea';
import { Label } from '@mentio/ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mentio/ui/components/select';
import { Checkbox } from '@mentio/ui/components/checkbox';
import { RadioGroup, RadioGroupItem } from '@mentio/ui/components/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@mentio/ui/components/card';
import { Badge } from '@mentio/ui/components/badge';
import { Separator } from '@mentio/ui/components/separator';
import { Alert, AlertDescription, AlertTitle } from '@mentio/ui/components/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@mentio/ui/components/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@mentio/ui/components/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@mentio/ui/components/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@mentio/ui/components/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@mentio/ui/components/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@mentio/ui/components/table';
import { Skeleton } from '@mentio/ui/components/skeleton';
import { ActionButton, Link } from '@mentio/ui/backend/actions';
import { CrudForm, FormField } from '@mentio/ui/backend/forms';
import { DataTable } from '@mentio/ui/backend/tables';
import { EmptyState, ErrorMessage, LoadingMessage, StatusBadge } from '@mentio/ui/backend/feedback';
import { PanelShell } from '@mentio/ui/backend/layout';
import { AccountNav } from '@mentio/ui/components/auth/AccountNav';
import { AuthPanel } from '@mentio/ui/components/auth/AuthPanel';
import { MentorDirectory } from '@mentio/ui/components/mentors/MentorDirectory';
import { MentorProfile } from '@mentio/ui/components/mentors/MentorProfile';
import { MentorPageStatus } from '@mentio/ui/components/mentors/MentorPageStatus';
import { BookingSummary } from '@mentio/ui/components/bookings/BookingSummary';
import { Message } from '@mentio/ui/components/messages/Message';
import { MessageComposer } from '@mentio/ui/components/messages/MessageComposer';
import { EarningsSummary } from '@mentio/ui/components/earnings/EarningsSummary';
import { directoryItems, profile } from '../fixtures/mentors';
import { bookingFacts, bookingRows } from '../fixtures/bookings';
import { conversation } from '../fixtures/sessions';
import { earningTotals } from '../fixtures/earnings';
import { docsHref, inventory, type InventoryEntry } from './inventory';

// Documentation helpers (not package exports): the Start here table and the Components catalog.
// Every preview is the real package component with story data. Previews never call the network.
const done = async () => ({ ok: true as const, data: null, status: 200 });
const textOnly = 'The session takes place in text only — there is no video call.';

/** Page-level components own page landmarks (main, banner, regions); one more copy on a docs page would
 * duplicate them, so their thumbnails are inert: visible, but outside the accessibility tree and tab order. */
const Thumbnail = ({ children }: { children: ReactNode }) => <div inert className="ds-catalog-thumbnail">{children}</div>;

const previews: Record<string, ReactNode> = {
  Button: <div className="flex flex-wrap gap-within-group"><Button>Pay 240 zł</Button><Button variant="outline">Edit</Button></div>,
  Input: <Input aria-label="Rate per 25 minutes" defaultValue="120" />,
  Textarea: <Textarea aria-label="Your question" defaultValue="The ingress stopped responding after the upgrade." />,
  Label: <div className="flex items-center gap-within-group"><Checkbox id="catalog-label" /><Label htmlFor="catalog-label">Show me in the mentor list</Label></div>,
  Select: <Select><SelectTrigger aria-label="Session length"><SelectValue placeholder="Select a length" /></SelectTrigger><SelectContent><SelectItem value="25">25 minutes — 120 zł</SelectItem><SelectItem value="50">50 minutes — 240 zł</SelectItem></SelectContent></Select>,
  Checkbox: <div className="flex items-center gap-within-group"><Checkbox id="catalog-checkbox" defaultChecked /><Label htmlFor="catalog-checkbox">Listed</Label></div>,
  RadioGroup: <RadioGroup defaultValue="25" aria-label="Session length"><div className="flex items-center gap-within-group"><RadioGroupItem value="25" id="catalog-r25" /><Label htmlFor="catalog-r25">25 minutes — 120 zł</Label></div><div className="flex items-center gap-within-group"><RadioGroupItem value="50" id="catalog-r50" /><Label htmlFor="catalog-r50">50 minutes — 240 zł</Label></div></RadioGroup>,
  Card: <Card><CardHeader><CardTitle><span>Public work</span></CardTitle></CardHeader><CardContent><p>2 links</p></CardContent></Card>,
  Badge: <Badge variant="outline">Text only</Badge>,
  Separator: <div className="flex flex-col gap-within-group"><span>18:00</span><Separator /><span>19:30</span></div>,
  Alert: <Alert variant="destructive"><AlertTitle>This slot was just taken</AlertTitle><AlertDescription>Choose another time.</AlertDescription></Alert>,
  Dialog: <Dialog><DialogTrigger asChild><Button variant="outline">Open dialog</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Example dialog</DialogTitle><DialogDescription>A short focused task.</DialogDescription></DialogHeader></DialogContent></Dialog>,
  AlertDialog: <AlertDialog><AlertDialogTrigger asChild><Button variant="outline">Remove slot</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove the slot on 6 November at 18:00?</AlertDialogTitle><AlertDialogDescription>Mentees can no longer book it.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep slot</AlertDialogCancel><AlertDialogAction>Remove slot</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>,
  DropdownMenu: <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline">Page actions</Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem>Copy share link</DropdownMenuItem><DropdownMenuItem>View public page</DropdownMenuItem></DropdownMenuContent></DropdownMenu>,
  Popover: <Popover><PopoverTrigger asChild><Button variant="outline">Why can’t I book this time?</Button></PopoverTrigger><PopoverContent aria-label="Booking window"><p>Book from 2 hours to 14 days before the start.</p></PopoverContent></Popover>,
  Tooltip: <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="sm">Copy</Button></TooltipTrigger><TooltipContent>Copy share link</TooltipContent></Tooltip></TooltipProvider>,
  Table: <Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell className="tabular-nums">6 Nov, 18:00</TableCell><TableCell>Paid</TableCell></TableRow></TableBody></Table>,
  Skeleton: <div className="flex flex-col gap-within-group" aria-hidden="true"><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-56 max-w-full" /></div>,
  Link: <Link href="#/mentorzy/alex">Alex’s page</Link>,
  ActionButton: <ActionButton label="Publish page" pendingLabel="Publishing…" run={done} />,
  FormField: <FormField label="Rate per 25 minutes" description="From 90 to 600 zł." required><Input inputMode="numeric" defaultValue="120" /></FormField>,
  CrudForm: <CrudForm schema={z.object({ rate: z.string({ error: 'Enter your rate' }) })} fields={[{ name: 'rate', label: 'Rate per 25 minutes' }]} submitLabel="Save rate" initialValues={{ rate: '120' }} onSubmit={done} />,
  DataTable: <DataTable rows={bookingRows.slice(0, 2)} getRowId={row => row.id} columns={[{ id: 'time', header: 'Time', cell: row => row.time }, { id: 'status', header: 'Status', cell: row => <StatusBadge tone={row.tone} label={row.status} /> }]} />,
  StatusBadge: <div className="flex flex-wrap gap-within-group"><StatusBadge tone="waiting" label="Awaiting payment" /><StatusBadge tone="success" label="Accepted" /></div>,
  LoadingMessage: <LoadingMessage label="Loading your bookings…" />,
  ErrorMessage: <ErrorMessage title="We could not load your bookings" message="Check your connection, then try again." onRetry={() => undefined} />,
  EmptyState: <EmptyState title="You have no bookings yet" description="When you book a text session, it appears here." />,
  PanelShell: <Thumbnail><PanelShell title="Mentio" homeHref="#/rezerwacje" navLabel="Bookings" skipLabel="Skip to content" currentHref="#/rezerwacje" items={[{ href: '#/rezerwacje', label: 'My bookings' }]}><p>Content</p></PanelShell></Thumbnail>,
  AccountNav: <Thumbnail><AccountNav brand={{ href: '#/', label: 'Mentio' }} navLabel="Account" signedIn={false} signIn={{ href: '#/logowanie', label: 'Sign in' }} signUp={{ href: '#/rejestracja', label: 'Create account' }} /></Thumbnail>,
  AuthPanel: <Thumbnail><AuthPanel title="Sign in"><Button>Sign in</Button></AuthPanel></Thumbnail>,
  MentorDirectory: <Thumbnail><MentorDirectory heading="Mentors" items={directoryItems.slice(0, 2)} emptyText="" /></Thumbnail>,
  MentorProfile: <Thumbnail><MentorProfile {...profile} work={{ ...profile.work, links: profile.work.links.slice(0, 1) }} /></Thumbnail>,
  MentorPageStatus: <MentorPageStatus heading="Your page" statusLabel="Published" statusTone="success" shareLabel="Share link" shareUrl="https://mentio.example/mentorzy/alex" copyLabel="Copy link" copiedLabel="Copied" copyFailedLabel="Select the link and copy it manually" action={<ActionButton label="Unpublish page" variant="outline" pendingLabel="Unpublishing…" run={done} />} />,
  BookingSummary: <BookingSummary title="Booking with Alex" status={{ tone: 'waiting', label: 'Awaiting payment' }} facts={bookingFacts.slice(1, 4)} textOnlyNote={textOnly} />,
  Message: <ol className="mentio-conversation"><li><Message {...conversation[3]} id="catalog-message" /></li></ol>,
  MessageComposer: <MessageComposer label="Your message" sendLabel="Send" pendingLabel="Sending…" emptyError="Write a message first" onSend={done} />,
  EarningsSummary: <EarningsSummary title="Your earnings" {...earningTotals} />,
};

const DocsLink = ({ entry }: { entry: InventoryEntry }) => <a href={docsHref(entry.docsId)} target="_top">{entry.name}</a>;

/** Components page: a small working preview, group, one sentence and a link per component. */
export function ComponentCatalog() {
  return <table className="ds-table ds-names ds-catalog">
    <thead><tr><th>Component</th><th>Preview</th><th>Group</th><th>What it is for</th></tr></thead>
    <tbody>{inventory.map(entry => <tr key={entry.name}>
      <td data-label="Component"><DocsLink entry={entry} /></td>
      <td data-label="Preview" className="ds-catalog-preview"><Unstyled>{previews[entry.name]}</Unstyled></td>
      <td data-label="Group">{entry.area ? `${entry.group} — ${entry.area}` : entry.group}</td>
      <td data-label="What it is for">{entry.purpose}</td>
    </tr>)}</tbody>
  </table>;
}

/** Start here: every component with its import, when to use it and when not. */
export function InventoryTable() {
  return <table className="ds-table ds-names">
    <thead><tr><th>Component</th><th>Import</th><th>Use when</th><th>Do not use when</th></tr></thead>
    <tbody>{inventory.map(entry => <tr key={entry.name}>
      <td data-label="Component"><DocsLink entry={entry} /></td><td data-label="Import"><code>{entry.importLine}</code></td><td data-label="Use when">{entry.when}</td><td data-label="Do not use when">{entry.whenNot}</td>
    </tr>)}</tbody>
  </table>;
}

export const inventoryNames = inventory.map(entry => entry.name);
export const previewNames = Object.keys(previews);
