// Invoice access extends the existing trusted user_subscriptions billing system.
// No new prices or checkout products. Null paid limits mean unlimited at launch.
export const INVOICE_TIERS={free:{name:'Free',finalizations:5,reset:'lifetime'},pro:{name:'Pro',finalizations:null,reset:'lifetime'},business:{name:'Business',finalizations:null,reset:'lifetime'}};
export const INVOICE_CAPABILITIES={templateDefaults:true,history:true,historySearch:true,savedCustomers:false,savedItems:false,paymentTracking:false,reminders:false,bulk:false,teams:false};
export function invoiceTier(code){return String(code).startsWith('business_')?'business':String(code).startsWith('pro_')?'pro':'free';}
