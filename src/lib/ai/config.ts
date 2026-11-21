/** Match the database's AI observation model-name constraint before reserving quota. */
export function validAiModelName(value:unknown):value is string {
 return typeof value==='string'&&value.length>=1&&value.length<=160&&/^[A-Za-z0-9._:/-]+$/.test(value);
}
