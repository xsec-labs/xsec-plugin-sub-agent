import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),manifest=JSON.parse(await readFile(new URL('plugin.json',root),'utf8')),copy=JSON.parse(await readFile(new URL('.codex-plugin/plugin.json',root),'utf8'));
for(const field of ['name','version','description','author','license'])assert.deepEqual(copy[field],manifest[field],field);assert.equal(manifest.name,'com.xsec.workspace.sub-agent');assert.equal(manifest.version,'2.0.0');const desktop=manifest.extensions['com.xsec.desktop'];assert.equal(desktop.frontendApi.version,2);assert.equal(desktop.frontendApi.module,'single-esm');assert.equal(desktop.entrypoints.frontend,'./com.xsec.desktop/frontend/index.js');
assert.deepEqual(Object.keys(desktop.permissions).sort(),['workspace.session.read','workspace.tool.open']);assert.deepEqual(Object.keys(desktop.frontendApi.methods).sort(),['xsec.subagents.get','xsec.subagents.list','xsec.workspace.tool.open']);
