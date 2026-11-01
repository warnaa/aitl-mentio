// Fictional `MentorEarning` rows for Alex (book-and-pay spec: price, commission, share, reason), as
// the app would format them. The rate was 100 zł per 25 minutes before 25 October and 120 zł after;
// each row keeps the price and the 20% commission stored when its payment started (R21).
export interface EarningRow { id: string; session: string; length: string; outcome: string; price: string; commission: string; share: string }

export const earningRows: EarningRow[] = [
  { id: 'e1', session: '4 Nov, 18:00', length: '50 min', outcome: 'Session held', price: '240 zł', commission: '−48 zł', share: '192 zł' },
  { id: 'e2', session: '3 Nov, 09:30', length: '25 min', outcome: 'Session held', price: '120 zł', commission: '−24 zł', share: '96 zł' },
  { id: 'e3', session: '31 Oct, 19:00', length: '50 min', outcome: 'Mentee no-show', price: '240 zł', commission: '−48 zł', share: '192 zł' },
  { id: 'e4', session: '29 Oct, 17:00', length: '25 min', outcome: 'Late cancellation', price: '120 zł', commission: '−24 zł', share: '96 zł' },
  { id: 'e5', session: '22 Oct, 18:00', length: '25 min', outcome: 'Session held', price: '100 zł', commission: '−20 zł', share: '80 zł' },
  { id: 'e6', session: '20 Oct, 08:00', length: '50 min', outcome: 'Session held', price: '200 zł', commission: '−40 zł', share: '160 zł' },
];

/** Totals of `earningRows`: 1,020 − 204 = 816. */
export const earningTotals = {
  price: { term: 'Paid by mentees', amount: '1,020 zł' },
  commission: { term: 'Mentio’s commission (20%)', amount: '−204 zł' },
  share: { term: 'Your share', amount: '816 zł' },
};

/** 45 rows for pagination, newest first; amounts follow the 120 zł rate. */
export const manyEarningRows: EarningRow[] = Array.from({ length: 45 }, (_, index) => {
  const long = index % 3 === 0;
  return {
    id: `p${index + 1}`,
    session: `${30 - (index % 28)} ${index < 28 ? 'Oct' : 'Sep'}, ${String(8 + (index % 12)).padStart(2, '0')}:00`,
    length: long ? '50 min' : '25 min', outcome: index % 7 === 3 ? 'Mentee no-show' : 'Session held',
    price: long ? '240 zł' : '120 zł', commission: long ? '−48 zł' : '−24 zł', share: long ? '192 zł' : '96 zł',
  };
});
