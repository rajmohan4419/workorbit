import {describe,it,expect,beforeAll,afterAll} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
let db;
const user='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
const call=(number,request=number,u=user)=>db.query('select (public.finalize_invoice($1,$2,$3,$4,$5)).id as id',[u,`10000000-0000-4000-8000-${String(request).padStart(12,'0')}`,`hash-${number}`,JSON.stringify({schemaVersion:2,type:'b2b',seller:{gstin:u===user?'27AAPFU0939F1ZV':'OTHER'},meta:{invoiceDate:'2026-11-15',invoiceNumber:`INV-${number}`}}),'SYNTHETIC-PDF']);
beforeAll(async()=>{db=new PGlite();await db.exec(`create schema auth;create table auth.users(id uuid primary key);create role anon;create role authenticated;create role service_role bypassrls;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,service_role;grant execute on function auth.uid() to authenticated;insert into auth.users values('${user}'),('${other}');create table public.user_subscriptions(user_id uuid,plan_code text,status text,current_period_end timestamptz);grant select on public.user_subscriptions to service_role;`);await db.exec(await readFile(new URL('../../../supabase/migrations/20261115055747_invoice_snapshots_and_allowance.sql',import.meta.url),'utf8'));await db.exec('set role service_role');},20000);
afterAll(()=>db?.close());
describe('atomic invoice persistence and RLS',()=>{
 it('caps concurrent queued finalizations at five and makes retries free',async()=>{
  const outcomes=await Promise.allSettled(Array.from({length:8},(_,i)=>call(i+1)));
  expect(outcomes.filter(o=>o.status==='fulfilled')).toHaveLength(5);expect(outcomes.filter(o=>o.status==='rejected')).toHaveLength(3);
  const before=await db.query('select used from public.invoice_usage where user_id=$1',[user]);expect(before.rows[0].used).toBe(5);
  const saved=await call(1);const again=await call(1);expect(again.rows).toEqual(saved.rows);
  await expect(call(99,1)).rejects.toThrow();
  const count=await db.query('select count(*)::int n from public.invoice_snapshots where user_id=$1',[user]);expect(count.rows[0].n).toBe(5);
 });
 it('does not consume quota on a failed uniqueness insert and grants paid access from trusted subscriptions',async()=>{
  await db.exec('reset role');await db.query("insert into public.user_subscriptions values($1,'pro_monthly','active',now()+interval '1 day')",[user]);await db.exec('set role service_role');
  await call(6,9);const before=(await db.query('select used from invoice_usage where user_id=$1',[user])).rows[0].used;
  await expect(call(6,10)).rejects.toThrow();expect((await db.query('select used from invoice_usage where user_id=$1',[user])).rows[0].used).toBe(before);
 });
 it('enforces account isolation, immutable snapshots and preference ownership in PostgreSQL',async()=>{
  await call(1,1,other);await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);await db.exec('set role authenticated');
  expect((await db.query('select distinct user_id from invoice_snapshots')).rows).toEqual([{user_id:other}]);
  await expect(db.query('update invoice_snapshots set invoice_number=$1',['FORGED'])).rejects.toThrow();
  await expect(db.query('insert into invoice_preferences(user_id,invoice_type,template) values($1,$2,$3)',[user,'b2b','modern'])).rejects.toThrow();
  await db.query('insert into invoice_preferences(user_id,invoice_type,template) values($1,$2,$3)',[other,'b2b','compact']);
  expect((await db.query('select template from invoice_preferences')).rows[0].template).toBe('compact');
  await db.query('insert into invoice_preferences(user_id,invoice_type,template) values($1,$2,$3)',[other,'export','shipping']);
  expect((await db.query('select invoice_type,template from invoice_preferences order by invoice_type')).rows).toEqual([{invoice_type:'b2b',template:'compact'},{invoice_type:'export',template:'shipping'}]);
  await expect(call(2,2,other)).rejects.toThrow(/permission/);
  await db.exec('reset role;set role anon');await expect(db.query('select * from invoice_snapshots')).rejects.toThrow(/permission/);await db.exec('reset role;set role service_role');
 });
});
