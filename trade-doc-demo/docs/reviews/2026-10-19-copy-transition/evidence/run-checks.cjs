'use strict';
// Current delivery checks. Explicit new evidence file; no product mutation.
const fs=require('node:fs'), path=require('node:path'), cp=require('node:child_process'), crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../../..'), label=process.argv[2];
if(!label || !/^[a-z0-9-]+$/.test(label)) throw Error('Explicit safe label required');
const destination=path.join(__dirname,label+'.json');
if(fs.existsSync(destination)) throw Error('Refusing to overwrite evidence');
const files=['index.html',...['js','css','scripts'].flatMap(d=>fs.readdirSync(path.join(root,d)).filter(f=>/\.(js|css|cjs|mjs)$/.test(f)).map(f=>d+'/'+f))];
const hashes=()=>Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')]));
const invoke=args=>{ const start=Date.now(),r=cp.spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:12*1024*1024,env:{...process.env,TRADE_QA_CONTRACT_DIR:__dirname}});return {args,exitCode:r.status,signal:r.signal,error:r.error?.message,elapsedMs:Date.now()-start,stdout:r.stdout,stderr:r.stderr}; };
const before=hashes();
const results=fs.readdirSync(path.join(root,'scripts')).filter(f=>/^verify-.*\.cjs$/.test(f)).sort().map(f=>{const r=invoke(['scripts/'+f]);console.log(f+': '+(r.exitCode===0?'PASS':'FAIL'));return r;});
const archives=['approval-context','document-dashboard','document-status-guidance','document-action-guidance','history-gates'].map(n=>invoke(['scripts/verify-'+n+'.cjs','--archive']));
const syntax=files.filter(f=>/\.(js|cjs|mjs)$/.test(f)).map(f=>invoke(['--check',f]));
const after=hashes(),summary={scripts:results.length,failures:results.filter(r=>r.exitCode!==0).length,archives:archives.length,archiveFailures:archives.filter(r=>r.exitCode!==0).length,syntax:syntax.length,syntaxFailures:syntax.filter(r=>r.exitCode!==0).length};
const report={timestamp:new Date().toISOString(),node:process.version,baseline:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),summary,before,after,unchanged:JSON.stringify(before)===JSON.stringify(after),results,archives,syntax};
fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...summary,unchanged:report.unchanged}));
if(summary.failures||summary.archiveFailures||summary.syntaxFailures||!report.unchanged)process.exitCode=1;
