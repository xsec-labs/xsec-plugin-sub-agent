import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
for(const path of ['com.xsec.desktop/frontend/index.js','com.xsec.desktop/THIRD_PARTY_NOTICES.txt'])assert.deepEqual(await readFile(new URL(path,root)),await readFile(new URL('.xsec-build/'+path,root)),path+' differs from current source build');
execFileSync(process.execPath,['--check',new URL('com.xsec.desktop/frontend/index.js',root).pathname],{stdio:'inherit'});
