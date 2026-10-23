import {NextResponse} from 'next/server';import {adminClient} from '@/lib/supabase';
export async function GET(req:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=adminClient(),now=new Date().toISOString();
 const {data:jobs,error}=await db.from('scheduled_jobs').select('*').eq('enabled',true).lte('next_run_at',now).limit(50);
 if(error)return NextResponse.json({error:'Job retrieval failed'},{status:500});
 let processed=0;
 for(const j of jobs||[]){
  // Atomic claim; repeated invocations cannot claim the same prior run timestamp.
  const next=new Date(Date.now()+j.interval_hours*3600_000).toISOString();
  const {data:claim}=await db.from('scheduled_jobs').update({next_run_at:next}).eq('id',j.id).eq('next_run_at',j.next_run_at).select('id').maybeSingle();
  if(!claim)continue;
  const {error:taskError}=await db.from('tasks').insert({owner_id:j.owner_id,workspace_id:j.workspace_id,title:j.task_title,status:'pending',details:`Scheduled by ${j.name}. Requires owner action or a future approved tool integration.`});
  await db.from('activity_logs').insert({owner_id:j.owner_id,workspace_id:j.workspace_id,event:taskError?'Scheduled job failed':'Scheduled task created',details:j.name});
  if(!taskError)processed++;
 }
 return NextResponse.json({processed});
}
