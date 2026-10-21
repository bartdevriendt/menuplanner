import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,cp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,basename,extname} from 'node:path';
import {spawnSync} from 'node:child_process';

test('server menu modules load from the files shipped in the runtime image',async()=>{
  const root=await mkdtemp(join(tmpdir(),'menuplanning-runtime-'));
  try {
    const dockerfile=await readFile(new URL('../Dockerfile',import.meta.url),'utf8');
    const runtime=dockerfile.split(/^FROM .*$/m).at(-1);
    // Reproduce local COPY instructions in the final stage, without build-stage files.
    for(const line of runtime.split('\n')) {
      if(!line.startsWith('COPY ')||line.includes('--from='))continue;
      const args=line.trim().split(/\s+/).slice(1).filter(arg=>!arg.startsWith('--'));
      const destination=args.pop();
      for(const source of args)await cp(resolve(source),join(root,destination,extname(source)?basename(source):''),{recursive:true});
    }
    await writeFile(join(root,'check.mjs'),"import {menu} from './server/domain.js'; if(menu({name:'Rijst',ingredients:{supermarket:['rijst']}}).ingredients.supermarket[0]!=='rijst')throw Error('Ingredients lost');");
    const result=spawnSync(process.execPath,[join(root,'check.mjs')],{encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
  } finally {await rm(root,{recursive:true,force:true});}
});
