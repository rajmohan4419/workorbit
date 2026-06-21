/**
 * Command Parser translates natural language prompts into structured JSON.
 * This is a rule-based mock implementation that handles common scenarios requested:
 * - "Create project [Name]"
 * - "Create [Number] tasks for [Context/Project]"
 * - "Plan sprint for [Context]"
 */

export const parseCommand = (prompt) => {
  const lowercasePrompt = prompt.toLowerCase().trim()

  // 1. Create Project
  if (lowercasePrompt.startsWith('create project')) {
    const name = prompt.slice(14).trim()
    return {
      type: 'CREATE_PROJECT',
      payload: { name }
    }
  }

  // 2. Create Tasks
  const taskMatch = lowercasePrompt.match(/create (\d+) tasks? (?:for|in) (.*)/)
  if (taskMatch) {
    const count = parseInt(taskMatch[1])
    const context = taskMatch[2].trim()
    return {
      type: 'CREATE_TASKS',
      payload: {
        count,
        context,
        titles: Array.from({ length: count }, (_, i) => `Task ${i + 1} for ${context}`)
      }
    }
  }

  // 3. Plan Sprint
  if (lowercasePrompt.includes('plan sprint')) {
    const context = lowercasePrompt.replace('plan sprint', '').replace('for', '').trim()
    return {
      type: 'PLAN_SPRINT',
      payload: {
        name: `Sprint for ${context || 'Release'}`,
        goal: `Complete ${context || 'objectives'}`
      }
    }
  }

  return {
    type: 'UNKNOWN',
    message: "I didn't quite catch that. Try 'Create project Website' or 'Create 5 tasks for onboarding'."
  }
}
