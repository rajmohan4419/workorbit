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
  if (lowercasePrompt.startsWith('create project') || lowercasePrompt.startsWith('add project')) {
    const name = prompt.replace(/^(create project|add project)/i, '').trim()
    return {
      type: 'CREATE_PROJECT',
      payload: { name }
    }
  }

  // 2. Create Tasks
  const taskCountMatch = lowercasePrompt.match(/^(?:create|add) (\d+) tasks? (?:for|in) (.*)/)
  if (taskCountMatch) {
    const count = parseInt(taskCountMatch[1])
    const context = taskCountMatch[2].trim()
    return {
      type: 'CREATE_TASKS',
      payload: {
        count,
        context,
        titles: Array.from({ length: count }, (_, i) => `Task ${i + 1} for ${context}`)
      }
    }
  }

  const singleTaskMatch = lowercasePrompt.match(/^(?:new task|add task|create task):? (.*) (?:for|in) (.*)/)
  if (singleTaskMatch) {
     const title = singleTaskMatch[1].trim()
     const context = singleTaskMatch[2].trim()
     return {
       type: 'CREATE_TASKS',
       payload: {
         count: 1,
         context,
         titles: [title]
       }
     }
  }

  // 3. Plan Sprint
  if (lowercasePrompt.includes('plan sprint') || lowercasePrompt.includes('schedule sprint')) {
    const context = lowercasePrompt
      .replace(/plan sprint|schedule sprint/g, '')
      .replace('for', '')
      .trim()

    return {
      type: 'PLAN_SPRINT',
      payload: {
        name: context ? `Sprint: ${context}` : 'New Sprint',
        goal: context ? `Complete ${context}` : 'Sprint objectives'
      }
    }
  }

  return {
    type: 'UNKNOWN',
    message: "I didn't quite catch that. Try 'Create project Website' or 'Create 5 tasks for onboarding'."
  }
}
