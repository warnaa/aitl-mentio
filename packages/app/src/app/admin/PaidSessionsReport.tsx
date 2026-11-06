'use client';
import { Button, Card } from '@devmentor/ui';
import { EmptyState, ResourcePanel, useApiResource } from '@devmentor/ui/backend';
import type { PaidSessionReport } from '@devmentor/core/services';

function WeekCounts({ title, rows }: { title: string; rows: PaidSessionReport['bookingWeeks'] }) {
  return <Card className="dm-product-panel min-w-0">
    <h3 className="dm-product-title">{title}</h3>
    {rows.length === 0 ? <p>No recorded paid sessions in this view.</p> : <table className="w-full text-left">
      <caption className="sr-only">{title}</caption>
      <thead><tr><th scope="col">Week beginning</th><th scope="col" className="text-right">Sessions</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.week}><th scope="row" className="py-2 font-normal">{row.week}</th><td className="text-right">{row.count}</td></tr>)}</tbody>
    </table>}
  </Card>;
}

export function PaidSessionsReport() {
  const resource = useApiResource<PaidSessionReport>('/api/payments/report');
  return <section className="dm-product-stack" aria-label="Paid session report">
    <div className="dm-product-row"><h2 className="dm-product-title">Recorded paid sessions</h2><Button type="button" intent="neutral" appearance="stroke" disabled={resource.loading} onClick={resource.reload}>Refresh paid session report</Button></div>
    <ResourcePanel resource={resource}>{report => <>
      <p className="dm-product-muted">Payments recorded since {report.cohortStart}, covering twelve booking weeks in {report.timezone}. The current booking week is partial.</p>
      <p>Recorded paid sessions: <strong>{report.paidSessionCount}</strong></p>
      <p>Median booking-to-start: <strong>{report.medianBookingToStartMinutes === null ? 'Not available' : `${report.medianBookingToStartMinutes.toLocaleString('en-US', { maximumFractionDigits: 1 })} minutes`}</strong> ({report.timingSampleCount} sessions with valid timing).</p>
      {report.paidSessionCount === 0 && <EmptyState title="No recorded payments yet" description="Verified full payments will appear here once a booking is confirmed." />}
      <div className="grid min-w-0 gap-6 lg:grid-cols-2"><WeekCounts title="By booking week" rows={report.bookingWeeks} /><WeekCounts title="By session-start week" rows={report.sessionStartWeeks} /></div>
      <p className="dm-product-caption">Both views use the same recorded payments; the session-start view can include future weeks. These are recorded full payments, with refunds not subtracted. Neither week definition has been selected as the official target.</p>
    </>}</ResourcePanel>
  </section>;
}
