import { runAgentBrowser } from '../../../tests/integration/agent-browser';
const [session, ...args] = process.argv.slice(2);
if (!session || !args.length) throw new Error('Expected session and agent-browser command');
console.log(await runAgentBrowser(session, ...args));
