import { useEffect, useState } from 'react';
import { Check, Clock, ExternalLink, MessageSquare } from 'lucide-react';
import { Portal } from 'radix-ui';
import { Button } from '@mentio/ui/components/button';
import { Input } from '@mentio/ui/components/input';
import { apiCall } from '@mentio/ui/backend/api';
import { Label } from '@mentio/ui/components/label';
import './foundations.css';

type Color = [number, number, number];
type Pair = { theme: string; foreground: string; background: string; ratio: number; threshold: number };
const surfaces = ['background', 'card', 'popover', 'muted', 'secondary', 'accent', 'sidebar'];
const texts = ['foreground', 'muted-foreground', 'primary', 'destructive'];

function luminance(color: Color) {
  const linear = color.map(value => { const v = value / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
function ratio(a: Color, b: Color) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

/** Measure actual CSS, including browser-composited alpha, as sRGB pixels. */
function measureColors(): Pair[] {
  const root = document.documentElement;
  const originalDark = root.classList.contains('dark');
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('The contrast table needs a browser canvas.');
  const probe = document.createElement('span');
  probe.hidden = true;
  document.body.append(probe);
  const results: Pair[] = [];
  try {
    for (const theme of ['light', 'dark']) {
      root.classList.toggle('dark', theme === 'dark');
      const readColor = (token: string, base?: string): Color => {
        const paint = (name: string) => { probe.style.color = `var(--${name})`; context.fillStyle = getComputedStyle(probe).color; context.fillRect(0, 0, 1, 1); };
        context.clearRect(0, 0, 1, 1);
        if (base) paint(base);
        paint(token);
        const data = context.getImageData(0, 0, 1, 1).data;
        return [data[0], data[1], data[2]];
      };
      const add = (foreground: string, background: string, threshold = 4.5, base?: string) => {
        results.push({ theme, foreground, background: base ? `${background} on ${base}` : background, ratio: ratio(readColor(foreground), readColor(background, base)), threshold });
      };
      for (const background of surfaces) {
        for (const foreground of texts) add(foreground, background);
        for (const foreground of ['border', 'input', 'ring', 'sidebar-border', 'sidebar-ring']) add(foreground, background, 3);
      }
      for (const [foreground, background] of [['card-foreground', 'card'], ['popover-foreground', 'popover'], ['secondary-foreground', 'secondary'], ['accent-foreground', 'accent'], ['sidebar-foreground', 'sidebar'], ['sidebar-primary-foreground', 'sidebar-primary'], ['sidebar-accent-foreground', 'sidebar-accent'], ['primary-foreground', 'primary'], ['destructive-foreground', 'destructive']]) add(foreground, background);
      for (const base of ['background', 'card', 'muted']) {
        for (const [foreground, background] of [['primary-foreground', 'primary-hover'], ['destructive-foreground', 'destructive-hover']]) {
          add(foreground, background, 4.5, base);
          results.push({ theme, foreground: background, background: base, ratio: ratio(readColor(background, base), readColor(base)), threshold: 3 });
        }
        for (const foreground of ['destructive', 'muted-foreground']) add(foreground, 'error-surface', 4.5, base);
      }
    }
    return results;
  } finally {
    root.classList.toggle('dark', originalDark);
    probe.remove();
  }
}

export function ColorFoundations() {
  const [pairs, setPairs] = useState<Pair[]>([]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setPairs(measureColors()));
    return () => cancelAnimationFrame(frame);
  }, []);
  return <div className="foundation-preview">
    <div className="foundation-swatches">{surfaces.map(token => <div key={token} className="foundation-swatch" style={{ background: `var(--${token})` }}><code>--{token}</code></div>)}</div>
    <p>Measured from the loaded CSS in this browser; the threshold is checked before rounding. Text: 4.5:1. Essential UI boundaries: 3:1. Decorative chart colors are preserved and outside this audit.</p>
    {!pairs.length ? <p role="status">Measuring both themes…</p> : <div className="foundation-table-scroll"><table><caption>Live contrast measurements — light and dark</caption><thead><tr><th>Theme</th><th>Foreground / boundary</th><th>Surface</th><th>Contrast</th><th>Minimum</th><th>Result</th></tr></thead><tbody>{pairs.map((pair, i) => <tr key={i} data-contrast-result={pair.ratio >= pair.threshold ? 'pass' : 'fail'}><td>{pair.theme}</td><td><code>{pair.foreground}</code></td><td><code>{pair.background}</code></td><td>{pair.ratio.toFixed(2)}:1</td><td>{pair.threshold}:1</td><td>{pair.ratio >= pair.threshold ? 'Pass' : 'FAIL — stop and review this pair'}</td></tr>)}</tbody></table></div>}
  </div>;
}

export function TypeSpecimens() {
  const roles = [['page', 'Book a text session'], ['section', 'Public work'], ['body', 'Tell your mentor what failed, what you expected, and what you have already tried.'], ['label', 'Your question'], ['metadata', 'Alex · 18:00 Europe/Warsaw'], ['numbers', '120 zł · 25 min'], ['code', 'ingress-values.yaml']];
  return <div className="foundation-preview">{roles.map(([role, text]) => <div key={role} className="foundation-type-row"><code>{role}</code><p className={`foundation-type-${role}`}>{text}</p></div>)}</div>;
}

export function SpacingSpecimens() {
  return <div className="foundation-preview"><div className="foundation-table-scroll"><table><caption>Relationship before measurement</caption><thead><tr><th>Relationship</th><th>Token</th><th>Live sample</th></tr></thead><tbody>{['within-group', 'between-groups', 'panel', 'section'].map(role => <tr key={role}><td>{role}</td><td><code>--space-{role}</code></td><td><span className="foundation-space" style={{ inlineSize: `var(--space-${role})` }} /></td></tr>)}</tbody></table></div><div className="foundation-spacing-panel"><strong>Session details</strong><div className="foundation-spacing-group"><span>25 minutes</span><span>120 zł</span></div><p>The group, panel and section spaces describe different relationships.</p></div></div>;
}

export function LayoutSpecimen() {
  return <div className="foundation-preview foundation-layout flex flex-col document-wide:flex-row"><nav className="document-wide:shrink-0" aria-label="Session task navigation">Session · Question · Details</nav><main><h2 className="foundation-type-section">Review your question</h2><p className="foundation-prose">My staging ingress stopped responding after a Helm upgrade. I have checked the service endpoints and the controller logs. Which configuration should I inspect next?</p><aside>25 min · text only · Europe/Warsaw</aside></main></div>;
}

export function ShapeSpecimens() {
  return <div className="foundation-preview foundation-shapes">{['sm', 'md', 'lg', 'xl'].map(size => <div key={size} className="foundation-shape" style={{ borderRadius: `var(--radius-${size})` }}><code>radius-{size}</code></div>)}<div className="foundation-depth"><strong>Opaque panel</strong><p>A border carries the boundary. The retained shadow adds depth; it does not replace the boundary.</p></div></div>;
}

export function MotionSpecimen() {
  const [saved, setSaved] = useState(false);
  return <div className="foundation-preview foundation-motion"><Button onClick={() => setSaved(true)}>Save draft example</Button><p role="status">{saved ? 'Draft saved — example only, no API request.' : 'No changes saved in this example.'}</p></div>;
}

export function IconSpecimens() {
  return <div className="foundation-preview foundation-icon-list"><p><MessageSquare aria-hidden="true" /> Text session</p><p><Clock aria-hidden="true" /> 25 minutes</p><p><Check aria-hidden="true" /> Saved</p><Button variant="link"><ExternalLink aria-hidden="true" /> Open public work</Button></div>;
}

export function ThemeSpecimen() {
  const [open, setOpen] = useState(false);
  return <div className="foundation-preview"><p>Change the toolbar theme, then show the portal. The preview document root supplies the theme to both locations.</p><Button onClick={() => setOpen(value => !value)} aria-expanded={open}>{open ? 'Hide portal sample' : 'Show portal sample'}</Button>{open && <Portal.Root><div className="foundation-portal" data-testid="foundation-portal"><p role="status">The portal inherits the Mentio theme.</p><Button onClick={() => setOpen(false)}>Close portal sample</Button></div></Portal.Root>}</div>;
}

export function KeyboardSpecimen() {
  return <div className="foundation-preview"><Button>Review availability</Button><Label htmlFor="foundation-question">Your question</Label><Input id="foundation-question" placeholder="Describe the failing ingress upgrade" /></div>;
}

/** Documentation-only API setup probe, using the sanctioned package client. */
export function ApiSetupSpecimen() {
  const [message, setMessage] = useState('No example request yet.');
  async function check() {
    setMessage('Checking the mock API…');
    const result = await apiCall<{ database: string }>('/api/health');
    setMessage(result.ok ? `Mock API: ${result.data.database}` : 'Mock API unavailable — try again.');
  }
  return <div className="foundation-preview"><Button onClick={check}>Check mock API</Button><p role="status">{message}</p></div>;
}
