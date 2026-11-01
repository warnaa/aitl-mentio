import type { StatusTone } from '@mentio/ui/backend/feedback';

// Fictional, realistic rows for `/rezerwacje` (book-and-pay UI/UX): time, mentor, status, link.
// Labels are English story copy; the app's Polish map is built by the E02 feature PR.
export interface BookingRow { id: string; time: string; mentor: string; status: string; tone: StatusTone }

export const bookingRows: BookingRow[] = [
  { id: 'b1', time: '6 November 2026, 18:00', mentor: 'Alex', status: 'Awaiting payment', tone: 'waiting' },
  { id: 'b2', time: '4 November 2026, 09:30', mentor: 'Marta', status: 'Awaiting mentor decision', tone: 'waiting' },
  { id: 'b3', time: '3 November 2026, 17:00', mentor: 'Piotr', status: 'Cancelled — refunded', tone: 'neutral' },
  { id: 'b4', time: '28 October 2026, 19:00', mentor: 'Alex', status: 'Payment declined', tone: 'danger' },
  { id: 'b5', time: '21 October 2026, 08:00', mentor: 'Ola', status: 'Expired', tone: 'neutral' },
];

/** 45 rows for pagination stories, newest first. */
export const manyBookingRows: BookingRow[] = Array.from({ length: 45 }, (_, index) => {
  const base = bookingRows[index % bookingRows.length];
  return { ...base, id: `p${index + 1}`, time: `${String(30 - (index % 28)).padStart(2, '0')} ${index < 28 ? 'October' : 'September'} 2026, ${String(8 + (index % 12)).padStart(2, '0')}:00` };
});

// Book-and-pay UI/UX: status, mentor, time, length, price, full question (pre-wrapped, monospace), N01.
export const bookingFacts = [
  { term: 'Mentor', detail: 'Alex' },
  { term: 'Time', detail: 'Thursday, 6 November, 18:00 (Warsaw time)' },
  { term: 'Length', detail: '50 minutes' },
  { term: 'Price', detail: '240 zł' },
];
export const bookingQuestion = `The ingress stopped responding after the cluster upgrade.

kubectl -n ingress-nginx logs deploy/ingress-nginx-controller --since=1h
W1031 18:02:11 controller.go:1214 Service "shop/api" does not have any active Endpoint

What I checked: the pods are Running and the Service selector matches.`;
