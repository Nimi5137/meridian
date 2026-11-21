import {z} from 'zod';
type Entry={name:string;id:string|null};
type Listing={data:Entry[]|null;error:unknown};
type Removal={error:unknown};
export type StorageBucket={list:(path:string,options:{limit:number;offset:number;sortBy:{column:string;order:'asc'}})=>PromiseLike<Listing>;remove:(paths:string[])=>PromiseLike<Removal>};
/** Called only after the database deletion guard prevents new uploads. It never follows a path outside the user's prefix. */
export async function removeUserObjects(bucket:StorageBucket,userId:string):Promise<number>{if(!z.string().uuid().safeParse(userId).success)throw new Error('Invalid account');const paths:string[]=[];const queue=[{prefix:userId,depth:0}];let entries=0;
 while(queue.length){const folder=queue.shift()!;let offset=0;for(;;){const result=await bucket.list(folder.prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}});if(result.error||!result.data)throw new Error('Could not enumerate storage');for(const item of result.data){if(++entries>10000)throw new Error('Storage cleanup limit exceeded');if(typeof item.name!=='string'||!item.name||item.name==='.'||item.name==='..'||/[\\/\x00-\x1f\x7f]/.test(item.name))throw new Error('Invalid storage entry');const path=`${folder.prefix}/${item.name}`;if(path.length>1024)throw new Error('Storage path too long');if(item.id===null){if(folder.depth>=12)throw new Error('Storage nesting limit exceeded');queue.push({prefix:path,depth:folder.depth+1});}else if(typeof item.id==='string'&&item.id)paths.push(path);else throw new Error('Invalid storage entry');}if(result.data.length<100)break;offset+=result.data.length;}}
 for(let offset=0;offset<paths.length;offset+=100){const result=await bucket.remove(paths.slice(offset,offset+100));if(result.error)throw new Error('Could not remove storage objects');}
 const remaining=await bucket.list(userId,{limit:1,offset:0,sortBy:{column:'name',order:'asc'}});if(remaining.error||!remaining.data||remaining.data.length)throw new Error('Storage cleanup incomplete');return paths.length;
}
