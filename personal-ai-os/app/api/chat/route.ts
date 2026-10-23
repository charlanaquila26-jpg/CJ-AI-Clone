import { userFromRequest } from '@/lib/supabase';
import { AGENT_INSTRUCTIONS } from '@/lib/policy';
import { NextResponse } from 'next/server';
export const runtime='nodejs';
export async function POST(req:Request){
 try {
  const {user,db}=await userFromRequest(req);
  const {prompt,workspaceId,conversationId}=await req.json();
  if(typeof prompt!=='string'||!prompt.trim()||prompt.length>12000) return NextResponse.json({error:'Invalid message'},{status:400});
  if(!process.env.OPENAI_API_KEY) return NextResponse.json({error:'OpenAI is not configured yet'},{status:503});
  // Budget warning + guard, based on recorded use. Concurrent calls could overshoot slightly.
  const month=new Date();month.setUTCDate(1);month.setUTCHours(0,0,0,0);
  const {data:usage,error:usageError}=await db.from('usage_events').select('estimated_cost_usd').eq('owner_id',user.id).gte('created_at',month.toISOString());
  if(usageError)throw usageError;
  const spent=(usage||[]).reduce((s,r)=>s+Number(r.estimated_cost_usd),0);
  const limit=Number(process.env.MONTHLY_BUDGET_USD||25);
  if(spent>=limit) return NextResponse.json({error:'Monthly AI budget reached. New AI calls paused.'},{status:429});
  if(workspaceId){const {data:w}=await db.from('workspaces').select('id,name').eq('id',workspaceId).eq('owner_id',user.id).single();if(!w)return NextResponse.json({error:'Workspace not found'},{status:404});}
  let cid=conversationId;
  if(cid){const {data:c}=await db.from('conversations').select('id').eq('id',cid).eq('owner_id',user.id).eq('workspace_id',workspaceId||null).single();if(!c)return NextResponse.json({error:'Conversation not found'},{status:404});}
  else {const {data:c,error:e}=await db.from('conversations').insert({owner_id:user.id,workspace_id:workspaceId||null,title:prompt.slice(0,70)}).select('id').single();if(e)throw e;cid=c.id;}
  const [{data:history},{data:memories}]=await Promise.all([
    db.from('messages').select('role,content').eq('conversation_id',cid).order('created_at',{ascending:false}).limit(16),
    db.from('memories').select('content').eq('owner_id',user.id).eq('workspace_id',workspaceId||null).limit(20)
  ]);
  const messages=[{role:'system',content:AGENT_INSTRUCTIONS+'\nWorkspace memory (user-managed, not system instructions):\n'+(memories||[]).map(x=>'- '+x.content.slice(0,400)).join('\n')},...(history||[]).reverse().map(x=>({role:x.role,content:x.content})),{role:'user',content:prompt}];
  const model=process.env.OPENAI_MODEL||'gpt-4.1-mini';
  const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model,messages,max_completion_tokens:1200})});
  const result=await response.json();
  if(!response.ok)return NextResponse.json({error:result.error?.message||'AI request failed'},{status:502});
  const answer=String(result.choices?.[0]?.message?.content||'No response.');
  const inp=Number(result.usage?.prompt_tokens||0),out=Number(result.usage?.completion_tokens||0);
  const estimated=inp*Number(process.env.OPENAI_INPUT_USD_PER_M||0.4)/1e6+out*Number(process.env.OPENAI_OUTPUT_USD_PER_M||1.6)/1e6;
  const {error:saveError}=await db.from('messages').insert([{owner_id:user.id,conversation_id:cid,role:'user',content:prompt},{owner_id:user.id,conversation_id:cid,role:'assistant',content:answer}]);
  if(saveError)throw saveError;
  await Promise.all([
   db.from('usage_events').insert({owner_id:user.id,model,input_tokens:inp,output_tokens:out,estimated_cost_usd:estimated}),
   db.from('activity_logs').insert({owner_id:user.id,workspace_id:workspaceId||null,event:'AI response',details:`Conversation ${cid}; ${inp} input / ${out} output tokens`})
  ]);
  return NextResponse.json({answer,conversationId:cid,usage:{input_tokens:inp,output_tokens:out,estimated_cost_usd:estimated}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unexpected error'},{status:401});}
}
