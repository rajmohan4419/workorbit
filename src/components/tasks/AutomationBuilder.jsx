import { useState } from 'react'
import {
  Zap,
  Play,
  Trash2,
  Plus,
  ArrowLeft,
  Settings,
  User,
  CheckCircle2,
  MessageSquare,
  Mail,
  Bell,
  Clock,
  Briefcase,
  AlertCircle,
  Users,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  RefreshCw,
  Folder,
  Tag,
  Shield,
  Cpu,
  Info,
  X
} from 'lucide-react'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { useProjectStore } from '../../store/projectStore'
import { useTaskStore } from '../../store/taskStore'

// Trigger definitions with icons and descriptions
const TRIGGER_TYPES = [
  { id: 'Task Created', desc: 'Runs when a new task is created', icon: Plus, color: 'text-emerald-500 bg-emerald-50' },
  { id: 'Task Updated', desc: 'Runs when any task details are modified', icon: Settings, color: 'text-blue-500 bg-blue-50' },
  { id: 'Task Deleted', desc: 'Runs when a task is deleted', icon: Trash2, color: 'text-red-500 bg-red-50' },
  { id: 'Status Changed', desc: 'Runs when task status changes', icon: CheckCircle2, color: 'text-indigo-500 bg-indigo-50' },
  { id: 'Assignee Changed', desc: 'Runs when a task is reassigned', icon: User, color: 'text-amber-500 bg-amber-50' },
  { id: 'Due Date Changed', desc: 'Runs when task due date changes', icon: Clock, color: 'text-rose-500 bg-rose-50' },
  { id: 'Label Added', desc: 'Runs when a label is added to a task', icon: Tag, color: 'text-teal-500 bg-teal-50' },
  { id: 'Comment Added', desc: 'Runs when a comment is posted', icon: MessageSquare, color: 'text-purple-500 bg-purple-50' },
  { id: 'Subtask Completed', desc: 'Runs when a subtask is checked off', icon: CheckCircle2, color: 'text-green-500 bg-green-50' },
  { id: 'Sprint Started', desc: 'Runs when a sprint starts', icon: Play, color: 'text-orange-500 bg-orange-50' },
  { id: 'Sprint Ended', desc: 'Runs when a sprint ends', icon: AlertCircle, color: 'text-violet-500 bg-violet-50' },
  { id: 'Sprint Closed', desc: 'Runs when a sprint is closed', icon: Folder, color: 'text-gray-500 bg-gray-50' },
  { id: 'Project Created', desc: 'Runs when a new project is created', icon: Briefcase, color: 'text-sky-500 bg-sky-50' },
  { id: 'Project Archived', desc: 'Runs when a project is archived', icon: Folder, color: 'text-zinc-500 bg-zinc-50' },
  { id: 'Member Invited', desc: 'Runs when a team member is invited', icon: Mail, color: 'text-amber-600 bg-amber-50' },
  { id: 'Member Joined', desc: 'Runs when a member joins the workspace', icon: Users, color: 'text-green-600 bg-green-50' },
  { id: 'Role Changed', desc: 'Runs when a member role changes', icon: Shield, color: 'text-blue-600 bg-blue-50' },
  { id: 'Time Tracking', desc: 'Runs on general time tracking changes', icon: Clock, color: 'text-cyan-500 bg-cyan-50' },
  { id: 'Timer Started', desc: 'Runs when a user starts a task timer', icon: Play, color: 'text-emerald-600 bg-emerald-50' },
  { id: 'Timer Stopped', desc: 'Runs when a user stops a task timer', icon: AlertCircle, color: 'text-red-600 bg-red-50' },
  { id: 'Logged Hours', desc: 'Runs when new hours are logged on a task', icon: Clock, color: 'text-fuchsia-500 bg-fuchsia-50' },
]

