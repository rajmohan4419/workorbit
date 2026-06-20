import { useState } from 'react'
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import { Plus } from 'lucide-react'
import { useTaskStore, STATUSES, STATUS_LABELS, canMoveToStatus } from '../../store/taskStore'
import TaskCard from './TaskCard'
import TaskModal from './TaskModal'

const columnColors = {
  todo: 'bg-gray-50 border-gray-100',
  in_progress: 'bg-blue-50 border-blue-100',
  in_review: 'bg-amber-50 border-amber-100',
  done: 'bg-green-50 border-green-100',
}

const dotColors = {
  todo: 'bg-gray-300',
  in_progress: 'bg-blue-400',
  in_review: 'bg-amber-400',
  done: 'bg-green-400',
}

export default function KanbanBoard({ projectId }) {
  const tasks = useTaskStore((state) => state.tasks)
  const moveTask = useTaskStore((state) => state.moveTask)
  const storeError = useTaskStore((state) => state.error)
  const [modalState, setModalState] = useState(null)
  const [draggingStatus, setDraggingStatus] = useState(null)
  const tasksByStatus = STATUSES.reduce((acc, status) => {
    acc[status] = tasks.filter((task) => task.status === status)
    return acc
  }, {})

  const handleDragStart = ({ draggableId }) => {
    const task = tasks.find((item) => item.id === draggableId)
    setDraggingStatus(task?.status ?? null)
    useTaskStore.setState({ error: null })
  }

  const handleDragEnd = async ({ source, destination, draggableId }) => {
    setDraggingStatus(null)

    if (!destination || destination.droppableId === source.droppableId) return

    if (!canMoveToStatus(source.droppableId, destination.droppableId)) {
      useTaskStore.setState({ error: 'Tasks can only move to valid columns.' })
      return
    }

    await moveTask(draggableId, destination.droppableId)
  }

  return (
    <>
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex h-full flex-col gap-3">
          {storeError && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {storeError}
            </div>
          )}

          <div className="flex min-h-0 gap-4 overflow-x-auto pb-4">
            {STATUSES.map((status) => {
              const canDropHere = !draggingStatus || draggingStatus === status || canMoveToStatus(draggingStatus, status)

              return (
                <Droppable key={status} droppableId={status} isDropDisabled={!canDropHere}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-shrink-0 w-72 rounded-2xl border ${columnColors[status]} flex flex-col transition-colors ${
                        snapshot.isDraggingOver && canDropHere ? 'ring-2 ring-indigo-200 ring-inset' : ''
                      } ${
                        draggingStatus && !canDropHere ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${dotColors[status]}`} />
                          <span className="text-sm font-medium text-gray-700">{STATUS_LABELS[status]}</span>
                          <span className="text-xs text-gray-400 bg-white border border-gray-100 px-1.5 py-0.5 rounded-full">
                            {tasksByStatus[status].length}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            useTaskStore.setState({ error: null })
                            setModalState({ type: 'create', status })
                          }}
                          className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"
                        >
                          <Plus size={15} />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                        {tasksByStatus[status].map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(draggableProvided, draggableSnapshot) => (
                              <div
                                ref={draggableProvided.innerRef}
                                {...draggableProvided.draggableProps}
                                {...draggableProvided.dragHandleProps}
                                className={`transition-opacity ${draggableSnapshot.isDragging ? 'opacity-70' : ''}`}
                              >
                                <TaskCard
                                  task={task}
                                  onOpen={(selectedTask) => {
                                    useTaskStore.setState({ error: null })
                                    setModalState({ type: 'edit', task: selectedTask })
                                  }}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}

                        {provided.placeholder}

                        {tasksByStatus[status].length === 0 && (
                          <button
                            onClick={() => {
                              useTaskStore.setState({ error: null })
                              setModalState({ type: 'create', status })
                            }}
                            className="w-full py-6 text-xs text-gray-300 hover:text-indigo-400 border-2 border-dashed border-gray-100 hover:border-indigo-200 rounded-xl transition-colors"
                          >
                            Add a task
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </Droppable>
              )
            })}
          </div>
        </div>
      </DragDropContext>

      {modalState && (
        <TaskModal
          key={modalState.type === 'edit' ? modalState.task.id : `create-${modalState.status}`}
          task={modalState.type === 'edit' ? modalState.task : null}
          projectId={projectId}
          defaultStatus={modalState.type === 'create' ? modalState.status : modalState.task.status}
          onClose={() => setModalState(null)}
        />
      )}
    </>
  )
}
