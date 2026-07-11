/**
 * Command Parser translates natural language prompts into structured JSON.
 *
 * NOTE: This is currently a rule-based regex implementation.
 * Future iterations will replace this with a true LLM call (e.g. Claude 3.5 Sonnet)
 * to handle complex reasoning and unstructured commands.
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

  // 2. Rich Task Creation
  // Syntax: "task [title], priority [prio], assign to [name], due [date]"
  // Or just "bug in checkout, high priority, assign to Priya, due Friday"
  if (
    lowercasePrompt.includes('task') ||
    lowercasePrompt.includes('priority') ||
    lowercasePrompt.includes('assign to') ||
    lowercasePrompt.includes('due') ||
    lowercasePrompt.includes('bug')
  ) {
    const parts = prompt.split(',').map(p => p.trim())
    const title = parts[0].replace(/^(create task|add task|new task):?\s*/i, '')

    const payload = {
      title,
      priority: 'medium',
      assigneeName: null,
      dueDate: null
    }

    parts.slice(1).forEach(part => {
      const p = part.toLowerCase()
      if (p.includes('priority')) {
        if (p.includes('high')) payload.priority = 'high'
        else if (p.includes('low')) payload.priority = 'low'
        else if (p.includes('medium')) payload.priority = 'medium'
      } else if (p.includes('assign to')) {
        payload.assigneeName = part.replace(/assign to/i, '').trim()
      } else if (p.includes('due')) {
        payload.dueDate = part.replace(/due/i, '').trim()
      }
    })

    if (title) {
      return {
        type: 'CREATE_TASK_RICH',
        payload
      }
    }
  }

  // 3. Simple Multi-Task Creation (Legacy support)
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

  // 4. Plan Sprint
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
    message: "I didn't quite catch that. Try 'Create project Website' or 'task Fix login, high priority, assign to Alex'."
  }
}
