export function planSections(words,rows){
 if(!words.length)throw Error('请先导入词表。');
 if(!rows.length)throw Error('请至少添加一个单元。');
 const names=new Set();
 const starts=rows.map((r,i)=>{
  const name=r.name.trim(),first=r.first.trim();
  if(!name||name.length>40)throw Error(`第 ${i+1} 行：单元名称不能为空，且最多 40 字。`);
  if(name==='未分节'||names.has(name.toLowerCase()))throw Error(`单元名称“${name}”重复或为保留名称，请修改。`);
  names.add(name.toLowerCase());
  if(!first)throw Error(`请填写 ${name} 的首个单词。`);
  let index;
  if(/^#?\d+$/.test(first)){index=Number(first.replace('#',''))-1;if(!Number.isInteger(index)||index<0||index>=words.length)throw Error(`${name} 的序号超出词表范围。`);}
  else{const matches=words.flatMap((w,j)=>w.word.trim().toLowerCase()===first.toLowerCase()?[j]:[]);if(!matches.length)throw Error(`找不到“${first}”，请核对拼写。`);if(matches.length>1)throw Error(`“${first}”出现多次，请改填序号：${matches.map(j=>j+1).join('、')}。`);index=matches[0];}
  if(i===0&&index!==0)throw Error(`第一个单元必须从第 1 个词“${words[0].word}”开始。`);
  return {name,index};
 });
 for(let i=1;i<starts.length;i++)if(starts[i].index<=starts[i-1].index)throw Error('各单元首词必须按词表顺序依次向后排列，且不能重复。');
 return starts.map((s,i)=>({...s,end:(starts[i+1]?.index??words.length)-1,count:(starts[i+1]?.index??words.length)-s.index}));
}
export function applySections(words,plan){let section=0;return words.map((w,i)=>{while(section+1<plan.length&&i>=plan[section+1].index)section++;return {...w,section:plan[section].name};});}
export const sectionName=w=>typeof w.section==='string'&&w.section.trim()?w.section:'未分节';
export function sectionGroups(words){const groups=new Map();for(const w of words){const name=sectionName(w);if(!groups.has(name))groups.set(name,{name,total:0,new:0,known:0});const g=groups.get(name);g.total++;g[w.bank]++;}return [...groups.values()];}
export function filterSectionWords(words,bank,selected){return words.filter(w=>w.bank===bank&&selected.has(sectionName(w)));}
export function mountSections({getWords,replaceWords,onBegin}){
 const $=id=>document.getElementById(id);let pendingBank='new',afterEdit=false,lastSelection=null;
 function updateSelection(){const checks=[...$('unit-list').querySelectorAll('input')];const selected=new Set(checks.filter(c=>c.checked).map(c=>c.value));const count=filterSectionWords(getWords(),pendingBank,selected).length;$('unit-summary').textContent=`已选 ${selected.size} 个单元 · 本轮 ${count} 个${pendingBank==='new'?'生词':'熟词'}`;$('units-begin').disabled=count===0;$('units-all').checked=checks.length>0&&checks.every(c=>c.checked);$('units-all').indeterminate=checks.some(c=>c.checked)&&!checks.every(c=>c.checked);}
 function openPicker(bank){pendingBank=bank;$('unit-list').replaceChildren();for(const g of sectionGroups(getWords())){const label=document.createElement('label');label.className='unit-option';const input=document.createElement('input');input.type='checkbox';input.value=g.name;input.checked=!lastSelection||lastSelection.has(g.name);input.onchange=updateSelection;const text=document.createElement('span');text.textContent=`${g.name} · 共 ${g.total} 词 / ${g[bank]} 个${bank==='new'?'生词':'熟词'}`;label.append(input,text);$('unit-list').append(label);}$('units-title').textContent=bank==='new'?'选择要背的单元':'选择要复习的单元';updateSelection();$('units-dialog').showModal();}
 function invalidate(){$('section-preview').replaceChildren();$('section-message').textContent='';$('sections-save').disabled=true;}
 function addRow(name='',first=''){const row=document.createElement('div');row.className='section-row';const n=document.createElement('input');n.value=name;n.placeholder='单元名称，如 L1';n.maxLength=40;n.setAttribute('aria-label','单元名称');const f=document.createElement('input');f.value=first;f.placeholder='首个单词或序号';f.setAttribute('aria-label','该单元首词或序号');const remove=document.createElement('button');remove.className='quiet';remove.textContent='删除';remove.onclick=()=>{row.remove();invalidate();};n.oninput=f.oninput=invalidate;row.append(n,f,remove);$('section-rows').append(row);invalidate();}
 function rows(){return [...$('section-rows').children].map(r=>({name:r.children[0].value,first:r.children[1].value}));}
 function openEditor(returnToPicker=false){afterEdit=returnToPicker;if($('units-dialog').open)$('units-dialog').close();$('section-rows').replaceChildren();const words=getWords();const previous=[];let last;for(let i=0;i<words.length;i++){const name=sectionName(words[i]);if(name!==last){previous.push({name,first:String(i+1)});last=name;}}
 if(previous.some(r=>r.name!=='未分节'))previous.forEach((r,i)=>addRow(r.name==='未分节'?`新增单元${i+1}`:r.name,r.first));else for(let i=0;i<4;i++)addRow(`L${i+1}`,i===0?words[0]?.word||'':'');
 $('section-order-list').replaceChildren();words.forEach((w,i)=>{const item=document.createElement('li');item.textContent=`${String(i+1).padStart(3,'0')}　${w.word}　${sectionName(w)}`;$('section-order-list').append(item);});$('sections-dialog').showModal();}
 function closeEditor(){$('sections-dialog').close();if(afterEdit)openPicker(pendingBank);}
 $('sections-open').onclick=()=>openEditor();$('units-edit').onclick=()=>openEditor(true);$('sections-close').onclick=closeEditor;$('sections-dialog').addEventListener('cancel',e=>{e.preventDefault();closeEditor();});$('sections-add').onclick=()=>addRow(`L${$('section-rows').children.length+1}`);$('units-close').onclick=()=>$('units-dialog').close();$('units-all').onchange=()=>{for(const c of $('unit-list').querySelectorAll('input'))c.checked=$('units-all').checked;updateSelection();};
 $('sections-preview').onclick=()=>{try{const plan=planSections(getWords(),rows());$('section-preview').replaceChildren();for(const s of plan){const p=document.createElement('p');p.textContent=`${s.name}：第 ${s.index+1}–${s.end+1} 词，共 ${s.count} 词（${getWords()[s.index].word} → ${getWords()[s.end].word}）`;$('section-preview').append(p);}$('section-message').textContent='请核对范围，确认后保存分节。';$('sections-save').disabled=false;}catch(e){invalidate();$('section-message').textContent=e.message;}};
 $('sections-save').onclick=()=>{try{const plan=planSections(getWords(),rows());if(!replaceWords(applySections(getWords(),plan)))throw Error('保存失败，请检查浏览器存储空间。');lastSelection=null;closeEditor();}catch(e){$('section-message').textContent=e.message;}};
 $('units-begin').onclick=()=>{const selected=new Set([...$('unit-list').querySelectorAll('input')].filter(c=>c.checked).map(c=>c.value));const chosen=filterSectionWords(getWords(),pendingBank,selected);if(!chosen.length)return;lastSelection=selected;$('units-dialog').close();onBegin(pendingBank,chosen.map(w=>w.id));};
 return {openPicker};
}
