(function(){
const oldBase=window.base, oldRender=window.render;
function extraBase(title,body){
 const ns=['dashboard','matches','documents','universe','assistant','alerts','profile','comparison','whatif','settings'];
 A.innerHTML='<div class="layout"><aside class="side"><div class="logo"><span>S</span><div><b>SchemeFinder</b><small>Citizen welfare intelligence</small></div></div>'+ns.map(n=>'<button class="navItem '+(s.view==n?'active':'')+'" onclick="go(\''+n+'\')">'+(n==='universe'?'Scheme Universe':n==='comparison'?'Compare Eligibility':n==='whatif'?'What If Simulator':T(n))+'</button>').join('')+'<div class="sideBottom"><select onchange="s.lang=this.value;save();render()">'+Object.keys(N).map(k=>'<option value="'+k+'" '+(s.lang==k?'selected':'')+'>'+N[k]+'</option>').join('')+'</select></div></aside><main><header class="top"><div><span class="eyebrow">SCHEMEFINDER</span><h1>'+E(title)+'</h1></div><div><button class="ghost" onclick="go(\'wizard\')">✦ Check eligibility</button></div></header>'+body+'</main></div>';
}
function universe(){
 extraBase('Scheme Universe','<section class="panel"><span class="eyebrow">INTERACTIVE SCHEME UNIVERSE</span><h2>'+s.all.length+' indexed schemes</h2><p>Search across categories, benefits and keywords. Open a scheme to see rule signals, documents, steps and the official source.</p><div class="toolbar"><input placeholder="Search schemes, needs or categories..." oninput="extraFilter(this.value)"></div><div id="extraGrid" class="cardGrid">'+s.all.map(x=>({...x,score:(s.m.find(y=>y.id===x.id)||{}).score||0})).map(card).join('')+'</div></section>');
}
function extraFilter(q){q=q.toLowerCase();document.getElementById('extraGrid').innerHTML=s.all.filter(x=>(x.name+x.category+x.description+(x.keywords||[]).join('')).toLowerCase().includes(q)).map(x=>({...x,score:(s.m.find(y=>y.id===x.id)||{}).score||0})).map(card).join('')}
function comparison(){
 const a=(s.m.length?s.m:s.all).slice(0,4);
 extraBase('Eligibility Comparison','<section class="panel"><div class="panelHead"><div><span class="eyebrow">EXPLAINABLE COMPARISON</span><h2>Compare potential matches</h2><p>Compare score, documents and rule signals side by side.</p></div></div><div class="compareGrid">'+a.map(x=>'<article class="schemeCard"><span class="category">'+E(x.category)+'</span><h3>'+E(x.name)+'</h3><div class="scoreLarge">'+(x.score||0)+'%</div><p>'+E(x.description)+'</p><div class="checks">'+(x.checks||[]).map(c=>'<span class="'+(c.ok?'ok':'no')+'">'+(c.ok?'✓':'○')+' '+E(c.label)+'</span>').join('')+'</div><p><b>'+(x.documents||[]).length+'</b> documents</p><a class="primary inline" target="_blank" href="'+E(x.source)+'">Official source ↗</a></article>').join('')+'</div></section>');
}
function wizard(){
 const steps=[['age','Age','number'],['state','State','select'],['income','Annual household income','number'],['occupation','Occupation','select'],['education','Education','select']];
 const k=steps[s.step||0],p=s.p;
 let input='';
 if(k[2]==='select'){let a=k[0]==='state'?['Tamil Nadu','Andhra Pradesh','Telangana','Karnataka','Kerala','Maharashtra','Delhi']:k[0]==='occupation'?['Student','Farmer','Agricultural Worker','Employee','Self-employed','Entrepreneur','Unemployed','Senior Citizen']:['School','Undergraduate','Postgraduate','Diploma'];input='<select id="wizValue">'+a.map(x=>'<option '+(p[k[0]]===x?'selected':'')+'>'+E(x)+'</option>').join('')+'</select>'}else input='<input id="wizValue" type="'+k[2]+'" value="'+E(p[k[0]]||'')+'">';
 extraBase('Eligibility Check','<section class="panel wizard"><div class="progress"><span style="width:'+((s.step+1)/steps.length*100)+'%"></span></div><span class="eyebrow">STEP '+(s.step+1)+' OF '+steps.length+'</span><h2>Build your citizen profile</h2><p>Answer a few questions and SchemeFinder will explain potential matches.</p><label class="wizardField"><span>'+E(k[1])+'</span>'+input+'</label><div class="actions">'+(s.step?'<button class="ghost" onclick="s.step--;render()">Back</button>':'')+(s.step<steps.length-1?'<button class="primary" onclick="wizardNext(\''+k[0]+'\')">Continue →</button>':'<button class="primary" onclick="wizardFinish(\''+k[0]+'\')">Find my matches →</button>')+'</div></section>');
}
function wizardNext(k){let v=document.getElementById('wizValue').value;s.p[k]=(k==='age'||k==='income')?+v:v;s.step++;save();render()}
async function wizardFinish(k){wizardNext(k);setTimeout(async()=>{try{s.m=(await api('/api/match',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(s.p)})).matches;save()}catch(e){}s.step=0;go('matches')},50)}
function whatIf(){
 extraBase('What If? Simulator','<section class="panel"><span class="eyebrow">SCENARIO SIMULATION</span><h2>See how income changes the match set</h2><p>Move the slider to preview the matching engine response. This does not change your saved profile.</p><input id="wi" type="range" min="50000" max="1000000" step="25000" value="'+(s.p.income||150000)+'" oninput="runWI(this.value)"><h3 id="wiVal">₹'+Number(s.p.income||150000).toLocaleString('en-IN')+'</h3><div id="wiOut"></div></section>');
}
async function runWI(v){document.getElementById('wiVal').textContent='₹'+Number(v).toLocaleString('en-IN');try{let p={...s.p,income:+v};let x=await api('/api/match',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});document.getElementById('wiOut').innerHTML='<div class="success">'+(x.matches||[]).length+' potential matches at this income.</div>'}catch(e){}}
window.base=extraBase;window.extraFilter=extraFilter;window.comparison=comparison;window.wizard=wizard;window.wizardNext=wizardNext;window.wizardFinish=wizardFinish;window.whatIf=whatIf;window.runWI=runWI;
window.render=function(){if(s.view==='universe')return universe();if(s.view==='comparison')return comparison();if(s.view==='wizard')return wizard();if(s.view==='whatif')return whatIf();return oldRender()};
window.go=function(v){s.view=v;s.step=0;save();render()};
})();