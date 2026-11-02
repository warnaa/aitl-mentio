import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { installReviewHints } from './review-integration.ts';

test('empty review submissions are disabled with a reason and enable only for nonblank text',async()=>{
 const dom=new JSDOM('<aside id="prototype-review-panel"><div class="anno-composer"><textarea></textarea><button>Add comment</button></div></aside>');
 const saved={document:globalThis.document,MutationObserver:globalThis.MutationObserver,Element:globalThis.Element,HTMLElement:globalThis.HTMLElement};
 Object.assign(globalThis,{document:dom.window.document,MutationObserver:dom.window.MutationObserver,Element:dom.window.Element,HTMLElement:dom.window.HTMLElement});
 const stop=installReviewHints();
 try{
  const button=document.querySelector('button')!;const input=document.querySelector('textarea')!;
  assert.equal(button.disabled,true);assert.match(document.body.textContent!,/Wpisz treść/);assert.ok(button.getAttribute('aria-describedby'));
  input.value='   ';input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));assert.equal(button.disabled,true);
  input.value='Uwaga testowa';input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));assert.equal(button.disabled,false);
  document.querySelector('.anno-composer')!.innerHTML='<textarea></textarea><button>Reply</button>';
  await new Promise(resolve=>setTimeout(resolve,0));assert.equal(document.querySelector('button')!.disabled,true);
 }finally{stop();Object.assign(globalThis,saved);dom.window.close();}
});
test('review integration can be installed without a panel and cleaned up safely',()=>{
 const dom=new JSDOM('');const saved=globalThis.document;globalThis.document=dom.window.document;
 try{assert.doesNotThrow(()=>installReviewHints()());}finally{globalThis.document=saved;dom.window.close();}
});
test('thread headers become keyboard buttons that select the thread with Enter or Space',()=>{
 const dom=new JSDOM('<aside id="prototype-review-panel" class="open"><div class="anno-panel-body"><div class="anno-thread active" id="t1"><div class="anno-thread-head"><span class="anno-num">1</span><span class="anno-anchor">Adres e-mail</span></div></div><div class="anno-thread" id="t2"><div class="anno-thread-head"><span class="anno-num">2</span><span class="anno-anchor">Hasło demo</span></div></div></div></aside>',{pretendToBeVisual:true});
 const saved={document:globalThis.document,MutationObserver:globalThis.MutationObserver,Element:globalThis.Element,HTMLElement:globalThis.HTMLElement,requestAnimationFrame:globalThis.requestAnimationFrame};
 Object.assign(globalThis,{document:dom.window.document,MutationObserver:dom.window.MutationObserver,Element:dom.window.Element,HTMLElement:dom.window.HTMLElement,requestAnimationFrame:dom.window.requestAnimationFrame.bind(dom.window)});
 const clicked:string[]=[];
 for(const card of document.querySelectorAll('.anno-thread'))card.addEventListener('click',()=>{clicked.push(card.id);document.querySelectorAll('.anno-thread').forEach(c=>c.classList.toggle('active',c===card));});
 const stop=installReviewHints();
 try{
  const [first,second]=[...document.querySelectorAll<HTMLElement>('.anno-thread-head')];
  assert.equal(second.getAttribute('role'),'button');assert.equal(second.tabIndex,0);
  assert.equal(second.hasAttribute('aria-label'),false);assert.equal(second.textContent,'2Hasło demo');
  assert.equal(first.getAttribute('aria-pressed'),'true');assert.equal(second.getAttribute('aria-pressed'),'false');
  second.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  first.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true}));
  second.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'a',bubbles:true,cancelable:true}));
  assert.deepEqual(clicked,['t2','t1']);
 }finally{stop();Object.assign(globalThis,saved);dom.window.close();}
});
