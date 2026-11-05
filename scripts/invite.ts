import { fileURLToPath } from 'node:url';
import { withScope } from '@devmentor/core';
import type {
  InvitationLink,
  InvitationService,
} from '../packages/core/src/services/invitations/invitation.service';

export interface InviteCommand {
  action: 'create' | 'revoke' | 'resend';
  operator: string;
  email?: string;
  stackTags: string[];
  batch?: string;
  id?: string;
}

const USAGE =
  'Use invite create --operator <name> --email <address> --tags typescript,react [--batch <name>], or invite revoke|resend --operator <name> --id <uuid>.';

export function parseInviteCommand(args: string[]): InviteCommand {
  const [action, ...rest] = args;
  if (!['create', 'revoke', 'resend'].includes(action ?? '') || rest.length % 2) throw new Error(USAGE);
  const flags = new Map<string, string>();
  const allowed =
    action === 'create' ? ['--operator', '--email', '--tags', '--batch'] : ['--operator', '--id'];
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i]!;
    const value = rest[i + 1]!.trim();
    if (!allowed.includes(key) || !value || flags.has(key)) throw new Error(USAGE);
    flags.set(key, value);
  }
  const operator = flags.get('--operator');
  if (!operator || (action === 'create' ? !flags.has('--email') || !flags.has('--tags') : !flags.has('--id')))
    throw new Error(USAGE);
  return {
    action: action as InviteCommand['action'],
    operator,
    email: flags.get('--email'),
    id: flags.get('--id'),
    batch: flags.get('--batch'),
    stackTags:
      flags
        .get('--tags')
        ?.split(',')
        .map((tag) => tag.trim()) ?? [],
  };
}

interface InviteEffects {
  service: Pick<InvitationService, 'create' | 'revoke' | 'resend'>;
  write: (line: string) => void;
  now: () => Date;
}

/** Separate audit and secret output: only successful create/resend emit the link. */
export async function runInvite(command: InviteCommand, effects: InviteEffects): Promise<void> {
  let result: { id: string } | InvitationLink;
  if (command.action === 'create') {
    result = await effects.service.create({
      email: command.email!,
      stackTags: command.stackTags,
      batch: command.batch,
    });
  } else if (command.action === 'revoke') {
    result = await effects.service.revoke(command.id!);
  } else {
    result = await effects.service.resend(command.id!);
  }
  effects.write(
    JSON.stringify({
      action: `invitation.${command.action}`,
      operator: command.operator,
      invitationId: result.id,
      at: effects.now().toISOString(),
    }),
  );
  if ('link' in result) effects.write(result.link);
}

/**
 * Local operator entry point. `npm run invite` evaluates it with `node -e`, where
 * `process.argv` has no script path, so the command passes its own arguments.
 */
export async function main(args: string[]): Promise<void> {
  const command = parseInviteCommand(args);
  try {
    process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  await withScope(async ({ invitationService, clock }) => {
    await runInvite(command, {
      service: invitationService,
      now: () => clock.now(),
      write: (line) => console.log(line),
    });
  });
}
