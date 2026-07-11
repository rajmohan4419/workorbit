import { supabase } from '../supabase'

export const billingService = {
  async createCheckoutSession(workspaceId) {
    return await supabase.functions.invoke('create-checkout-session', {
      body: { workspaceId },
    })
  },
}