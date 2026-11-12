// Only mocks fetch: no real API key or external network.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/ai.js', import.meta.url), 'utf8')
  .replace("import { partById } from './data';", `const partById = {H:{id:'H',name:'壳体',english:'Housing',material:'ZL101A',kind:'圆筒壳体',shape:'双端法兰',dimensions:'Ø540',features:['主法兰'],note:'简化 CAD'}};`)
  .replace("import holeCatalog from './holeCatalog.json';", `const holeCatalog = {H:[{name:'三孔连接座',drawing:'3-Ø71',model:'3个Ø71通孔',confidence:'drawing',note:'已确认'}]};`);
const mod = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
const req = mod.buildAIRequest({partId:'H',question:'哪些孔是Ø71？'});
assert.equal(req.model,'deepseek-flash');
assert(req.messages[0].content.includes('3-Ø71'));
assert.equal(req.messages.at(-1).content,'哪些孔是Ø71？');

let captured=null;
globalThis.fetch = async (url, options) => {
  captured={url,options};
  return {ok:true,json:async()=>({choices:[{message:{content:'三孔连接座共有三处 Ø71。'}}]})};
};
const result = await mod.askDeepSeek({key:'sk-test-only',partId:'H',question:'有哪些孔？'});
assert.match(result,/Ø71/);
assert.equal(captured.url,'https://api.deepseek.com/chat/completions');
assert.equal(captured.options.headers.Authorization,'Bearer sk-test-only');
assert.equal(captured.options.credentials,'omit');
assert.equal(captured.options.redirect,'error');

globalThis.fetch = async()=>{throw new TypeError('Failed to fetch')};
await assert.rejects(mod.askDeepSeek({key:'sk-test-only',partId:'H',question:'测试跨域错误'}),/CORS/);
const aborted = new AbortController();aborted.abort();
await assert.rejects(mod.askDeepSeek({key:'sk-test-only',partId:'H',question:'已停止',signal:aborted.signal}),{name:'AbortError'});
assert.throws(()=>mod.buildAIRequest({partId:'H',question:''}),/请输入/);
console.log('Browser-only DeepSeek request tests passed. No live request was made.');
