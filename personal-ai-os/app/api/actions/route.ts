import {NextResponse} from 'next/server';import {userFromRequest} from '@/lib/supabase';
export async function POST(req:Request){
 try{const {user,db}=await userFromRequest(req);const {approvalId,decision}=await req.json();
 if(!['approved','rejected'].includes(decision))return NextResponse.json({error:'Invalid decision'},{status:400});
 const {data,error}=await db.from('approvals').update({status:decision,reviewed_at:new Date().toISOString()}).eq('id',approvalId).eq('owner_id',user.id).eq('status','pending').select('id,title,workspace_id').single();if(error||!data)return NextResponse.json({error:'Approval not pending'},{status:404});
 await db.from('activity_logs').insert({owner_id:user.id,workspace_id:data.workspace_id,event:`Approval ${decision}`,details:data.title});
 return NextResponse.json({ok:true,notice:'Decision recorded. No external action executed: connectors are not enabled.'});
 }catch{return NextResponse.json({error:'Unauthorized'},{status:401});}
}