// Conditions dropdown and fields options
const CONDITION_FIELDS = [
  { id: 'status', label: 'Status', type: 'select', options: ['todo', 'in_progress', 'in_review', 'done'] },
  { id: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high'] },
  { id: 'assigned_to', label: 'Assignee', type: 'member' },
  { id: 'label', label: 'Label', type: 'label' },
  { id: 'story_points', label: 'Story Points', type: 'number' },
  { id: 'estimate_hours', label: 'Estimate Hours', type: 'number' },
  { id: 'is_blocked', label: 'Blocked Status', type: 'boolean' },
]

const CONDITION_OPERATORS = [
  { id: 'equals', label: 'equals' },
  { id: 'not_equals', label: 'does not equal' },
  { id: 'greater_than', label: 'is greater than' },
  { id: 'less_than', label: 'is less than' },
  { id: 'contains', label: 'contains' },
  { id: 'is_set', label: 'is set' },
  { id: 'is_not_set', label: 'is not set' },
]

// Actions configuration
const ACTION_TYPES = [
  { id: 'Assign User', label: 'Assign User', desc: 'Assigns the task to a workspace member', icon: User, color: 'text-amber-500 bg-amber-50' },
  { id: 'Change Status', label: 'Change Status', desc: 'Updates task status', icon: CheckCircle2, color: 'text-indigo-500 bg-indigo-50' },
  { id: 'Set Priority', label: 'Set Priority', desc: 'Updates task priority level', icon: AlertCircle, color: 'text-rose-500 bg-rose-50' },
  { id: 'Set Due Date', label: 'Set Due Date', desc: 'Assigns a due date or relative timeframe', icon: Clock, color: 'text-teal-500 bg-teal-50' },
  { id: 'Move Sprint', label: 'Move Sprint', desc: 'Moves the task to a designated sprint', icon: Zap, color: 'text-orange-500 bg-orange-50' },
  { id: 'Archive Task', label: 'Archive Task', desc: 'Archives the task (soft delete)', icon: Folder, color: 'text-zinc-500 bg-zinc-50' },
  { id: 'Create Comment', label: 'Create Comment', desc: 'Posts an automated comment on the task', icon: MessageSquare, color: 'text-purple-500 bg-purple-50' },
  { id: 'Create Subtask', label: 'Create Subtask', desc: 'Adds a predefined subtask to the task', icon: Plus, color: 'text-emerald-500 bg-emerald-50' },
  { id: 'Send Notification', label: 'Send Notification', desc: 'Dispatches an app notification to assignees/owners', icon: Bell, color: 'text-pink-500 bg-pink-50' },
  { id: 'Send Email', label: 'Send Email', desc: 'Sends an automated email notification', icon: Mail, color: 'text-blue-500 bg-blue-50' },
  { id: 'Add Label', label: 'Add Label', desc: 'Appends a label to the task', icon: Tag, color: 'text-teal-600 bg-teal-50' },
  { id: 'Remove Label', label: 'Remove Label', desc: 'Removes a label from the task', icon: Tag, color: 'text-red-500 bg-red-50' },
]

const DEFAULT_AUTOMATIONS = [
  {
    id: 'demo-1',
    name: 'Auto-assign High Priority Tasks',
    active: true,
    trigger: 'Task Created',
    matchType: 'AND',
    conditions: [
      { field: 'priority', operator: 'equals', value: 'high' }
    ],
    actions: [
      { type: 'Create Comment', config: { text: 'Automated notification: This high priority task requires immediate attention.' } }
    ],
    elseActions: [],
    enableElse: false
  },
  {
    id: 'demo-2',
    name: 'Move to In Progress on Timer Start',
    active: false,
    trigger: 'Timer Started',
    matchType: 'AND',
    conditions: [
      { field: 'status', operator: 'equals', value: 'todo' }
    ],
    actions: [
      { type: 'Change Status', config: { status: 'in_progress' } }
    ],
    elseActions: [],
    enableElse: false
  }
]

export default function AutomationBuilder({ projectId }) {
  const workspaceMembers = useWorkspaceStore((state) => state.members)
  const sprints = useProjectStore((state) => state.sprints)
  const projectLabels = useTaskStore((state) => state.projectLabels)

  const [automations, setAutomations] = useState(() => {
    const key = `orbitboard_automations_${projectId}`
    const stored = localStorage.getItem(key)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return DEFAULT_AUTOMATIONS
      }
    }
    return DEFAULT_AUTOMATIONS
  })
  const [editorState, setEditorState] = useState(null) // { mode: 'create'|'edit', automation: {...} }
  const [simulatorState, setSimulatorState] = useState(null) // { automation: {...}, running: boolean, logs: [], payload: {...} }


  const saveToStorage = (updated) => {
    setAutomations(updated)
    const key = `orbitboard_automations_${projectId}`
    localStorage.setItem(key, JSON.stringify(updated))
  }

  const handleToggleActive = (id) => {
    const updated = automations.map(auto => {
      if (auto.id === id) {
        return { ...auto, active: !auto.active }
      }
      return auto
    })
    saveToStorage(updated)
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this automation?')) {
      const updated = automations.filter(auto => auto.id !== id)
      saveToStorage(updated)
    }
  }

  const handleCreateNew = () => {
    setEditorState({
      mode: 'create',
      automation: {
        id: `auto-${Date.now()}`,
        name: 'New Custom Automation',
        active: true,
        trigger: 'Task Created',
        matchType: 'AND',
        conditions: [],
        actions: [],
        elseActions: [],
        enableElse: false
      }
    })
  }

  const handleEdit = (auto) => {
    setEditorState({
      mode: 'edit',
      automation: { ...auto }
    })
  }

  const handleSaveEditor = () => {
    if (!editorState.automation.name.trim()) {
      alert('Automation name is required.')
      return
    }
    if (editorState.automation.actions.length === 0) {
      alert('At least one action is required.')
      return
    }

    let updated
    if (editorState.mode === 'create') {
      updated = [...automations, editorState.automation]
    } else {
      updated = automations.map(auto => auto.id === editorState.automation.id ? editorState.automation : auto)
    }
    saveToStorage(updated)
    setEditorState(null)
  }

  // Conditions modification helpers
  const handleAddCondition = () => {
    const newCond = { field: 'status', operator: 'equals', value: 'todo' }
    setEditorState(prev => ({
      ...prev,
      automation: {
        ...prev.automation,
        conditions: [...prev.automation.conditions, newCond]
      }
    }))
  }

  const handleRemoveCondition = (index) => {
    const updatedConds = [...editorState.automation.conditions]
    updatedConds.splice(index, 1)
    setEditorState(prev => ({
      ...prev,
      automation: {
        ...prev.automation,
        conditions: updatedConds
      }
    }))
  }

  const handleConditionChange = (index, field, value) => {
    const updatedConds = [...editorState.automation.conditions]
    updatedConds[index] = { ...updatedConds[index], [field]: value }

    // If changing field, set sensible default value
    if (field === 'field') {
      if (value === 'status') updatedConds[index].value = 'todo'
      else if (value === 'priority') updatedConds[index].value = 'medium'
      else if (value === 'assigned_to') updatedConds[index].value = workspaceMembers[0]?.profiles?.id || ''
      else if (value === 'label') updatedConds[index].value = projectLabels[0]?.id || ''
      else if (value === 'story_points' || value === 'estimate_hours') updatedConds[index].value = '0'
      else if (value === 'is_blocked') updatedConds[index].value = 'true'
    }

    setEditorState(prev => ({
      ...prev,
      automation: {
        ...prev.automation,
        conditions: updatedConds
      }
    }))
  }

  // Actions modification helpers
  const handleAddAction = (isElse = false) => {
    const newAct = { type: 'Assign User', config: {} }
    const fieldName = isElse ? 'elseActions' : 'actions'
    setEditorState(prev => ({
      ...prev,
      automation: {
        ...prev.automation,
        [fieldName]: [...prev.automation[fieldName], newAct]
      }
    }))
  }

  const handleRemoveAction = (index, isElse = false) => {
    const fieldName = isElse ? 'elseActions' : 'actions'
    const updatedActs = [...editorState.automation[fieldName]]
    updatedActs.splice(index, 1)
    setEditorState(prev => ({
      ...prev,
      automation: {
        ...prev.automation,
        [fieldName]: updatedActs
      }
    }))
  }

  const handleActionChange = (index, key, val, isElse = false) => {
    const fieldName = isElse ? 'elseActions' : 'actions'
    const updatedActs = [...editorState.automation[fieldName]]
    if (key === 'type') {
      updatedActs[index] = { type: val, config: {} }
    } else {
      updatedActs[index] = {
        ...updatedActs[index],
        config: { ...updatedActs[index].config, [key]: val }
      }
    }
    setEditorState(prev => ({
      ...prev,
      automation: {
        ...prev.automation,
        [fieldName]: updatedActs
      }
    }))
  }

  // SIMULATOR FUNCTIONALITY
  const handleOpenSimulator = (auto) => {
    // Construct default mock payload
    const defaultPayload = {
      title: 'Fix auth session infinite loop',
      status: 'todo',
      priority: 'high',
      assigned_to: workspaceMembers[0]?.profiles?.id || '',
      label: projectLabels[0]?.id || '',
      story_points: 5,
      estimate_hours: 12,
      is_blocked: false,
      comment: 'This is a mock comment added on task.'
    }

    setSimulatorState({
      automation: auto,
      running: false,
      logs: [],
      payload: defaultPayload
    })
  }

  const runSimulation = () => {
    setSimulatorState(prev => ({ ...prev, running: true, logs: [] }))

    const auto = simulatorState.automation
    const payload = simulatorState.payload
    const logs = []

    // 1. Trigger phase
    logs.push({ type: 'trigger', text: `⚡ Trigger fired: "${auto.trigger}" detected.` })

    // Simulate delay for realism
    setTimeout(() => {
      // 2. Conditions evaluation phase
      let conditionsPassed = true
      if (auto.conditions.length === 0) {
        logs.push({ type: 'info', text: '🔍 No conditions configured. Bypassing check...' })
      } else {
        logs.push({ type: 'info', text: `🔍 Evaluating ${auto.conditions.length} condition(s) using logical ${auto.matchType} match:` })

        const evaluations = auto.conditions.map((cond, idx) => {
          let fieldVal = payload[cond.field]
          let targetVal = cond.value

          // Simple comparison logic
          let match = false
          if (cond.operator === 'equals') {
            match = String(fieldVal) === String(targetVal)
          } else if (cond.operator === 'not_equals') {
            match = String(fieldVal) !== String(targetVal)
          } else if (cond.operator === 'contains') {
            match = String(fieldVal).toLowerCase().includes(String(targetVal).toLowerCase())
          } else if (cond.operator === 'greater_than') {
            match = Number(fieldVal) > Number(targetVal)
          } else if (cond.operator === 'less_than') {
            match = Number(fieldVal) < Number(targetVal)
          } else if (cond.operator === 'is_set') {
            match = fieldVal !== undefined && fieldVal !== null && fieldVal !== ''
          } else if (cond.operator === 'is_not_set') {
            match = fieldVal === undefined || fieldVal === null || fieldVal === ''
          }

          logs.push({
            type: match ? 'success' : 'error',
            text: `   [Cond #${idx + 1}] Check if ${cond.field} (${fieldVal}) ${cond.operator.replace('_', ' ')} ${cond.operator.includes('set') ? '' : targetVal} -> ${match ? 'TRUE ✓' : 'FALSE ✗'}`
          })
          return match
        })

        if (auto.matchType === 'AND') {
          conditionsPassed = evaluations.every(v => v)
        } else {
          conditionsPassed = evaluations.some(v => v)
        }
      }

      // 3. Action Execution phase
      const runActionBlock = (actionsList, labelName) => {
        if (actionsList.length === 0) {
          logs.push({ type: 'info', text: `⚙️ No ${labelName} actions configured.` })
          return
        }

        logs.push({ type: 'info', text: `🚀 Executing ${labelName} action block (${actionsList.length} action(s)):` })
        actionsList.forEach((act, idx) => {
          let actLogText = ''
          if (act.type === 'Assign User') {
            const member = workspaceMembers.find(m => m.profiles.id === act.config.userId)
            actLogText = `Assign task to user "${member?.profiles?.full_name || 'Unassigned'}"`
          } else if (act.type === 'Change Status') {
            actLogText = `Update status to "${act.config.status || 'todo'}"`
          } else if (act.type === 'Set Priority') {
            actLogText = `Set priority to "${act.config.priority || 'medium'}"`
          } else if (act.type === 'Set Due Date') {
            actLogText = `Set due date to "${act.config.dueDate || 'today'}"`
          } else if (act.type === 'Move Sprint') {
            const sprint = sprints.find(s => s.id === act.config.sprintId)
            actLogText = `Move task to sprint "${sprint?.name || 'Sprint'}"`
          } else if (act.type === 'Archive Task') {
            actLogText = `Mark task as archived`
          } else if (act.type === 'Create Comment') {
            actLogText = `Post task comment: "${act.config.text || ''}"`
          } else if (act.type === 'Create Subtask') {
            actLogText = `Add subtask: "${act.config.title || 'Subtask'}"`
          } else if (act.type === 'Send Notification') {
            actLogText = `Dispatch notification: [${act.config.title || 'Alert'}] ${act.config.message || ''}`
          } else if (act.type === 'Send Email') {
            actLogText = `Send email: [${act.config.subject || 'Subject'}] to task members`
          } else if (act.type === 'Add Label') {
            const lbl = projectLabels.find(l => l.id === act.config.labelId)
            actLogText = `Add label "${lbl?.name || 'Label'}"`
          } else if (act.type === 'Remove Label') {
            const lbl = projectLabels.find(l => l.id === act.config.labelId)
            actLogText = `Remove label "${lbl?.name || 'Label'}"`
          }

          logs.push({ type: 'success', text: `   [Action #${idx + 1}] ${actLogText} ✓` })
        })
      }

      if (conditionsPassed) {
        logs.push({ type: 'success', text: '✅ Logic evaluation PASSED. Running THEN actions...' })
        runActionBlock(auto.actions, 'THEN')
      } else {
        logs.push({ type: 'error', text: '❌ Logic evaluation FAILED.' })
        if (auto.enableElse) {
          logs.push({ type: 'info', text: 'Running ELSE actions...' })
          runActionBlock(auto.elseActions, 'ELSE')
        } else {
          logs.push({ type: 'info', text: 'No ELSE block enabled. Simulation completed with no actions executed.' })
        }
      }

      logs.push({ type: 'finished', text: '🎉 Simulation finished successfully.' })

      setSimulatorState(prev => ({
        ...prev,
        running: false,
        logs
      }))
    }, 1200)
  }

  // RENDER SECTIONS
  if (editorState) {
    const auto = editorState.automation
    const selectedTriggerObj = TRIGGER_TYPES.find(t => t.id === auto.trigger) || TRIGGER_TYPES[0]
    const TriggerIcon = selectedTriggerObj.icon

    return (
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-8">
        <div className="flex items-center justify-between border-b border-gray-50 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditorState(null)}
              className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-500 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {editorState.mode === 'create' ? 'Create Custom Automation' : 'Edit Automation'}
              </h2>
              <p className="text-xs text-gray-400">Design custom automated actions for your board</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditorState(null)}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEditor}
              className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
            >
              Save Automation
            </button>
          </div>
        </div>

        {/* Basic Metadata */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Automation Name</label>
            <input
              value={auto.name}
              onChange={e => setEditorState(prev => ({ ...prev, automation: { ...prev.automation, name: e.target.value } }))}
              placeholder="e.g. Notify Slack on completed task"
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* TRIGGER SELECTION */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">1</span>
            When this trigger event occurs...
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Select Trigger Type</label>
              <select
                value={auto.trigger}
                onChange={e => setEditorState(prev => ({ ...prev, automation: { ...prev.automation, trigger: e.target.value } }))}
                className="w-full text-sm border border-gray-200 bg-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {TRIGGER_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.id}</option>
                ))}
              </select>
            </div>

            <div className="p-4 rounded-2xl border border-indigo-50 bg-indigo-50/20 flex items-start gap-3">
              <div className={`p-2 rounded-xl ${selectedTriggerObj.color} flex-shrink-0`}>
                <TriggerIcon size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">{selectedTriggerObj.id}</p>
                <p className="text-xs text-gray-500 mt-1">{selectedTriggerObj.desc}</p>
              </div>
            </div>
          </div>
        </div>

        {/* CONDITIONS SELECTION */}
        <div className="space-y-4 border-t border-gray-50 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">2</span>
              If the following conditions are met...
            </h3>
            {auto.conditions.length > 0 && (
              <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setEditorState(prev => ({ ...prev, automation: { ...prev.automation, matchType: 'AND' } }))}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${auto.matchType === 'AND' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
                >
                  AND (Match All)
                </button>
                <button
                  type="button"
                  onClick={() => setEditorState(prev => ({ ...prev, automation: { ...prev.automation, matchType: 'OR' } }))}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${auto.matchType === 'OR' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
                >
                  OR (Match Any)
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {auto.conditions.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400">
                <Info size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">No conditions set.</p>
                <p className="text-[10px] opacity-70 mt-0.5">This automation will always trigger when the event occurs.</p>
                <button
                  type="button"
                  onClick={handleAddCondition}
                  className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-gray-50 border border-gray-100 hover:bg-gray-100 rounded-lg text-[10px] font-bold text-gray-600 transition-colors"
                >
                  <Plus size={12} /> Add Condition
                </button>
              </div>
            ) : (
              <>
                {auto.conditions.map((cond, index) => {
                  const selectedFieldObj = CONDITION_FIELDS.find(f => f.id === cond.field) || CONDITION_FIELDS[0]

                  return (
                    <div key={index} className="flex flex-wrap items-center gap-3 p-3 bg-gray-50/50 border border-gray-100 rounded-xl">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">If</span>

                      {/* Field */}
                      <select
                        value={cond.field}
                        onChange={e => handleConditionChange(index, 'field', e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      >
                        {CONDITION_FIELDS.map(f => (
                          <option key={f.id} value={f.id}>{f.label}</option>
                        ))}
                      </select>

                      {/* Operator */}
                      <select
                        value={cond.operator}
                        onChange={e => handleConditionChange(index, 'operator', e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {CONDITION_OPERATORS.map(op => (
                          <option key={op.id} value={op.id}>{op.label}</option>
                        ))}
                      </select>

                      {/* Dynamic Value Input */}
                      {!cond.operator.includes('set') && (
                        <>
                          {selectedFieldObj.type === 'select' && (
                            <select
                              value={cond.value}
                              onChange={e => handleConditionChange(index, 'value', e.target.value)}
                              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 capitalize"
                            >
                              {selectedFieldObj.options.map(opt => (
                                <option key={opt} value={opt}>{opt.replace('_', ' ')}</option>
                              ))}
                            </select>
                          )}

                          {selectedFieldObj.type === 'member' && (
                            <select
                              value={cond.value}
                              onChange={e => handleConditionChange(index, 'value', e.target.value)}
                              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              {workspaceMembers.map(m => (
                                <option key={m.profiles.id} value={m.profiles.id}>{m.profiles.full_name}</option>
                              ))}
                            </select>
                          )}

                          {selectedFieldObj.type === 'label' && (
                            <select
                              value={cond.value}
                              onChange={e => handleConditionChange(index, 'value', e.target.value)}
                              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              {projectLabels.map(l => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                              ))}
                              {projectLabels.length === 0 && <option value="">No Project Labels</option>}
                            </select>
                          )}

                          {selectedFieldObj.type === 'number' && (
                            <input
                              type="number"
                              value={cond.value}
                              onChange={e => handleConditionChange(index, 'value', e.target.value)}
                              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 w-20 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          )}

                          {selectedFieldObj.type === 'boolean' && (
                            <select
                              value={cond.value}
                              onChange={e => handleConditionChange(index, 'value', e.target.value)}
                              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                            >
                              <option value="true">True (Yes)</option>
                              <option value="false">False (No)</option>
                            </select>
                          )}
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(index)}
                        className="ml-auto p-1.5 text-gray-300 hover:text-red-500 hover:bg-gray-100/50 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}

                <button
                  type="button"
                  onClick={handleAddCondition}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-[10px] font-bold text-indigo-600 transition-colors"
                >
                  <Plus size={12} /> Add Condition
                </button>
              </>
            )}
          </div>
        </div>

        {/* ACTIONS SELECTION (THEN) */}
        <div className="space-y-4 border-t border-gray-50 pt-6">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">3</span>
            Then perform these actions (THEN)...
          </h3>

          <div className="space-y-4">
            {auto.actions.map((act, index) => {
              const selectedActObj = ACTION_TYPES.find(a => a.id === act.type) || ACTION_TYPES[0]
              const ActIcon = selectedActObj.icon

              return (
                <div key={index} className="border border-gray-100 rounded-2xl p-4 bg-gray-50/30 space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${selectedActObj.color}`}>
                        <ActIcon size={14} />
                      </div>
                      <span className="text-xs font-bold text-gray-800">Action #{index + 1}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAction(index)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Action Type</label>
                      <select
                        value={act.type}
                        onChange={e => handleActionChange(index, 'type', e.target.value)}
                        className="w-full text-xs border border-gray-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {ACTION_TYPES.map(a => (
                          <option key={a.id} value={a.id}>{a.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* DYNAMIC ACTION PARAMETERS */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Configuration</label>

                      {act.type === 'Assign User' && (
                        <select
                          value={act.config.userId || ''}
                          onChange={e => handleActionChange(index, 'userId', e.target.value)}
                          className="w-full text-xs border border-gray-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Choose User</option>
                          {workspaceMembers.map(m => (
                            <option key={m.profiles.id} value={m.profiles.id}>{m.profiles.full_name}</option>
                          ))}
                        </select>
                      )}

                      {act.type === 'Change Status' && (
                        <select
                          value={act.config.status || 'todo'}
                          onChange={e => handleActionChange(index, 'status', e.target.value)}
                          className="w-full text-xs border border-gray-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
                        >
                          {['todo', 'in_progress', 'in_review', 'done'].map(s => (
                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                          ))}
                        </select>
                      )}

                      {act.type === 'Set Priority' && (
                        <select
                          value={act.config.priority || 'medium'}
                          onChange={e => handleActionChange(index, 'priority', e.target.value)}
                          className="w-full text-xs border border-gray-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
                        >
                          {['low', 'medium', 'high'].map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      )}

                      {act.type === 'Set Due Date' && (
                        <select
                          value={act.config.dueDate || 'today'}
                          onChange={e => handleActionChange(index, 'dueDate', e.target.value)}
                          className="w-full text-xs border border-gray-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="today">Today</option>
                          <option value="tomorrow">Tomorrow</option>
                          <option value="3_days">In 3 Days</option>
                          <option value="1_week">In 1 Week</option>
                        </select>
                      )}

                      {act.type === 'Move Sprint' && (
                        <select
                          value={act.config.sprintId || ''}
                          onChange={e => handleActionChange(index, 'sprintId', e.target.value)}
                          className="w-full text-xs border border-gray-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select Sprint</option>
                          {sprints.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      )}

                      {act.type === 'Archive Task' && (
                        <div className="text-xs text-gray-400 py-2 italic">No config required. Automatically marks task as archived.</div>
                      )}

                      {act.type === 'Create Comment' && (
                        <input
                          type="text"
                          value={act.config.text || ''}
                          onChange={e => handleActionChange(index, 'text', e.target.value)}
                          placeholder="Type automated comment..."
                          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      )}

                      {act.type === 'Create Subtask' && (
                        <input
                          type="text"
                          value={act.config.title || ''}
                          onChange={e => handleActionChange(index, 'title', e.target.value)}
                          placeholder="e.g. Verify deployment checklist"
                          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      )}

                      {act.type === 'Send Notification' && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={act.config.title || ''}
                            onChange={e => handleActionChange(index, 'title', e.target.value)}
                            placeholder="Notification title..."
                            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <input
                            type="text"
                            value={act.config.message || ''}
                            onChange={e => handleActionChange(index, 'message', e.target.value)}
                            placeholder="Notification message body..."
                            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      )}

                      {act.type === 'Send Email' && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={act.config.subject || ''}
                            onChange={e => handleActionChange(index, 'subject', e.target.value)}
                            placeholder="Email subject..."
                            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <textarea
                            value={act.config.body || ''}
                            onChange={e => handleActionChange(index, 'body', e.target.value)}
                            placeholder="Email content body..."
                            rows={2}
                            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                          />
                        </div>
                      )}

                      {act.type === 'Add Label' && (
                        <select
                          value={act.config.labelId || ''}
                          onChange={e => handleActionChange(index, 'labelId', e.target.value)}
                          className="w-full text-xs border border-gray-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select Label</option>
                          {projectLabels.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </select>
                      )}

                      {act.type === 'Remove Label' && (
                        <select
                          value={act.config.labelId || ''}
                          onChange={e => handleActionChange(index, 'labelId', e.target.value)}
                          className="w-full text-xs border border-gray-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select Label</option>
                          {projectLabels.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            <button
              type="button"
              onClick={() => handleAddAction(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold shadow-sm shadow-indigo-100 transition-colors"
            >
              <Plus size={14} /> Add Action
            </button>
          </div>
        </div>

        {/* ELSE ACTIONS SELECTION */}
        <div className="space-y-4 border-t border-gray-50 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">4</span>
              Else, if conditions fail, execute alternative actions (ELSE)...
            </h3>
            <button
              type="button"
              onClick={() => setEditorState(prev => ({ ...prev, automation: { ...prev.automation, enableElse: !auto.enableElse } }))}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all border ${
                auto.enableElse
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  : 'bg-gray-50 text-gray-400 border-gray-200'
              }`}
            >
              {auto.enableElse ? 'Else Block Enabled' : 'Enable Else Block'}
            </button>
          </div>

          {auto.enableElse && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
              {auto.elseActions.map((act, index) => {
                const selectedActObj = ACTION_TYPES.find(a => a.id === act.type) || ACTION_TYPES[0]
                const ActIcon = selectedActObj.icon

                return (
                  <div key={index} className="border border-emerald-100 rounded-2xl p-4 bg-emerald-50/10 space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${selectedActObj.color}`}>
                          <ActIcon size={14} />
                        </div>
                        <span className="text-xs font-bold text-gray-800">Else Action #{index + 1}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAction(index, true)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Action Type</label>
                        <select
                          value={act.type}
                          onChange={e => handleActionChange(index, 'type', e.target.value, true)}
                          className="w-full text-xs border border-gray-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {ACTION_TYPES.map(a => (
                            <option key={a.id} value={a.id}>{a.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* DYNAMIC ACTION PARAMETERS */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Configuration</label>

                        {act.type === 'Assign User' && (
                          <select
                            value={act.config.userId || ''}
                            onChange={e => handleActionChange(index, 'userId', e.target.value, true)}
                            className="w-full text-xs border border-gray-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Choose User</option>
                            {workspaceMembers.map(m => (
                              <option key={m.profiles.id} value={m.profiles.id}>{m.profiles.full_name}</option>
                            ))}
                          </select>
                        )}

                        {act.type === 'Change Status' && (
                          <select
                            value={act.config.status || 'todo'}
                            onChange={e => handleActionChange(index, 'status', e.target.value, true)}
                            className="w-full text-xs border border-gray-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
                          >
                            {['todo', 'in_progress', 'in_review', 'done'].map(s => (
                              <option key={s} value={s}>{s.replace('_', ' ')}</option>
                            ))}
                          </select>
                        )}

                        {act.type === 'Set Priority' && (
                          <select
                            value={act.config.priority || 'medium'}
                            onChange={e => handleActionChange(index, 'priority', e.target.value, true)}
                            className="w-full text-xs border border-gray-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
                          >
                            {['low', 'medium', 'high'].map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        )}

                        {act.type === 'Set Due Date' && (
                          <select
                            value={act.config.dueDate || 'today'}
                            onChange={e => handleActionChange(index, 'dueDate', e.target.value, true)}
                            className="w-full text-xs border border-gray-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="today">Today</option>
                            <option value="tomorrow">Tomorrow</option>
                            <option value="3_days">In 3 Days</option>
                            <option value="1_week">In 1 Week</option>
                          </select>
                        )}

                        {act.type === 'Move Sprint' && (
                          <select
                            value={act.config.sprintId || ''}
                            onChange={e => handleActionChange(index, 'sprintId', e.target.value, true)}
                            className="w-full text-xs border border-gray-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Select Sprint</option>
                            {sprints.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        )}

                        {act.type === 'Archive Task' && (
                          <div className="text-xs text-gray-400 py-2 italic">No config required. Automatically marks task as archived.</div>
                        )}

                        {act.type === 'Create Comment' && (
                          <input
                            type="text"
                            value={act.config.text || ''}
                            onChange={e => handleActionChange(index, 'text', e.target.value, true)}
                            placeholder="Type automated comment..."
                            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        )}

                        {act.type === 'Create Subtask' && (
                          <input
                            type="text"
                            value={act.config.title || ''}
                            onChange={e => handleActionChange(index, 'title', e.target.value, true)}
                            placeholder="e.g. Verify deployment checklist"
                            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        )}

                        {act.type === 'Send Notification' && (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={act.config.title || ''}
                              onChange={e => handleActionChange(index, 'title', e.target.value, true)}
                              placeholder="Notification title..."
                              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <input
                              type="text"
                              value={act.config.message || ''}
                              onChange={e => handleActionChange(index, 'message', e.target.value, true)}
                              placeholder="Notification message body..."
                              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        )}

                        {act.type === 'Send Email' && (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={act.config.subject || ''}
                              onChange={e => handleActionChange(index, 'subject', e.target.value, true)}
                              placeholder="Email subject..."
                              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <textarea
                              value={act.config.body || ''}
                              onChange={e => handleActionChange(index, 'body', e.target.value, true)}
                              placeholder="Email content body..."
                              rows={2}
                              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                            />
                          </div>
                        )}

                        {act.type === 'Add Label' && (
                          <select
                            value={act.config.labelId || ''}
                            onChange={e => handleActionChange(index, 'labelId', e.target.value, true)}
                            className="w-full text-xs border border-gray-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Select Label</option>
                            {projectLabels.map(l => (
                              <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                          </select>
                        )}

                        {act.type === 'Remove Label' && (
                          <select
                            value={act.config.labelId || ''}
                            onChange={e => handleActionChange(index, 'labelId', e.target.value, true)}
                            className="w-full text-xs border border-gray-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Select Label</option>
                            {projectLabels.map(l => (
                              <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              <button
                type="button"
                onClick={() => handleAddAction(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-100 transition-colors"
              >
                <Plus size={14} /> Add Else Action
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // LIST VIEW & MAIN DASHBOARD
  return (
    <div className="space-y-6 max-w-5xl mx-auto h-full overflow-y-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Cpu size={20} className="text-indigo-600" />
            OrbitBoard Automations
          </h2>
          <p className="text-xs text-gray-500">Design self-triggering workflows and decision logic to save repetitive work</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-100 transition-all hover:scale-[1.01]"
        >
          <Plus size={14} /> Create Automation
        </button>
      </div>

      {automations.length === 0 ? (
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-12 text-center max-w-2xl mx-auto">
          <Cpu size={44} className="mx-auto text-gray-300 mb-4 animate-pulse" />
          <h3 className="text-sm font-bold text-gray-900 mb-1">Deploy Your First Workspace Automation</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto mb-6">
            Instantly auto-assign roles, notify channels, create task templates, move status columns or manage labels using trigger conditions.
          </p>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
          >
            Create Custom Automation
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main List */}
          <div className="lg:col-span-2 space-y-4">
            {automations.map(auto => {
              const triggerObj = TRIGGER_TYPES.find(t => t.id === auto.trigger) || TRIGGER_TYPES[0]
              const TrigIcon = triggerObj.icon

              return (
                <div
                  key={auto.id}
                  className={`bg-white border rounded-2xl p-5 hover:shadow-md transition-all relative ${
                    auto.active ? 'border-gray-100' : 'border-gray-100 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl ${triggerObj.color} flex-shrink-0`}>
                        <TrigIcon size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 leading-snug">{auto.name}</span>
                        </div>
                        <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1 bg-indigo-50/50 px-2 py-0.5 rounded-full w-max">
                          Trigger: {auto.trigger}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggleActive(auto.id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title={auto.active ? 'Deactivate Automation' : 'Activate Automation'}
                      >
                        {auto.active ? (
                          <ToggleRight size={30} className="text-indigo-600" />
                        ) : (
                          <ToggleLeft size={30} className="text-gray-300" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Summary of logic */}
                  <div className="mt-4 bg-gray-50/50 border border-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-[10px] text-gray-400 uppercase tracking-wide">IF:</span>
                      {auto.conditions.length === 0 ? (
                        <span className="italic text-gray-400">Always runs (No conditions)</span>
                      ) : (
                        auto.conditions.map((c, i) => (
                          <span key={i} className="bg-white border border-gray-100 px-2 py-0.5 rounded text-[11px] font-medium text-gray-700">
                            {c.field} {c.operator.replace('_', ' ')} "{c.value}"
                            {i < auto.conditions.length - 1 && <span className="ml-1.5 font-bold text-indigo-600 text-[10px]">{auto.matchType}</span>}
                          </span>
                        ))
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-[10px] text-indigo-500 uppercase tracking-wide">THEN:</span>
                      {auto.actions.map((act, i) => (
                        <span key={i} className="bg-indigo-50/50 border border-indigo-100/50 text-indigo-600 px-2 py-0.5 rounded text-[11px] font-bold">
                          {act.type}
                        </span>
                      ))}
                    </div>
                    {auto.enableElse && auto.elseActions.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap border-t border-gray-100 pt-1.5 mt-1">
                        <span className="font-bold text-[10px] text-emerald-500 uppercase tracking-wide">ELSE:</span>
                        {auto.elseActions.map((act, i) => (
                          <span key={i} className="bg-emerald-50/50 border border-emerald-100/50 text-emerald-600 px-2 py-0.5 rounded text-[11px] font-bold">
                            {act.type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Control Row */}
                  <div className="flex items-center justify-between border-t border-gray-50 mt-4 pt-3 text-xs">
                    <button
                      onClick={() => handleOpenSimulator(auto)}
                      className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Sparkles size={12} /> Simulate / Test Logic
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(auto)}
                        className="text-gray-500 hover:text-gray-700 font-semibold px-2 py-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(auto.id)}
                        className="text-red-500 hover:text-red-700 font-semibold px-2 py-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* SIMULATOR OR LOG PANEL */}
          <div className="lg:col-span-1 space-y-4">
            {simulatorState ? (
              <div className="bg-gray-900 text-white rounded-2xl border border-gray-800 p-5 shadow-xl space-y-4 flex flex-col h-[550px] animate-in slide-in-from-right-3 duration-200">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-amber-400" size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Logic Simulator</span>
                  </div>
                  <button
                    onClick={() => setSimulatorState(null)}
                    className="text-gray-400 hover:text-gray-200 p-1"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Target Automation</span>
                    <span className="text-xs font-bold text-white bg-indigo-900 border border-indigo-700/50 px-2 py-1 rounded">{simulatorState.automation.name}</span>
                  </div>

                  {/* Mock Payload Form */}
                  <div className="space-y-3 bg-gray-800/40 border border-gray-800 rounded-xl p-3">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block border-b border-gray-800 pb-1 mb-2">Simulate Custom Variables</span>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[9px] text-gray-400 block mb-0.5">Priority</label>
                        <select
                          value={simulatorState.payload.priority}
                          onChange={e => setSimulatorState(prev => ({ ...prev, payload: { ...prev.payload, priority: e.target.value } }))}
                          className="w-full bg-gray-800 text-white border border-gray-700 rounded p-1 text-[11px]"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] text-gray-400 block mb-0.5">Status</label>
                        <select
                          value={simulatorState.payload.status}
                          onChange={e => setSimulatorState(prev => ({ ...prev, payload: { ...prev.payload, status: e.target.value } }))}
                          className="w-full bg-gray-800 text-white border border-gray-700 rounded p-1 text-[11px] capitalize"
                        >
                          {['todo', 'in_progress', 'in_review', 'done'].map(s => (
                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] text-gray-400 block mb-0.5">Story Points</label>
                        <input
                          type="number"
                          value={simulatorState.payload.story_points}
                          onChange={e => setSimulatorState(prev => ({ ...prev, payload: { ...prev.payload, story_points: Number(e.target.value) } }))}
                          className="w-full bg-gray-800 text-white border border-gray-700 rounded p-1 text-[11px]"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] text-gray-400 block mb-0.5">Blocked?</label>
                        <select
                          value={String(simulatorState.payload.is_blocked)}
                          onChange={e => setSimulatorState(prev => ({ ...prev, payload: { ...prev.payload, is_blocked: e.target.value === 'true' } }))}
                          className="w-full bg-gray-800 text-white border border-gray-700 rounded p-1 text-[11px]"
                        >
                          <option value="false">No (False)</option>
                          <option value="true">Yes (True)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Simulated Output Logs */}
                  <div className="space-y-1.5 font-mono text-[10px] bg-black/50 rounded-xl p-3 border border-gray-800 min-h-[150px] max-h-[220px] overflow-y-auto">
                    {simulatorState.logs.length === 0 ? (
                      <div className="text-gray-500 italic text-center py-8">Click "Start Simulation" to evaluate logic</div>
                    ) : (
                      simulatorState.logs.map((log, i) => (
                        <div
                          key={i}
                          className={`${
                            log.type === 'trigger' ? 'text-amber-400 font-bold' :
                            log.type === 'success' ? 'text-emerald-400' :
                            log.type === 'error' ? 'text-red-400' :
                            log.type === 'finished' ? 'text-indigo-400 font-bold border-t border-gray-800 pt-1.5 mt-1' :
                            'text-gray-300'
                          }`}
                        >
                          {log.text}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button
                  onClick={runSimulation}
                  disabled={simulatorState.running}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-800 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 shadow-lg shadow-indigo-900/10"
                >
                  {simulatorState.running ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      Evaluating Conditions...
                    </>
                  ) : (
                    <>
                      <Play size={12} fill="currentColor" />
                      Start Simulation
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  <Info size={16} className="text-indigo-600" />
                  How Automations Work
                </div>
                <div className="space-y-3 text-xs text-gray-500 leading-relaxed">
                  <p>
                    <strong>1. Trigger:</strong> Define which database or system event will fire the automation, e.g. "Task Created", "Status Changed" or "Comment Added".
                  </p>
                  <p>
                    <strong>2. Conditions:</strong> Set optional criteria (IF/AND/OR logic tree) filtering properties like Priority, Assignee, Status, or Blocked.
                  </p>
                  <p>
                    <strong>3. Actions (THEN):</strong> Specify what OrbitBoard actions should automatically run when conditions are successfully verified.
                  </p>
                  <p>
                    <strong>4. Fallbacks (ELSE):</strong> Specify what should happen instead if the criteria are not met.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}