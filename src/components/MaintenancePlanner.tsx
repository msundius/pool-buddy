import React, { useState } from 'react';
import { MaintenanceTask } from '../types';
import { ClipboardList, CheckSquare, Calendar, History, ShieldAlert, Plus, Sparkles } from 'lucide-react';

interface MaintenancePlannerProps {
  tasks: MaintenanceTask[];
  onCompleteTask: (taskId: string) => void;
  onAddTask: (task: Omit<MaintenanceTask, 'id' | 'lastDone' | 'upcomingDue'>) => void;
}

export function MaintenancePlanner({ tasks, onCompleteTask, onAddTask }: MaintenancePlannerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [intervalDays, setIntervalDays] = useState('7');
  const [category, setCategory] = useState<'cleaning' | 'chemistry' | 'filter' | 'hardware'>('cleaning');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    onAddTask({
      name: taskName,
      description: taskDesc,
      intervalDays: parseInt(intervalDays) || 7,
      category,
    });
    setTaskName('');
    setTaskDesc('');
    setShowAddForm(false);
  };

  const getCategoryBadgeColor = (cat: MaintenanceTask['category']) => {
    switch (cat) {
      case 'cleaning':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'chemistry':
        return 'bg-sky-50 text-sky-750 border-sky-100';
      case 'filter':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'hardware':
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Helper code to calculate remaining days
  const getDueStatusText = (upcomingDueStr: string) => {
    const dueTime = new Date(upcomingDueStr).getTime();
    const nowTime = new Date().getTime();
    const diffDays = Math.ceil((dueTime - nowTime) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)} days OVERDUE`, color: 'text-rose-600 bg-rose-50 border-rose-100' };
    } else if (diffDays === 0) {
      return { text: 'DUE TODAY', color: 'text-amber-600 bg-amber-50 border-amber-150 animate-pulse' };
    } else if (diffDays === 1) {
      return { text: 'Due tomorrow', color: 'text-amber-600 bg-amber-50/50 border-amber-100/50' };
    } else {
      return { text: `Due in ${diffDays} days`, color: 'text-slate-500 bg-slate-50 border-slate-200/55' };
    }
  };

  return (
    <div id="maintenance-planner-card" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col h-full justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="bg-sky-50 text-sky-600 p-2 rounded-xl">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base">Pool Maintenance Planner</h3>
              <p className="text-xs text-slate-400">Never drift on cleaning or filter duties</p>
            </div>
          </div>

          <button
            id="btn-toggle-add-task"
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-xs font-semibold bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors border border-sky-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Duty
          </button>
        </div>

        {/* Task List / Form Container */}
        {showAddForm ? (
          <form id="form-add-maintenance-task" onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="col-span-2">
                <label htmlFor="input-task-name" className="text-xs font-semibold text-slate-500 mb-1 block">Duty Name</label>
                <input
                  id="input-task-name"
                  type="text"
                  required
                  placeholder="e.g. Backwash Filter"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 bg-white"
                />
              </div>

              <div>
                <label htmlFor="input-task-interval" className="text-xs font-semibold text-slate-500 mb-1 block">Every (Days)</label>
                <input
                  id="input-task-interval"
                  type="number"
                  min="1"
                  required
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 bg-white"
                />
              </div>

              <div>
                <label htmlFor="select-task-category" className="text-xs font-semibold text-slate-500 mb-1 block">Category</label>
                <select
                  id="select-task-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 bg-white"
                >
                  <option value="cleaning">Cleaning</option>
                  <option value="chemistry">Chemistry</option>
                  <option value="filter">Filter</option>
                  <option value="hardware">Hardware</option>
                </select>
              </div>

              <div className="col-span-2">
                <label htmlFor="input-task-desc" className="text-xs font-semibold text-slate-500 mb-1 block">Simple Instructions</label>
                <input
                  id="input-task-desc"
                  type="text"
                  placeholder="Vacuum walls and run sand pump in backwash/rinse mode"
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 bg-white"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1.5 border-t border-slate-200/55">
              <button
                id="btn-cancel-task"
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-submit-task"
                type="submit"
                className="text-[11px] font-semibold bg-sky-500 text-white hover:bg-sky-600 rounded-lg px-3 py-1.5 flex items-center gap-1 cursor-pointer"
              >
                Create Duty Schedule
              </button>
            </div>
          </form>
        ) : null}

        {/* List of Tasks */}
        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
          {tasks.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8 font-medium">No maintenance routines loaded.</p>
          ) : (
            tasks.map((task) => {
              const due = getDueStatusText(task.upcomingDue);
              return (
                <div
                  id={`task-item-${task.id}`}
                  key={task.id}
                  className="border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 bg-slate-50/50 hover:bg-slate-50 transition-all"
                >
                  <div className="space-y-1 truncate flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-slate-800 text-xs truncate max-w-[150px] sm:max-w-none">{task.name}</span>
                      <span className={`text-[9px] font-bold border rounded px-1.5 py-0.5 capitalize ${getCategoryBadgeColor(task.category)}`}>
                        {task.category}
                      </span>
                      <span className={`text-[9px] font-bold border rounded px-1.5 py-0.5 ${due.color}`}>
                        {due.text}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-500 truncate" title={task.description}>
                      {task.description || 'No instructions provided.'}
                    </p>
                    
                    <div className="text-[9px] text-slate-400 font-medium">
                      <span>Interval: <b>every {task.intervalDays} days</b></span>
                      <span className="mx-1.5">•</span>
                      <span>Last done: <b>{task.lastDone ? new Date(task.lastDone).toLocaleDateString() : 'Never'}</b></span>
                    </div>
                  </div>

                  <button
                    id={`btn-complete-task-${task.id}`}
                    onClick={() => onCompleteTask(task.id)}
                    className="flex-shrink-0 bg-sky-500 hover:bg-sky-600 text-white p-2 rounded-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center shadow-xs"
                    title="Mark task completed as of now"
                  >
                    <CheckSquare className="h-4.5 w-4.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Helpful tip overlay */}
      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2 text-[10px] text-slate-400 bg-sky-50/20 border border-dashed border-sky-100 rounded-lg p-2.5">
        <Sparkles className="h-3.5 w-3.5 text-sky-500" />
        <span><b>Pro Tip:</b> Backwashing your filter sand is ideal when the pressure gauge rises 8-10 PSI above the clean starting pressure baseline.</span>
      </div>
    </div>
  );
}
