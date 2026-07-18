/**
 * Analytics Service for OrbitBoard
 * Tracks usage events and logs them for debug/verification and potential integration with third-party tools.
 */
export const analyticsService = {
  /**
   * Track a custom event.
   * @param {string} eventName Name of the event being tracked.
   * @param {object} [properties] Extra event metadata.
   */
  track(eventName, properties = {}) {
    const timestamp = new Date().toISOString()
    const eventPayload = {
      event: eventName,
      properties,
      timestamp,
    }

    // 1. Console Log with nice styling for development visibility
    console.log(
      `%c[Analytics]%c Event: "${eventName}"`,
      'color: #2563EB; font-weight: bold; background: #EFF6FF; padding: 2px 4px; rounded: 4px;',
      'color: #1E293B; font-weight: medium;',
      properties
    )

    // 2. Persist in localStorage log array for debugging, verification, and end-to-end testing
    try {
      const storedEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]')
      // Cap at 1000 events to prevent localstorage overflow
      if (storedEvents.length >= 1000) {
        storedEvents.shift()
      }
      storedEvents.push(eventPayload)
      localStorage.setItem('analytics_events', JSON.stringify(storedEvents))
    } catch (err) {
      console.warn('[Analytics] Failed to save event to localStorage:', err)
    }

    // 3. Dispatch a custom window event for real-time reactivity if needed
    if (typeof window !== 'undefined') {
      const customEvent = new CustomEvent('orbitboard:analytics', { detail: eventPayload })
      window.dispatchEvent(customEvent)
    }

    return eventPayload
  },

  /**
   * Get all tracked events stored in localStorage.
   * @returns {Array} List of tracked events.
   */
  getEvents() {
    try {
      return JSON.parse(localStorage.getItem('analytics_events') || '[]')
    } catch {
      return []
    }
  },

  /**
   * Clear all tracked events from localStorage.
   */
  clearEvents() {
    try {
      localStorage.removeItem('analytics_events')
    } catch {
      // Ignore
    }
  }
}
