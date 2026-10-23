import { createClient } from '@supabase/supabase-js';
export function publicClient() {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL; const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key) throw new Error('Configure Supabase URL and publishable key');
 return createClient(url,key);
}
export function adminClient(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL; const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key) throw new Error('Missing server-only Supabase config');
 return createClient(url,key,{auth:{persistSession:false}});
}
export async function userFromRequest(req:Request){
 const auth=req.headers.get('authorization')||'';
 if(!auth.startsWith('Bearer ')) throw new Error('Not authenticated');
 const jwt=auth.slice(7); const client=publicClient();
 const {data,error}=await client.auth.getUser(jwt);
 if(error||!data.user) throw new Error('Invalid session');
 // Passing the user's JWT to Supabase ensures RLS applies to all queries.
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{global:{headers:{Authorization:`Bearer ${jwt}`}},auth:{persistSession:false}});
 return {user:data.user,db};
}
