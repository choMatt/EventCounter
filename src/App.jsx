import { useEffect, useMemo, useState } from 'react'
import './App.css'

const KEY = 'event-counter-v1'
const nowTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const newEvent = ({ venue, time, capacity }) => ({
  id: crypto.randomUUID(), venue, time, capacity: Number(capacity),
  checkIn: 0, frees: 0, cash: 0, cards: 0, createdAt: new Date().toISOString(),
})
const readData = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} }
}
const formatTime = value => {
  if (!value) return '—'
  const [h, m] = value.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return value
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
const eventTotal = event => Number(event.checkIn || 0) + Number(event.frees || 0) + Number(event.cash || 0) + Number(event.cards || 0)

function Counter({ label, value, onChange, tone, description }) {
  return <section className={`counter-card ${tone}`}>
    <div className="counter-heading"><div><span className="eyebrow">{label}</span><span className="counter-description">{description}</span></div><strong className="counter-value">{value}</strong></div>
    <div className="counter-actions">
      <button className="step-button" aria-label={`Decrease ${label}`} disabled={value <= 0} onClick={() => onChange(Math.max(0, value - 1))}>−</button>
      <button className="step-button add" aria-label={`Increase ${label}`} onClick={() => onChange(value + 1)}>＋</button>
    </div>
  </section>
}

export default function App() {
  const saved = useMemo(readData, [])
  const initialEvents = Array.isArray(saved.events) ? saved.events : saved.activeEvent ? [saved.activeEvent] : []
  const [events, setEvents] = useState(initialEvents)
  const [activeId, setActiveId] = useState(saved.activeId && initialEvents.some(item => item.id === saved.activeId) ? saved.activeId : initialEvents[0]?.id || null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [viewMode, setViewMode] = useState('dashboard')
  const [draft, setDraft] = useState({ venue: '', time: nowTime(), capacity: '' })
  const [history, setHistory] = useState(() => saved.history || [])
  const [notice, setNotice] = useState('')
  const [savedStatus, setSavedStatus] = useState(false)
  const event = events.find(item => item.id === activeId) || events[0] || null
  const total = event ? eventTotal(event) : 0
  const capacity = event ? Math.max(0, Number(event.capacity) || 0) : 0
  const progress = capacity && event ? Math.min(100, event.checkIn / capacity * 100) : 0

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ events, activeId, history }))
  }, [events, activeId, history])

  const report = event ? [
    `WHERE: ${event.venue.trim() || '—'}`,
    `TIME: ${formatTime(event.time)}`,
    `CHECK IN: ${event.checkIn}/${capacity}`,
    `FREES: ${event.frees}`, `CASH: ${event.cash}`,
    `CARDS: ${event.cards}`, `TOTAL: ${total}`,
  ].join('\n') : 'No active event selected.'

  const update = (field, value) => {
    setEvents(list => list.map(item => item.id === event.id ? { ...item, [field]: value } : item))
    setSavedStatus(false)
  }
  const updateGridEvent = (id, field, value) => {
    setEvents(list => list.map(item => item.id === id ? { ...item, [field]: Math.max(0, Number(value) || 0) } : item))
    setSavedStatus(false)
  }
  const addEvent = () => {
    setDraft({ venue: '', time: nowTime(), capacity: '' })
    setShowCreateForm(true)
    setNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const startEvent = e => {
    e.preventDefault()
    if (!draft.venue.trim() || !draft.time || draft.capacity === '' || Number(draft.capacity) < 0) return
    const item = newEvent(draft)
    setEvents(list => [...list, item])
    setActiveId(item.id)
    setShowCreateForm(false)
    setSavedStatus(false)
    setNotice('Event started. Your other events are still saved.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const save = () => {
    const item = { ...event, total, savedAt: new Date().toISOString() }
    setHistory(list => [item, ...list.filter(x => x.id !== event.id)].slice(0, 50))
    setSavedStatus(true)
    setNotice('Event saved to history. It remains active in your event list.')
  }
  const finishEvent = () => {
    const item = { ...event, total, savedAt: new Date().toISOString() }
    setHistory(list => [item, ...list.filter(x => x.id !== event.id)].slice(0, 50))
    const remaining = events.filter(x => x.id !== event.id)
    setEvents(remaining)
    setActiveId(remaining[0]?.id || null)
    setSavedStatus(false)
    setShowReport(false)
    setNotice('Event finished and moved to history.')
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(report); setNotice('Report copied to clipboard.') }
    catch { setNotice('Copy is unavailable. Select the report text and copy it.') }
  }
  const share = async () => {
    if (!navigator.share) return copy()
    try { await navigator.share({ title: `Event report - ${event.venue || 'Event'}`, text: report }) }
    catch (error) { if (error.name !== 'AbortError') setNotice('Sharing failed. Try copying the report.') }
  }
  const openHistory = item => {
    const restored = { ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    setEvents(list => [...list, restored])
    setActiveId(restored.id)
    setSavedStatus(false)
    setNotice('Saved event restored as a new active event.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const removeHistory = id => setHistory(list => list.filter(item => item.id !== id))
  const deleteEvent = id => {
    const target = events.find(item => item.id === id)
    if (!target) return
    const name = target.venue.trim() || 'this event'
    if (!window.confirm(`Delete ${name}? This will permanently remove it from active events and cannot be undone.`)) return
    const remaining = events.filter(item => item.id !== id)
    setEvents(remaining)
    if (activeId === id) setActiveId(remaining[0]?.id || null)
    setSavedStatus(false)
    setNotice(`Deleted ${name}.`)
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top"><span className="brand-mark">EC</span><span>Event<span className="brand-light">Counter</span></span></a>
      <div className="live-pill"><span /> LIVE EVENT TRACKER</div>
    </header>
    <div className="workspace" id="top">
      <aside className="sidebar">
        <a className="sidebar-brand" href="#top">ACTIVE WORKSPACE</a>
      <nav className="sidebar-view-nav" aria-label="Workspace views">
        <button className={`sidebar-view-button ${viewMode === 'dashboard' ? 'selected' : ''}`} onClick={() => setViewMode('dashboard')}><span>▣</span> Dashboard</button>
        <button className={`sidebar-view-button ${viewMode === 'grid' ? 'selected' : ''}`} onClick={() => { setViewMode('grid'); setShowCreateForm(false) }}><span>▦</span> Grid view <small>{events.length}</small></button>
      </nav>
      <section className="active-events-section">
        <div className="section-heading"><div><p className="eyebrow">YOUR WORKSPACE</p><h2>Active events</h2></div><span className="history-count">{events.length} active</span></div>
        <div className="event-tabs">
          {events.map((item, index) => <div key={item.id} className={`event-tab ${item.id === event.id ? 'selected' : ''}`}>
            <button className="event-tab-main" onClick={() => { setActiveId(item.id); setSavedStatus(false); setNotice('') }}>
              <span className="event-tab-indicator" /><span className="event-tab-text"><strong>{item.venue.trim() || `New event ${index + 1}`}</strong><small>{formatTime(item.time)} · {Number(item.capacity).toLocaleString()} capacity</small></span><span className="event-tab-arrow">›</span>
            </button>
            <button className="event-delete-button" aria-label={`Delete ${item.venue || 'event'}`} title="Delete event" onClick={() => deleteEvent(item.id)}>×</button>
          </div>)}
          <button className="add-event-tab" onClick={addEvent}>＋ <span>Add event</span></button>
        </div>
      </section>
      <section className="sidebar-history">
        <div className="section-heading"><div><p className="eyebrow">SAVED RECORDS</p><h2>Event history</h2></div><span className="history-count">{history.length}</span></div>
        {!history.length ? <p className="sidebar-empty">Saved events will appear here.</p> : <div className="sidebar-history-list">{history.map(item => <article className="sidebar-history-item" key={item.id}><div><strong>{item.venue || 'Untitled event'}</strong><small>{formatTime(item.time)} · {item.total ?? eventTotal(item)} guests</small></div><button className="text-button" onClick={() => openHistory(item)}>Restore</button><button className="delete-button" aria-label="Delete saved event" onClick={() => removeHistory(item.id)}>×</button></article>)}</div>}
      </section>
      </aside>
      <main className="dashboard-content">
      {showCreateForm ? <section className="create-event-panel panel">
        <div className="panel-title-row"><div><p className="eyebrow">NEW EVENT</p><h2>Set up your event</h2></div></div>
        <form className="create-event-form" onSubmit={startEvent}>
          <label className="field"><span>Event location</span><input autoFocus required value={draft.venue} onChange={e => setDraft(d => ({ ...d, venue: e.target.value }))} placeholder="e.g. DELUXE BAR - MELBOURNE" /></label>
          <label className="field"><span>Event time</span><input required type="time" value={draft.time} onChange={e => setDraft(d => ({ ...d, time: e.target.value }))} /></label>
          <label className="field"><span>Event capacity</span><input required type="number" min="0" inputMode="numeric" value={draft.capacity} onChange={e => setDraft(d => ({ ...d, capacity: e.target.value }))} placeholder="Enter capacity" /></label>
          <div className="create-event-actions"><button className="primary-button" type="submit">Start event</button><button className="secondary-button" type="button" onClick={() => setShowCreateForm(false)}>Cancel</button></div>
        </form>
      </section> : viewMode === 'grid' ? <section className="events-grid-view">
        <div className="grid-view-heading"><div><p className="eyebrow">ACTIVE WORKSPACE</p><h1>All active events</h1><p>Manage every event from one view.</p></div><span className="history-count">{events.length} active events</span></div>
        {events.length === 0 ? <div className="empty-active-state"><h2>Nothing to see here</h2><p>Click <strong>Add event</strong> to get started.</p></div> : <div className="active-event-grid">
          {events.map(item => {
            const itemTotal = eventTotal(item)
            const itemCapacity = Math.max(0, Number(item.capacity) || 0)
            const itemProgress = itemCapacity ? Math.min(100, Number(item.checkIn || 0) / itemCapacity * 100) : 0
            return <article className="active-event-card panel" key={item.id}>
              <div className="active-event-card-head"><div><p className="eyebrow">ACTIVE EVENT</p><h2>{item.venue || 'Untitled event'}</h2><p className="active-event-meta">{formatTime(item.time)} <span>·</span> {itemCapacity.toLocaleString()} capacity</p></div><div className="grid-card-top-actions"><button className="grid-report-button" onClick={() => { setActiveId(item.id); setSavedStatus(false); setNotice(''); setShowReport(true) }}>Generate report</button><button className="open-event-button" onClick={() => { setActiveId(item.id); setViewMode('dashboard'); setSavedStatus(false); setNotice('') }}>Open</button></div></div>
              <div className="grid-checkin"><div><span>CHECK IN</span><strong>{item.checkIn}</strong><small>of {itemCapacity.toLocaleString()} capacity</small></div><div className="grid-card-actions"><button disabled={item.checkIn <= 0} onClick={() => updateGridEvent(item.id,'checkIn',Number(item.checkIn || 0)-1)} aria-label="Decrease check-ins">−</button><button onClick={() => updateGridEvent(item.id,'checkIn',Number(item.checkIn || 0)+1)} aria-label="Increase check-ins">＋</button></div></div>
              <div className="grid-progress"><span style={{width:`${itemProgress}%`}} /></div>
              <div className="grid-category-controls">
                {['frees','cash','cards'].map((field) => <div className={`grid-category ${field}`} key={field}><div><span>{field.toUpperCase()}</span><strong>{item[field]}</strong></div><div className="grid-card-actions"><button disabled={item[field] <= 0} onClick={() => updateGridEvent(item.id,field,Number(item[field] || 0)-1)} aria-label={`Decrease ${field}`}>−</button><button onClick={() => updateGridEvent(item.id,field,Number(item[field] || 0)+1)} aria-label={`Increase ${field}`}>＋</button></div></div>)}
              </div>
              <div className="grid-event-total"><span>Total guests</span><strong>{itemTotal.toLocaleString()}</strong></div>
            </article>
          })}
        </div>}
      </section> : !event ? <section className="empty-active-state"><h2>Nothing to see here</h2><p>Click <strong>Add event</strong> to get started.</p></section> : <>
      <header className="dashboard-event-heading"><p className="eyebrow">ACTIVE EVENT</p><h1>{event.venue || 'Untitled event'}</h1><p>{formatTime(event.time)} <span>·</span> {capacity.toLocaleString()} capacity</p></header>
      <div className="dashboard-grid">
      <div className="dashboard-left">
      <section className="checkin-panel panel">
        <div className="panel-title-row"><div><p className="eyebrow">02 / ATTENDANCE</p><h2>Live check-in counter</h2></div><span className="live-label"><span /> Updating live</span></div>
        <div className="checkin-display"><div className="checkin-copy"><span className="eyebrow">CHECK IN</span><strong>{event.checkIn}</strong><span className="capacity-copy">of {capacity.toLocaleString()} capacity</span></div>
          <div className="main-counter-actions"><button className="main-step-button" aria-label="Decrease check-ins" disabled={event.checkIn <= 0} onClick={() => update('checkIn', Math.max(0, event.checkIn - 1))}>−</button><button className="main-step-button plus" aria-label="Increase check-ins" onClick={() => update('checkIn', event.checkIn + 1)}>＋</button></div>
        </div>
        <div className="progress-area"><div className="progress-meta"><span>Capacity used</span><strong>{progress.toFixed(0)}%</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div></div>
      </section>
      </div>
      <div className="dashboard-right">
      <section className="categories-section"><div className="section-heading"><div><p className="eyebrow">03 / BREAKDOWN</p><h2>Guest categories</h2></div><span className="muted-note">Tap to adjust counts</span></div>
        <div className="counter-grid"><Counter label="Frees" value={event.frees} onChange={v => update('frees', v)} tone="purple" description="Complimentary" /><Counter label="Cash" value={event.cash} onChange={v => update('cash', v)} tone="green" description="Cash payments" /><Counter label="Cards" value={event.cards} onChange={v => update('cards', v)} tone="blue" description="Card payments" /></div>
      </section>
      <section className="total-panel"><div><p className="eyebrow">ATTENDANCE SUMMARY</p><h2>Total guests</h2><p className="total-breakdown">{event.checkIn} check-ins + {event.frees} frees + {event.cash} cash + {event.cards} cards</p></div><strong className="total-number">{total.toLocaleString()}</strong></section>
      <button className="primary-button generate-report-button" onClick={() => { setShowReport(true); setNotice('') }}>Generate report</button>
      {notice && <p className="notice" role="status">{notice}</p>}
      </div>
      </div></>}
      {showReport && event && <div className="report-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowReport(false) }}>
        <section className="report-modal panel" role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
          <div className="panel-title-row"><div><p className="eyebrow">04 / REPORT</p><h2 id="report-modal-title">Generated report</h2><p className="report-description">This report belongs to {event.venue.trim() || 'the selected event'}.</p></div><div className="report-modal-status"><span className={`ready-tag ${savedStatus ? 'saved' : ''}`}>{savedStatus ? 'Saved' : 'Ready'}</span><button className="report-modal-close" aria-label="Close report" onClick={() => setShowReport(false)}>×</button></div></div>
          <pre className="report-output">{report}</pre>
          <div className="report-actions"><button className="primary-button" onClick={save}>Save event</button><button className="secondary-button" onClick={copy}>Copy report</button><button className="secondary-button share-button" onClick={share}>Share</button><button className="finish-button" onClick={finishEvent}>Finish event</button></div>
          {notice && <p className="notice" role="status">{notice}</p>}
        </section>
      </div>}
      <footer className="footer"><span>EventCounter</span><span>Your event, counted.</span></footer>
      </main>
    </div>
  </div>
}
