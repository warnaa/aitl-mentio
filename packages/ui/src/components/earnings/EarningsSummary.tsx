import { Card, CardContent, CardHeader, CardTitle } from "@mentio/ui/components/card";

export interface EarningsLine {
  /** e.g. "Price", "Mentio’s commission (20%)", "Your share". */
  term: string;
  /** Formatted by the app, e.g. "240 zł", "−48 zł". */
  amount: string;
}

export interface EarningsSummaryProps {
  /** An h2 under the page heading, e.g. "Your earnings" or "Earnings for this session". */
  title: string;
  /** e.g. "6 settled sessions" or "Mentee no-show — the session counts as held". */
  context?: string;
  /** R06: the mentee's price, minus Mentio's commission, equals the mentor's share. */
  price: EarningsLine;
  commission: EarningsLine;
  share: EarningsLine;
  /** D13: e.g. "Simulated — no money is paid out yet." */
  note?: string;
}

/**
 * What a mentor earned (E05-S01): price − commission = share, for one session or as totals.
 * Amounts and the commission rate come from the stored earning (R21), formatted by the app.
 */
export function EarningsSummary({ title, context, price, commission, share, note }: EarningsSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="mentio-earnings-body">
        {context && <p>{context}</p>}
        <dl className="mentio-earnings-lines">
          {[price, commission].map((line) => (
            <div key={line.term} className="mentio-earnings-line">
              <dt>{line.term}</dt>
              <dd>{line.amount}</dd>
            </div>
          ))}
          <div className="mentio-earnings-line mentio-earnings-share">
            <dt>{share.term}</dt>
            <dd>{share.amount}</dd>
          </div>
        </dl>
        {note && <p className="mentio-field-description">{note}</p>}
      </CardContent>
    </Card>
  );
}
