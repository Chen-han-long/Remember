export const fresh = w => ({...w,seen:false,streak:0,bank:'new'});
export function answer(w, known) {
  if (!w.seen) return {...w,seen:true,streak:0,bank:known?'known':'new'};
  if (!known) return {...w,bank:'new',streak:0};
  if (w.bank==='known') return w;
  const streak=w.streak+1;
  return {...w,streak:Math.min(3,streak),bank:streak>=3?'known':'new'};
}
export function shuffle(values, random=Math.random) {
  const out=[...values];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;
}
export function parts(definition) {
  const re=/(?:adj|adv|vt|vi|n|v|pron|prep|conj|interj|num|art|aux|phr)\./g;
  const hits=[...definition.matchAll(re)];
  if(!hits.length) return [{pos:'',meaning:definition.trim()}];
  return hits.map((m,i)=>({pos:m[0],meaning:definition.slice(m.index+m[0].length,hits[i+1]?.index??definition.length).trim()}));
}
function join(items){
  const lines=[];for(const a of [...items].sort((a,b)=>b.y-a.y||a.x-b.x)){let l=lines.find(l=>Math.abs(l.y-a.y)<2);if(!l){l={y:a.y,items:[]};lines.push(l);}l.items.push(a);}
  return lines.sort((a,b)=>b.y-a.y).map(l=>l.items.sort((a,b)=>a.x-b.x).map(a=>a.str).join('')).join('').trim();
}
export function parsePage(raw,pageNumber=1) {
  const items=raw.filter(i=>i.str?.trim()).map(i=>({str:i.str.trim(),x:i.transform[4],y:i.transform[5],width:i.width,height:i.height}));
  // Numbered table: identify row anchors and keep each column independent.
  const anchors=items.filter(i=>/^\d{1,4}$/.test(i.str)).map(a=>{
    const word=items.filter(w=>w.x>a.x+a.width && Math.abs(w.y-a.y)<3 && /^[A-Za-z][A-Za-z '\-’]*$/.test(w.str)).sort((a,b)=>a.x-b.x)[0];
    return word?{...a,word}:null;
  }).filter(Boolean);
  const columns=[];for(const a of anchors){let col=columns.find(c=>Math.abs(c.x-a.x)<14);if(!col){col={x:a.x,rows:[]};columns.push(col);}col.rows.push(a);}columns.sort((a,b)=>a.x-b.x);
  const out=[];
  for(let ci=0;ci<columns.length;ci++){
    const rows=columns[ci].rows.sort((a,b)=>b.y-a.y),right=(columns[ci+1]?.x??Infinity)-4;
    for(let i=0;i<rows.length;i++){
      const a=rows[i],gap=rows.length>1?(i?rows[i-1].y-a.y:a.y-rows[1].y):30;
      const top=i?(rows[i-1].y+a.y)/2:a.y+gap/2;
      const bottom=rows[i+1]?(a.y+rows[i+1].y)/2:a.y-gap/2;
      const definition=join(items.filter(t=>t.x>=a.word.x+a.word.width-1 && t.x<right && t.y<top && t.y>bottom));
      if(definition)out.push({order:Number(a.str),word:a.word.str,definition,page:pageNumber});
    }
  }
  if(out.length)return out.sort((a,b)=>a.order-b.order);
  // Plain text fallback, one entry per line, optionally numbered.
  const lines=[];for(const a of items){let l=lines.find(l=>Math.abs(l.y-a.y)<3);if(!l){l={y:a.y,items:[]};lines.push(l);}l.items.push(a);}
  for(const l of lines.sort((a,b)=>b.y-a.y)){
    const str=l.items.sort((a,b)=>a.x-b.x).map(a=>a.str).join(' ');
    const m=str.match(/^(?:\d+[.、\s]+)?([A-Za-z][A-Za-z '\-’]*?)\s+((?:adj|adv|vt|vi|n|v|pron|prep|conj|interj|num|art|aux|phr)\..+)$/);
    if(m)out.push({order:out.length+1,word:m[1].trim(),definition:m[2].trim(),page:pageNumber});
  }return out;
}
export async function readPDF(pdfjs,data,onProgress=()=>{}) {
  const task=pdfjs.getDocument({data,useSystemFonts:true});
  let pdf;try{pdf=await task.promise;const words=[];for(let p=1;p<=pdf.numPages;p++){onProgress(p,pdf.numPages);const page=await pdf.getPage(p);const text=await page.getTextContent();words.push(...parsePage(text.items,p));}return words;}finally{await task.destroy();}
}
