/**
 * OrbitBoard commercial catalogue.
 * Prices are INR values for display and server-side billing configuration.
 * Never accept an amount or entitlement from the browser as authoritative.
 * Razorpay plan IDs are supplied through server environment variables.
 */
export const PLAN_CATALOG = Object.freeze({
  free: Object.freeze({ code:'free', name:'Free', billingInterval:null, amountInr:0, razorpayPlanEnv:null,
    features:Object.freeze({ ads:true, saved_workspaces:false, advanced_exports:false, bulk_processing:false, business_workflows:false, priority_support:false }),
    limits:Object.freeze({ advanced_export:0, bulk_job:0, business_workflow:0 }) }),
  pro_monthly: Object.freeze({ code:'pro_monthly', name:'OrbitBoard Pro', billingInterval:'monthly', amountInr:249, razorpayPlanEnv:'RAZORPAY_PLAN_PRO_MONTHLY',
    features:Object.freeze({ ads:false, saved_workspaces:true, advanced_exports:true, bulk_processing:true, business_workflows:false, priority_support:false }),
    limits:Object.freeze({ advanced_export:100, bulk_job:30, business_workflow:0 }) }),
  pro_annual: Object.freeze({ code:'pro_annual', name:'OrbitBoard Pro Annual', billingInterval:'annual', amountInr:1999, razorpayPlanEnv:'RAZORPAY_PLAN_PRO_ANNUAL',
    features:Object.freeze({ ads:false, saved_workspaces:true, advanced_exports:true, bulk_processing:true, business_workflows:false, priority_support:false }),
    limits:Object.freeze({ advanced_export:1200, bulk_job:360, business_workflow:0 }) }),
  business_monthly: Object.freeze({ code:'business_monthly', name:'OrbitBoard Business', billingInterval:'monthly', amountInr:799, razorpayPlanEnv:'RAZORPAY_PLAN_BUSINESS_MONTHLY',
    features:Object.freeze({ ads:false, saved_workspaces:true, advanced_exports:true, bulk_processing:true, business_workflows:true, priority_support:true }),
    limits:Object.freeze({ advanced_export:500, bulk_job:200, business_workflow:100 }) }),
  business_annual: Object.freeze({ code:'business_annual', name:'OrbitBoard Business Annual', billingInterval:'annual', amountInr:7999, razorpayPlanEnv:'RAZORPAY_PLAN_BUSINESS_ANNUAL',
    features:Object.freeze({ ads:false, saved_workspaces:true, advanced_exports:true, bulk_processing:true, business_workflows:true, priority_support:true }),
    limits:Object.freeze({ advanced_export:6000, bulk_job:2400, business_workflow:1200 }) }),
});
export const ONE_TIME_PRODUCTS = Object.freeze({
  'premium-export-pack': Object.freeze({ code:'premium-export-pack', name:'Premium Export Pack', amountInr:99, currency:'INR', entitlement:'advanced_exports' }),
  'bulk-processing-pack': Object.freeze({ code:'bulk-processing-pack', name:'Bulk Processing Pack', amountInr:149, currency:'INR', entitlement:'bulk_processing' }),
});
export function getPlan(planCode) {
  return Object.prototype.hasOwnProperty.call(PLAN_CATALOG, planCode) ? PLAN_CATALOG[planCode] : null;
}
export function getRazorpayPlanId(planCode, env = globalThis.process?.env || {}) {
  const plan = getPlan(planCode);
  return plan?.razorpayPlanEnv ? (env[plan.razorpayPlanEnv] || null) : null;
}
export function getPlanPricePaise(planCode) {
  const plan = getPlan(planCode);
  return plan ? plan.amountInr * 100 : null;
}
