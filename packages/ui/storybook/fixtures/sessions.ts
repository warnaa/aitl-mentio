import type { StatusTone } from '@mentio/ui/backend/feedback';
import type { MessageProps } from '@mentio/ui/components/messages/Message';
import { bookingQuestion } from './bookings';

// Fictional session between Kasia (mentee) and Alex (mentor) on the E02 ingress question.
// English story copy; times are Warsaw time, as the app's F7 helpers would format them.
export type SessionMessage = Omit<MessageProps, 'reply'>;

export const questionMessage: SessionMessage = {
  id: 'message-1', author: 'Kasia', role: 'Question sent with the booking', dateTime: '2026-11-05T16:12:00Z', time: '5 November, 17:12', body: bookingQuestion, preformatted: true,
};

export const conversation: SessionMessage[] = [
  questionMessage,
  { id: 'message-2', author: 'Alex', role: 'Mentor', dateTime: '2026-11-06T17:02:00Z', time: '18:02',
    body: 'Hi Kasia, I read your logs. The warning means the Service has no endpoints, so the ingress has nowhere to send traffic. Can you paste the output of these two?\n```\nkubectl -n shop get endpoints api -o wide\nkubectl -n shop get pods -l app=api --show-labels\n```' },
  { id: 'message-3', author: 'Kasia', role: 'Mentee', dateTime: '2026-11-06T17:06:00Z', time: '18:06',
    replyTo: { author: 'Alex', excerpt: 'Can you paste the output of these two?', href: '#message-2', goToLabel: 'Go to Alex’s message' },
    body: '```\nNAME   ENDPOINTS   AGE\napi    <none>      41d\n```\nThe second command returns nothing. The pods have `app.kubernetes.io/name=api`, not `app=api`.' },
  { id: 'message-4', author: 'Alex', role: 'Mentor', dateTime: '2026-11-06T17:09:00Z', time: '18:09',
    replyTo: { author: 'Kasia', excerpt: 'The pods have app.kubernetes.io/name=api, not app=api.', href: '#message-3', goToLabel: 'Go to Kasia’s message' },
    body: 'That is it. The chart upgrade renamed the pod labels, but the Service selector in `values.production.yaml` still uses `app: api`. Change it to `app.kubernetes.io/name: api` and run the upgrade again.' },
];

export const sentReply = 'Endpoints are back and the ingress responds. Thank you!';

export const longCodeMessage: SessionMessage = {
  id: 'message-5', author: 'Kasia', role: 'Mentee', dateTime: '2026-11-06T17:14:00Z', time: '18:14',
  body: 'Here is the full rendered Service, in case something else is wrong:\n```yaml\napiVersion: v1\nkind: Service\nmetadata:\n  name: api\n  namespace: shop\n  annotations:\n    meta.helm.sh/release-name: shop\n    service.beta.kubernetes.io/aws-load-balancer-healthcheck-path: /internal/health/readiness-with-a-very-long-path-segment\nspec:\n  selector:\n    app.kubernetes.io/name: api\n  ports:\n    - port: 80\n      targetPort: 8080\n```\nhelm upgrade --install shop ./charts/shop --namespace shop --values values.production.yaml --set image.tag=2026.10.31-build.4812 --atomic --timeout 10m0s',
};

// Mentor's `/mentor/sesje` rows (route decided by the user 2026-11-01; no E03 spec yet).
export interface MentorSessionRow { id: string; time: string; mentee: string; length: string; status: string; tone: StatusTone }
export const mentorSessionRows: MentorSessionRow[] = [
  { id: 'b2', time: '6 Nov, 18:00', mentee: 'Kasia', length: '50 min', status: 'Awaiting your decision', tone: 'waiting' },
  { id: 'b6', time: '7 Nov, 09:30', mentee: 'Tomek', length: '25 min', status: 'Awaiting your decision', tone: 'waiting' },
  { id: 'b7', time: '8 Nov, 19:30', mentee: 'Ewa', length: '25 min', status: 'Accepted', tone: 'success' },
  { id: 'b8', time: '4 Nov, 18:00', mentee: 'Michał', length: '50 min', status: 'Declined — refunded', tone: 'neutral' },
  { id: 'b9', time: '3 Nov, 09:30', mentee: 'Ola', length: '25 min', status: 'Not accepted in time — refunded', tone: 'neutral' },
  { id: 'b10', time: '31 Oct, 19:00', mentee: 'Kuba', length: '50 min', status: 'Mentee no-show — you are paid', tone: 'neutral' },
];
