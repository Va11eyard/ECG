import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=import.meta.dirname;
const assets=JSON.parse(await fs.readFile(new URL('./assets.json',import.meta.url),'utf8'));
for(const asset of assets){
 const target=path.resolve(root,asset.file);
 if(!target.startsWith(path.join(root,'public')+path.sep))throw Error('Unsafe asset path');
 const valid=bytes=>bytes&&bytes.length===asset.bytes&&createHash('sha256').update(bytes).digest('hex')===asset.sha256;
 if(valid(await fs.readFile(target).catch(()=>null)))continue;
 if(new URL(asset.url).origin!=='https://media.prettysites.io')throw Error('Unexpected media origin');
 const response=await fetch(asset.url,{signal:AbortSignal.timeout(90000)});
 if(!response.ok)throw Error(asset.url+' HTTP '+response.status);
 const data=Buffer.from(await response.arrayBuffer());
 if(!valid(data))throw Error('Asset verification failed: '+asset.url);
 await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,data);
 console.log('Ready: '+asset.file);
}
console.log('All '+assets.length+' assets verified');
