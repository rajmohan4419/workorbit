/**
 * Critical Path Method (CPM) Implementation
 *
 * Computes Early Start (ES), Early Finish (EF), Late Start (LS), Late Finish (LF),
 * and Slack (Float) for a set of tasks with dependencies.
 */

export function calculateCriticalPath(tasks, dependencies) {
  if (!tasks.length) return { tasks: [], criticalPathIds: [] }

  const taskMap = new Map(tasks.map(t => [t.id, {
    ...t,
    duration: t.estimate_hours || 1, // Default 1 hour if no estimate
    es: 0, ef: 0, ls: 0, lf: 0, slack: 0,
    predecessors: [],
    successors: []
  }]))

  // Build adjacency list
  dependencies.forEach(dep => {
    const task = taskMap.get(dep.task_id)
    const dependsOn = taskMap.get(dep.depends_on_id)
    if (task && dependsOn) {
      task.predecessors.push(dep.depends_on_id)
      dependsOn.successors.push(dep.task_id)
    }
  })

  const sortedTasks = topologicalSort(Array.from(taskMap.values()))
  if (!sortedTasks) return { tasks: Array.from(taskMap.values()), criticalPathIds: [] }

  // Forward Pass (Early Start/Finish)
  sortedTasks.forEach(task => {
    if (task.predecessors.length === 0) {
      task.es = 0
    } else {
      task.es = Math.max(...task.predecessors.map(id => taskMap.get(id).ef))
    }
    task.ef = task.es + task.duration
  })

  // Backward Pass (Late Start/Finish)
  const maxEF = Math.max(...sortedTasks.map(t => t.ef))
  const reversedTasks = [...sortedTasks].reverse()

  reversedTasks.forEach(task => {
    if (task.successors.length === 0) {
      task.lf = maxEF
    } else {
      task.lf = Math.min(...task.successors.map(id => taskMap.get(id).ls))
    }
    task.ls = task.lf - task.duration
    task.slack = task.lf - task.ef
  })

  const criticalPathIds = sortedTasks
    .filter(t => t.slack <= 0)
    .map(t => t.id)

  return {
    tasks: Array.from(taskMap.values()),
    criticalPathIds
  }
}

function topologicalSort(tasks) {
  const result = []
  const visited = new Set()
  const temp = new Set()

  function visit(task) {
    if (temp.has(task.id)) return false // Cycle detected
    if (visited.has(task.id)) return true

    temp.add(task.id)
    for (const predId of task.predecessors) {
      const pred = tasks.find(t => t.id === predId)
      if (pred && !visit(pred)) return false
    }
    temp.delete(task.id)
    visited.add(task.id)
    result.push(task)
    return true
  }

  for (const task of tasks) {
    if (!visited.has(task.id)) {
      if (!visit(task)) return null // Cycle
    }
  }

  return result
}
