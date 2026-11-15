import {supabase} from '../supabase.js';
export async function invoiceRequest(body,path=''){
 if(!supabase?.auth)throw new Error('Account service is unavailable. Your draft remains local.');
 const {data,error}=await supabase.auth.getSession();if(error||!data?.session?.access_token)throw new Error('Sign in to continue. Your draft remains unchanged.');
 const response=await fetch('/api/invoices'+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${data.session.access_token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 if(!response.ok){const data=await response.json();throw new Error([data.error,...(data.errors||[])].join('\n'));}
 return response.headers.get('content-type')?.includes('application/pdf')?response.blob():response.json();
}
