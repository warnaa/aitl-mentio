"use client";

import { useId, useState, type ReactNode } from "react";
import { Button } from "@mentio/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@mentio/ui/components/card";
import { StatusBadge, type StatusTone } from "@mentio/ui/backend/feedback";
import { Input } from "@mentio/ui/components/input";
import { Label } from "@mentio/ui/components/label";

export interface MentorPageStatusProps {
  heading: string;
  statusLabel: string;
  statusTone: StatusTone;
  shareLabel: string;
  /** Absolute share URL (D02: the link is the primary way in). */
  shareUrl: string;
  copyLabel: string;
  /** Announced politely after copying (E01: "Skopiowano"). */
  copiedLabel: string;
  copyFailedLabel: string;
  /** Shown when the page is published. */
  view?: { href: string; label: string };
  /** The publish/unpublish ActionButton composed by the app. */
  action: ReactNode;
}

/** Mentor editor status card (`/mentor/strona`): status, publish action, share link. */
export function MentorPageStatus({ heading, statusLabel, statusTone, shareLabel, shareUrl, copyLabel, copiedLabel, copyFailedLabel, view, action }: MentorPageStatusProps) {
  const shareId = useId();
  const [copyResult, setCopyResult] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyResult(copiedLabel);
    } catch {
      setCopyResult(copyFailedLabel);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="mentio-status-heading">
          <CardTitle>
            <h2>{heading}</h2>
          </CardTitle>
          <StatusBadge tone={statusTone} label={statusLabel} />
        </div>
      </CardHeader>
      <CardContent className="mentio-status-body">
        {action}
        <div className="mentio-share">
          <Label htmlFor={shareId}>{shareLabel}</Label>
          <Input id={shareId} readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} />
          <div className="mentio-share-actions">
            <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
              {copyLabel}
            </Button>
            {view && (
              <a href={view.href} className="mentio-link">
                {view.label}
              </a>
            )}
            <span role="status" className="mentio-field-description">
              {copyResult}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
