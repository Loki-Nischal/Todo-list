'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownWideNarrow, ArrowRight, CalendarDays, Check, CheckCheck, ChevronDown, ChevronRight, Circle, CircleCheck, Flag, Inbox, Layers, Leaf, LoaderCircle, Menu, Plus, Search, Sparkles, Sun, Trash2, X } from 'lucide-react'

const projects = ['Personal', 'Work', 'Learning']
const projectColors = { Personal: 'bg-amber-400', Work: 'bg-violet-400', Learning: 'bg-emerald-400' }
const views = [{ name: 'All tasks', icon: Inbox }, { name: 'Today', icon: Sun }, { name: 'Upcoming', icon: CalendarDays }, { name: 'Completed', icon: CircleCheck }]
const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const prettyDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

function TaskDialog({ task, defaultProject, onClose, onSave }) {
  const dialog = useRef(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { dialog.current.showModal() }, [])
  async function submit(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setSaving(true)
    setError('')
    try {
      await onSave({ title: data.get('title').trim(), notes: data.get('notes').trim(), project: data.get('project'), priority: data.get('priority'), due_date: data.get('due_date') || null }, task?.id)
      onClose()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }
  return <dialog ref={dialog} className="task-dialog" onCancel={(e) => { if (saving) e.preventDefault(); else onClose() }} onClick={(e) => { if (e.target === dialog.current && !saving) onClose() }} aria-labelledby="dialog-title">
    <form onSubmit={submit} className="p-7 sm:p-8">
      <div className="mb-7 flex items-center justify-between"><div><p className="eyebrow mb-2">MAKE A LITTLE PROGRESS</p><h2 id="dialog-title" className="text-2xl font-semibold tracking-tight">{task ? 'Edit task' : 'What’s on your mind?'}</h2></div><button type="button" className="icon-button" onClick={onClose} disabled={saving} aria-label="Close dialog"><X size={20} /></button></div>
      <label className="field-label" htmlFor="task-title">Task name</label><input autoFocus id="task-title" name="title" className="form-input mb-5" placeholder="Something you want to get done…" defaultValue={task?.title} required maxLength={200} />
      <label className="field-label" htmlFor="task-notes">Notes <span className="font-normal text-stone-400">(optional)</span></label><textarea id="task-notes" name="notes" className="form-input mb-5 resize-none" placeholder="Add a little more detail" rows={3} maxLength={2000} defaultValue={task?.notes} />
      <div className="grid grid-cols-2 gap-4"><div><label className="field-label" htmlFor="task-project">Project</label><select id="task-project" name="project" className="form-input" defaultValue={task?.project || defaultProject || 'Personal'}>{projects.map(p => <option key={p}>{p}</option>)}</select></div><div><label className="field-label" htmlFor="task-priority">Priority</label><select id="task-priority" name="priority" className="form-input" defaultValue={task?.priority || 'medium'}><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option></select></div></div>
      <label className="field-label mt-5" htmlFor="task-date">Due date <span className="font-normal text-stone-400">(optional)</span></label><input type="date" id="task-date" name="due_date" className="form-input" defaultValue={task?.due_date || ''} />
      {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-8 flex justify-end gap-3"><button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={17} />}{task ? 'Save changes' : 'Add task'}</button></div>
    </form>
  </dialog>
}

export default function App() {
  const [tasks, setTasks] = useState([])
  const [view, setView] = useState('All tasks')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState(null)
  const [mobileNav, setMobileNav] = useState(false)
  const [busyIds, setBusyIds] = useState([])
  const [notice, setNotice] = useState('')
  const [today, setToday] = useState('')
  const csrf = useRef('')
  const searchRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/tasks/', { cache: 'no-store' })
      if (!response.ok) throw new Error('Couldn’t connect to your tasks. Make sure the Django server is running, then try again.')
      const data = await response.json()
      csrf.current = data.csrfToken
      setTasks(data.tasks)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }, [])
  useEffect(() => {
    // Fetch persisted tasks when the browser mounts the dashboard.
    // oxlint-disable-next-line react/set-state-in-effect
    load()
    // Resolve the browser's local date after hydration to match the server markup.
    // oxlint-disable-next-line react/set-state-in-effect
    setToday(localDate())
    const timer = setInterval(() => setToday(localDate()), 60000)
    return () => clearInterval(timer)
  }, [load])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 3500)
    return () => clearTimeout(timer)
  }, [notice])
  useEffect(() => {
    function handleKey(e) { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus() } }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  async function request(path, method, body) {
    const response = await fetch(path, { method, headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf.current }, ...(body ? { body: JSON.stringify(body) } : {}) })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || 'Something went wrong. Please try again.')
    }
    return response.json()
  }
  async function saveTask(data, id) {
    const saved = await request(id ? `/api/tasks/${id}/` : '/api/tasks/', id ? 'PATCH' : 'POST', data)
    setTasks(current => id ? current.map(t => t.id === id ? saved : t) : [saved, ...current])
    setNotice(id ? 'Changes saved. Keep going!' : 'Task added. One step closer.')
  }
  async function updateTask(task, remove = false) {
    setBusyIds(ids => [...ids, task.id])
    try {
      const result = await request(`/api/tasks/${task.id}/`, remove ? 'DELETE' : 'PATCH', remove ? undefined : { completed: !task.completed })
      setTasks(current => remove ? current.filter(t => t.id !== task.id) : current.map(t => t.id === task.id ? result : t))
      setNotice(remove ? 'Task deleted.' : task.completed ? 'Task moved back to your list.' : 'A little win. Nicely done!')
    } catch (err) { setNotice(err.message) } finally { setBusyIds(ids => ids.filter(id => id !== task.id)) }
  }
  function selectView(name) { setView(name); setFilter('all'); setQuery(''); setMobileNav(false) }
  const openTasks = tasks.filter(t => !t.completed)
  const completed = tasks.length - openTasks.length
  const todayTasks = openTasks.filter(t => t.due_date === today)
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0
  const scoped = useMemo(() => tasks.filter(t => {
    if (projects.includes(view)) return t.project === view
    if (view === 'Completed') return t.completed
    if (view === 'Today') return t.due_date === today
    if (view === 'Upcoming') return t.due_date && t.due_date > today && !t.completed
    return true
  }), [tasks, view, today])
  const visible = useMemo(() => scoped.filter(t => {
    return (filter === 'all' || (filter === 'active' ? !t.completed : t.completed)) && `${t.title} ${t.notes} ${t.project}`.toLowerCase().includes(query.toLowerCase())
  }).sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed)
    if (sort === 'priority') return ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority])
    if (sort === 'date') return (a.due_date || '9999').localeCompare(b.due_date || '9999')
    return b.created_at.localeCompare(a.created_at)
  }), [scoped, filter, query, sort])
  const counts = { 'All tasks': openTasks.length, Today: todayTasks.length, Upcoming: openTasks.filter(t => t.due_date > today).length, Completed: completed }
  const dateLabel = today ? new Date(`${today}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Your space to get things done'

  return <div className="app-shell">
    {mobileNav && <button className="nav-backdrop" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    <aside className={`sidebar ${mobileNav ? 'is-open' : ''}`}>
      <a className="brand" href="/" aria-label="Daylight home"><span className="brand-mark"><Sun size={24} strokeWidth={1.8} /></span>daylight<span className="text-orange-500">.</span></a>
      <div className="workspace"><span className="workspace-avatar">N</span><div><p className="text-sm font-semibold">My workspace</p><p className="mt-0.5 text-xs text-stone-400">A little more organized</p></div><Leaf size={16} className="ml-auto text-stone-400" /></div>
      <p className="eyebrow px-3 mb-3">WORKSPACE</p>
      <nav className="space-y-1" aria-label="Task views">{views.map(({ name, icon: Icon }) => <button key={name} className={`nav-item ${view === name ? 'active' : ''}`} onClick={() => selectView(name)}><Icon size={19} strokeWidth={1.7} /><span>{name}</span><span className="nav-count">{counts[name]}</span></button>)}</nav>
      <div className="mt-9 mb-3 flex items-center px-3"><p className="eyebrow">MY PROJECTS</p><Layers size={14} className="ml-auto text-stone-400" /></div>
      <nav className="space-y-1" aria-label="Projects">{projects.map(project => <button key={project} onClick={() => selectView(project)} className={`nav-item ${view === project ? 'active' : ''}`}><span className={`h-2 w-2 rounded-full mx-1.5 ${projectColors[project]}`} /><span>{project}</span><span className="nav-count">{openTasks.filter(t => t.project === project).length}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="gentle-note"><Sparkles size={19} className="text-orange-500 mb-3" /><p className="font-medium text-sm mb-1.5">Small steps. Big things.</p><p className="text-xs leading-5 text-stone-500">A little progress each day adds up to something great.</p><div className="mt-4 flex gap-1.5">{[0, 1, 2, 3, 4, 5, 6].map(i => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < Math.round(progress / 100 * 7) ? 'bg-orange-400' : 'bg-orange-100'}`} />)}</div></div><div className="profile"><span className="profile-avatar">Y</span><div><p className="text-sm font-medium">Your personal space</p><p className="text-xs text-stone-400 mt-0.5">Make today count</p></div><span className="online-dot" /></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="flex items-center gap-3"><button className="icon-button lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={21} /></button><span className="text-stone-400 hidden sm:inline">Workspace</span><ChevronRight size={14} className="text-stone-300 hidden sm:inline" /><span className="font-medium">{view}</span></div><div className="flex items-center gap-2 text-xs text-stone-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /><span>Your space, your pace</span><span className="top-avatar ml-4">Y</span></div></header>
      <main className="main-content">
        <section className="page-heading"><div><div className="mb-3 flex items-center gap-2 text-xs text-stone-500"><CalendarDays size={14} />{dateLabel}</div><h1>{view === 'All tasks' ? 'A clear mind starts here' : view === 'Today' ? 'Make room for today' : view === 'Upcoming' ? 'Good things ahead' : view === 'Completed' ? 'Look how far you’ve come' : `A little focus on ${view.toLowerCase()}`}<span className="text-orange-500">.</span></h1><p className="mt-3 text-sm text-stone-500">{view === 'Completed' ? 'Every checked box is a little win. Take a moment to enjoy it.' : 'One task at a time. You’ve got this.'}</p></div><button className="primary-button shrink-0" onClick={() => setDialog({})} disabled={loading || !!error}><Plus size={18} /> Add task</button></section>
        <section className="stats-grid" aria-label="Task overview">{[{ label: 'Total tasks', value: tasks.length, icon: Layers, style: 'bg-orange-50 text-orange-500', detail: 'Everything in one place' }, { label: 'In progress', value: openTasks.length, icon: Circle, style: 'bg-amber-50 text-amber-500', detail: 'A little focus goes a long way' }, { label: 'Completed', value: completed, icon: CircleCheck, style: 'bg-emerald-50 text-emerald-600', detail: 'Small wins worth celebrating' }].map(({ label, value, icon: Icon, style, detail }) => <div className="stat-card" key={label}><div className="flex justify-between items-center"><span className="text-sm text-stone-500">{label}</span><span className={`stat-icon ${style}`}><Icon size={19} strokeWidth={1.7} /></span></div><div className="stat-number">{loading ? '—' : value.toString().padStart(2, '0')}</div><p className="text-xs text-stone-400">{detail}</p></div>)}</section>
        <div className="content-grid"><section className="task-section"><div className="flex items-center justify-between mb-5"><div className="flex items-center gap-2.5"><h2 className="text-lg font-semibold tracking-tight">{view === 'All tasks' ? 'Your tasks' : view}</h2><span className="task-total">{scoped.length}</span></div><label className="sort-control"><ArrowDownWideNarrow size={15} /><span className="sr-only">Sort tasks</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest first</option><option value="date">Due date</option><option value="priority">Priority</option></select><ChevronDown size={12} /></label></div>
          <div className="task-toolbar"><div className="tabs" aria-label="Task status">{[['all', 'All'], ['active', 'Active'], ['completed', 'Completed']].map(([value, label]) => <button key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={filter === value ? 'selected' : ''}>{label}</button>)}</div><div className="search-box"><Search size={15} /><input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tasks…" aria-label="Search tasks" />{query ? <button onClick={() => setQuery('')} aria-label="Clear search"><X size={13} /></button> : <kbd>⌘ K</kbd>}</div></div>
          <div className="task-list" aria-busy={loading}>
            {loading ? <div className="empty-state"><LoaderCircle className="animate-spin text-orange-400" size={28} /><p>Getting your space ready…</p></div> : error ? <div className="empty-state"><Inbox size={32} className="text-orange-400" /><h3>Let’s reconnect</h3><p role="alert">{error}</p><button onClick={load} className="secondary-button">Try again</button></div> : visible.length === 0 ? <div className="empty-state"><span className="empty-icon"><CheckCheck size={32} strokeWidth={1.5} /></span><h3>{query ? 'No matching tasks' : tasks.length ? 'A little breathing room' : 'A fresh start, just for you'}</h3><p>{query ? 'Try another search or a different filter.' : tasks.length ? 'Nothing on this list right now. Enjoy the space or plan your next step.' : 'Big ideas, small errands, and everything in between. Give your first task a home.'}</p>{!query && <button className="empty-add" onClick={() => setDialog({})}><Plus size={16} /> Add {tasks.length ? 'a' : 'your first'} task <ArrowRight size={14} /></button>}</div> : visible.map(task => <article key={task.id} className={`task-row group ${task.completed ? 'is-complete' : ''}`}><button className={`task-checkbox ${task.completed ? 'checked' : ''}`} onClick={() => updateTask(task)} disabled={busyIds.includes(task.id)} aria-label={`${task.completed ? 'Mark incomplete' : 'Complete'}: ${task.title}`}>{busyIds.includes(task.id) ? <LoaderCircle size={12} className="animate-spin" /> : task.completed && <Check size={13} strokeWidth={2.8} />}</button><button className="task-body" onClick={() => setDialog(task)} aria-label={`Edit ${task.title}`}><span className="task-title">{task.title}</span>{task.notes && <span className="task-notes">{task.notes}</span>}<span className="task-meta"><span className="project-tag"><span className={`h-1.5 w-1.5 rounded-full ${projectColors[task.project]}`} />{task.project}</span>{task.due_date && <span className={`due-date ${!task.completed && task.due_date < today ? 'overdue' : ''}`}><CalendarDays size={12} />{task.due_date === today ? 'Today' : prettyDate(task.due_date)}{!task.completed && task.due_date < today ? ' · Overdue' : ''}</span>}</span></button><span className={`priority priority-${task.priority}`}><Flag size={11} />{task.priority}</span><button className="delete-button" onClick={() => updateTask(task, true)} disabled={busyIds.includes(task.id)} aria-label={`Delete ${task.title}`}><Trash2 size={15} /></button></article>)}
            {!loading && !error && visible.length > 0 && <button className="list-add" onClick={() => setDialog({})}><Plus size={17} />Add a new task<span className="ml-auto text-xs text-stone-300">A little closer to done</span></button>}
          </div><div className="mt-4 flex items-center justify-between text-xs text-stone-400"><span>{loading ? 'Loading tasks' : `${visible.length} ${visible.length === 1 ? 'task' : 'tasks'} in this view`}</span><span className="flex items-center gap-1.5"><Leaf size={12} /> Progress over perfection</span></div>
        </section><aside className="right-rail"><div className="progress-card"><div className="flex justify-between items-center"><h2 className="font-semibold text-sm">Your momentum</h2><Sparkles size={16} className="text-orange-400" /></div><div className="progress-ring" style={{ '--progress': `${progress * 3.6}deg` }}><div><span className="text-3xl font-semibold tracking-tight">{progress}<span className="text-lg text-stone-400">%</span></span><span className="text-xs text-stone-400">complete</span></div></div><p className="text-sm font-medium text-center">{progress === 100 ? 'Look at you go!' : completed ? 'You’re making it happen' : 'Every step counts'}</p><p className="mt-2 text-xs text-stone-400 text-center leading-5">{completed} of {tasks.length} tasks done.<br />{progress === 100 ? 'Take a breath. You’ve earned it.' : 'Keep showing up for yourself.'}</p></div><div className="focus-card"><span className="focus-sun"><Sun size={24} strokeWidth={1.5} /></span><p className="eyebrow text-orange-600! mt-4">A MOMENT OF FOCUS</p><h3>Less rush.<br />More intention.</h3><p>Pick one thing that matters today. Start there.</p><button onClick={() => selectView('Today')}>See today’s tasks <ArrowRight size={14} /></button><div className="focus-decoration" aria-hidden="true"><div /><div /><div /></div></div></aside></div>
        <footer className="page-footer"><span className="flex items-center gap-1.5"><Sun size={14} /> A little focus, a lot of possibility.</span><span>Made for a calmer day</span></footer>
      </main>
    </div>
    {dialog && <TaskDialog task={dialog.id ? dialog : null} defaultProject={projects.includes(view) ? view : undefined} onClose={() => setDialog(null)} onSave={saveTask} />}
    {notice && <div className="toast" role="status"><CircleCheck size={17} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={15} /></button></div>}
  </div>
}
