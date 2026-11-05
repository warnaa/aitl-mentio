import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, Clock3, CodeXml, FileText, LockKeyhole, MessageSquare } from 'lucide-react';
import { Badge, Button, Card } from '@devmentor/ui';
import { PublicPage } from '../components/public/PublicPage';
import { currentSession } from '../lib/auth-page';
import { homeFor } from '../lib/session';

// Reads the session cookie to offer the right account action.
export const dynamic = 'force-dynamic';

const RESULT_TYPE = 'type Result<T> =\n  | { ok: true; data: T }\n  | { ok: false; error: string };';

/**
 * `/`, the public homepage composed as the prototype's s17 screen. The mentor catalogue
 * (s19) and booking are not built yet, so the prototype's "Find your mentor" actions
 * lead to registration (or the visitor's workspace) and its example-mentor band is left
 * out (spec A12). The conversation and written answer are labelled illustrations.
 */
export default async function Home() {
  const session = await currentSession();
  const account = session
    ? { href: homeFor(session.roles), label: 'My workspace', closing: 'Open my workspace' }
    : { href: '/sign-in', label: 'Sign in', closing: 'Already have an account? Sign in' };
  const primary = session ? (
    <Button asChild>
      <Link href={account.href}>
        Open my workspace
        <ArrowRight aria-hidden="true" />
      </Link>
    </Button>
  ) : (
    <Button asChild>
      <Link href="/register">
        Create an account
        <ArrowRight aria-hidden="true" />
      </Link>
    </Button>
  );
  return (
    <PublicPage
      className="dm-public-landing"
      leading={
        <Button asChild className="dm-home-section-nav" intent="neutral" appearance="ghost">
          <a href="#landing-how-title">How it works</a>
        </Button>
      }
      primary={session ? undefined : primary}
      footer={
        <div className="dm-home-footer-inner">
          <div>
            <span className="dm-home-footer-wordmark">
              DevMentor<span aria-hidden="true">✦</span>
            </span>
            <p>
              Discuss your code with a mentor.
              <br />
              Keep the explanation for later.
            </p>
          </div>
          <nav aria-label="Footer navigation">
            <a href="#landing-how-title">How it works</a>
            <Link href={account.href}>{account.label}</Link>
          </nav>
          <div className="dm-home-footer-detail">
            <span>1:1 text mentoring</span>
            <span>Written answers and private session notes</span>
          </div>
        </div>
      }
    >
      <div className="dm-landing">
        <section className="dm-landing-hero" aria-labelledby="landing-title">
          <div className="dm-home-container">
            <p className="dm-home-eyebrow">Developer mentoring</p>
            <h1 id="landing-title">
              Work through your code
              <br /> <span>with a mentor.</span>
            </h1>
            <p className="dm-landing-lead">
              Discuss a problem in your code with another developer.
              <br className="dm-home-wide-break" /> Your mentor writes up the answer so you can use it later.
            </p>
            <div className="dm-home-hero-actions">{primary}</div>
            <div className="dm-fact-chips dm-home-hero-facts" role="group" aria-label="Session format">
              <Badge variant="outline">
                <MessageSquare aria-hidden="true" />
                1:1 text sessions
              </Badge>
              <Badge variant="outline">
                <Clock3 aria-hidden="true" />
                25 or 50 minutes
              </Badge>
              <Badge variant="outline">
                <FileText aria-hidden="true" />
                Written answer included
              </Badge>
            </div>
            <Image
              className="dm-home-hero-art"
              src="/landing/developer-mentoring.png"
              width={1536}
              height={1024}
              sizes="(max-width: 704px) 100vw, 640px"
              alt=""
              priority
            />
          </div>
        </section>

        <section className="dm-home-help dm-home-container" aria-labelledby="home-help-title">
          <div className="dm-home-section-heading">
            <p className="dm-home-eyebrow">During your session</p>
            <h2 id="home-help-title">
              Talk through the part
              <br /> you are stuck on.
            </h2>
          </div>
          <div className="dm-home-feature-row">
            <div className="dm-home-feature-copy">
              <p className="dm-home-eyebrow">Bring your code</p>
              <h3>
                Understand what is happening
                <br /> and what to change.
              </h3>
              <p>
                You might have a type error you cannot explain, an API that feels too complicated or a React component
                that keeps growing. Share the example with your mentor.
              </p>
              <ul className="dm-home-check-list">
                <li>
                  <Check aria-hidden="true" />
                  Work on your own code example
                </li>
                <li>
                  <Check aria-hidden="true" />
                  Ask why a change works and what to try next
                </li>
                <li>
                  <Check aria-hidden="true" />
                  Choose the session length and ask for the pace you need
                </li>
              </ul>
            </div>
            <div className="dm-home-chat-scene">
              <span className="dm-home-scene-caption">
                <MessageSquare aria-hidden="true" />
                An example text session
              </span>
              <Card className="dm-home-conversation" role="region" aria-label="Example mentoring conversation">
                <header>
                  <span className="dm-home-avatar" aria-hidden="true">
                    AL
                  </span>
                  <div>
                    <strong>Alex Laurent</strong>
                    <span>TypeScript mentor</span>
                  </div>
                  <Badge variant="outline">Text session</Badge>
                </header>
                <div className="dm-home-message">
                  <span>Jordan</span>
                  <p>My API returns data or an error. Why do callers keep checking both?</p>
                </div>
                <div className="dm-home-message dm-home-message-answer">
                  <span>Alex</span>
                  <p>
                    Add an <code>ok</code> field to distinguish success from failure. TypeScript can then narrow the
                    result when you check that field.
                  </p>
                  <pre role="region" tabIndex={0} aria-label="Example TypeScript result">
                    <code>{RESULT_TYPE}</code>
                  </pre>
                </div>
              </Card>
              <span className="dm-home-scene-note">
                Start with your own example.
                <ArrowRight aria-hidden="true" />
              </span>
            </div>
          </div>
          <div className="dm-home-feature-row dm-home-feature-reverse">
            <div className="dm-home-answer-scene" role="region" aria-label="Example written answer">
              <div className="dm-home-answer-sheet">
                <div className="dm-home-answer-label">
                  <FileText aria-hidden="true" />
                  <span>Your written answer</span>
                </div>
                <h3>
                  A clearer result type
                  <br /> at the API boundary
                </h3>
                <p>One signal tells the caller what happened. Keep the success data and the error in separate branches.</p>
                <div className="dm-home-code-line">
                  <CodeXml aria-hidden="true" />
                  <code>{'if (result.ok) { ... }'}</code>
                </div>
                <div className="dm-home-answer-next">
                  <span>YOUR NEXT STEP</span>
                  <p>
                    Try it in one endpoint.
                    <br />
                    Test the success and error paths.
                  </p>
                </div>
              </div>
              <div className="dm-home-private-stamp">
                <LockKeyhole aria-hidden="true" />
                <div>
                  <strong>Your note stays private</strong>
                  <span>Read it, request any changes and approve it.</span>
                </div>
              </div>
            </div>
            <div className="dm-home-feature-copy">
              <p className="dm-home-eyebrow">After your session</p>
              <h3 id="landing-takeaway-title">
                Return to the explanation
                <br /> when you need it.
              </h3>
              <p>
                Your mentor writes up the answer, including the reasoning and code you discussed. You can refer to it
                while making the change.
              </p>
              <ul className="dm-home-check-list">
                <li>
                  <Check aria-hidden="true" />A written explanation with code examples
                </li>
                <li>
                  <Check aria-hidden="true" />A private note of the decisions you reached
                </li>
                <li>
                  <Check aria-hidden="true" />A chance to request changes before approving the note
                </li>
              </ul>
              <p className="dm-home-quiet-note">Approving your note keeps it private.</p>
            </div>
          </div>
        </section>

        <section className="dm-home-how dm-home-container" aria-labelledby="landing-how-title">
          <div className="dm-home-section-heading">
            <p className="dm-home-eyebrow">How it works</p>
            <h2 id="landing-how-title" tabIndex={-1}>
              Book a session for your question.
            </h2>
          </div>
          <ol className="dm-home-steps">
            <li>
              <span className="dm-home-step-number" aria-hidden="true">
                01
              </span>
              <h3>Choose a mentor</h3>
              <p>Read their profile and work examples to see if they can help with your problem.</p>
            </li>
            <li>
              <span className="dm-home-step-number" aria-hidden="true">
                02
              </span>
              <h3>Choose a time</h3>
              <p>Pick 25 or 50 minutes, check the price and reserve your session.</p>
            </li>
            <li>
              <span className="dm-home-step-number" aria-hidden="true">
                03
              </span>
              <h3>Discuss your code</h3>
              <p>Explain the problem in text. Your mentor writes up the answer and what to try next.</p>
            </li>
          </ol>
        </section>

        <section className="dm-home-closing" aria-labelledby="home-closing-title">
          <div className="dm-home-container">
            <p className="dm-home-eyebrow">Get help with your code</p>
            <h2 id="home-closing-title">
              Find a mentor for the problem
              <br /> you are working on.
            </h2>
            <div>
              {session ? null : primary}
              <Button asChild intent="neutral" appearance="stroke">
                <Link href={account.href}>{account.closing}</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </PublicPage>
  );
}
