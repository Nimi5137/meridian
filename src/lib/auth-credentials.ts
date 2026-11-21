/** Passwords are opaque: do not trim or normalize them. */
export function passwordInput(value:FormDataEntryValue|null, forNewPassword:boolean):string|null {
 if(typeof value!=='string'||value.length===0||value.length>1024)return null;
 if(forNewPassword&&(value.length<8||!value.trim()))return null;
 return value;
}
