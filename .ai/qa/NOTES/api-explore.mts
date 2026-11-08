import { readFile } from 'node:fs/promises';
import { sessionCookie, cookieHeader } from '../../../tests/integration/agent-browser';
const { base, bookingId } = JSON.parse(await readFile('.ai/qa/test-env-runtime/notes-fixture.json','utf8'));
for (const [who, method, body] of [['notes-mentor','GET',null],['notes-mentee','PUT',{body:'forbidden',expectedRevision:1}],['notes-outsider','GET',null],['notes-mentor','PUT',{body:' ',expectedRevision:1}],['notes-mentor','PUT',{body:'stale',expectedRevision:null}]] as const) {
  const cookie = await sessionCookie(who); if (!cookie) throw new Error('Missing local session');
  const response = await fetch(`${base}/api/notes/${bookingId}`,{method,headers:{...cookieHeader(cookie),'x-devmentor-request':'1','content-type':'application/json'},...(body ? {body:JSON.stringify(body)}:{})});
  const payload = await response.json();
  console.log(who,method,response.status,response.headers.get('cache-control'),payload.ok ? {status:payload.data.current?.status,revision:payload.data.current?.revision} : payload.error.code);
}
