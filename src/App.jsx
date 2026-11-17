import { useEffect, useMemo, useState } from 'react'
import './App.css'

const KEY = 'event-counter-v1'
const nowTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const newEvent = () => ({
  id: crypto.randomUUID(), venue: '', time: nowTime(), capacity: 429,
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
  const [event, setEvent] = useState(() => saved.activeEvent || newEvent())
  const [history, setHistory] = useState(() => saved.history || [])
  const [notice, setNotice] = useState('')
  const [savedStatus, setSavedStatus] = useState(false)
  const total = event.checkIn + event.frees + event.cash + event.cards
  const capacity = Math.max(0, Number(event.capacity) || 0)
  const progress = capacity ? Math.min(100, event.checkIn / capacity * 100) : 0
  useEffect(() => localStorage.setItem(KEY, JSON.stringify({ activeEvent: event, history })), [event, history])
  const report = [
    `WHERE: ${event.venue.trim() || '—'}`,
    `TIME: ${formatTime(event.time)}`,
    `CHECK IN: ${event.checkIn}/${capacity}`,
    `FREES: ${event.frees}`, `CASH: ${event.cash}`,
    `CARDS: ${event.cards}`, `TOTAL: ${total}`,
  ].join('\n')
  const update = (field, value) => { setEvent(current => ({ ...current, [field]: value })); setSavedStatus(false) }
  const save = () => {
    const item = { ...event, total, savedAt: new Date().toISOString() }
    setHistory(list => [item, ...list.filter(x => x.id !== event.id)].slice(0, 30))
    setSavedStatus(true); setNotice('Event saved to history.')
  }
  const startNew = () => {
    if (total || event.venue.trim()) {
      const item = { ...event, total, savedAt: new Date().toISOString() }
      setHistory(list => [item, ...list.filter(x => x.id !== event.id)].slice(0, 30))
    }
    setEvent(newEvent()); setSavedStatus(false); setNotice('New event started.')
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(report); setNotice('Report copied to clipboard.') }
    catch { setNotice('Copy is unavailable. Select the report text and copy it.') }
  }
  const share = async () => {
    if (!navigator.share) return copy()
    try { await navigator.share({ title: 'Event check-in report', text: report }) }
    catch (error) { if (error.name !== 'AbortError') setNotice('Sharing failed. Try copying the report.') }
  }
  const openHistory = item => {
    setEvent({ ...item, id: crypto.randomUUID() }); setSavedStatus(true)
    setNotice('Previous event loaded. Changes will be saved separately.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top"><span className="brand-mark">EC</span><span>Event<span className="brand-light">Counter</span></span></a>
      <div className="live-pill"><span /> LIVE EVENT TRACKER</div>
    </header>
    <div className="content" id="top">
      <section className="page-heading"><div><p className="eyebrow">EVENT MANAGEMENT</p><h1>Event check-in</h1><p className="subheading">Keep your count accurate. Generate your report in seconds.</p></div><button className="secondary-button new-event-button" onClick={startNew}>＋ New event</button></section>
      <section className="event-panel panel">
        <div className="panel-title-row"><div><p className="eyebrow">01 / EVENT DETAILS</p><h2>Event information</h2></div><span className="status-tag"><span /> In progress</span></div>
        <div className="details-grid">
          <label className="field field-wide"><span>Event location</span><input value={event.venue} onChange={e => update('venue', e.target.value)} placeholder="e.g. DELUXE BAR - MELBOURNE" /></label>
          <label className="field"><span>Event time</span><input type="time" value={event.time} onChange={e => update('time', e.target.value)} /></label>
          <label className="field"><span>Event capacity</span><input type="number" min="0" inputMode="numeric" value={event.capacity} onChange={e => update('capacity', e.target.value)} /></label>
        </div>
      </section>
      <section className="checkin-panel panel">
        <div className="panel-title-row"><div><p className="eyebrow">02 / ATTENDANCE</p><h2>Live check-in counter</h2></div><span className="live-label"><span /> Updating live</span></div>
        <div className="checkin-display"><div className="checkin-copy"><span className="eyebrow">CHECK IN</span><strong>{event.checkIn}</strong><span className="capacity-copy">of {capacity.toLocaleString()} capacity</span></div>
          <div className="main-counter-actions"><button className="main-step-button" aria-label="Decrease check-ins" disabled={event.checkIn <= 0} onClick={() => update('checkIn', Math.max(0, event.checkIn - 1))}>−</button><button className="main-step-button plus" aria-label="Increase check-ins" onClick={() => update('checkIn', event.checkIn + 1)}>＋</button></div>
        </div>
        <div className="progress-area"><div className="progress-meta"><span>Capacity used</span><strong>{progress.toFixed(0)}%</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div></div>
      </section>
      <section className="categories-section"><div className="section-heading"><div><p className="eyebrow">03 / BREAKDOWN</p><h2>Guest categories</h2></div><span className="muted-note">Tap to adjust counts</span></div>
        <div className="counter-grid"><Counter label="Frees" value={event.frees} onChange={v => update('frees', v)} tone="purple" description="Complimentary" /><Counter label="Cash" value={event.cash} onChange={v => update('cash', v)} tone="green" description="Cash payments" /><Counter label="Cards" value={event.cards} onChange={v => update('cards', v)} tone="blue" description="Card payments" /></div>
      </section>
      <section className="total-panel"><div><p className="eyebrow">ATTENDANCE SUMMARY</p><h2>Total guests</h2><p className="total-breakdown">{event.checkIn} check-ins + {event.frees} frees + {event.cash} cash + {event.cards} cards</p></div><strong className="total-number">{total.toLocaleString()}</strong></section>
      <section className="report-panel panel"><div className="panel-title-row"><div><p className="eyebrow">04 / REPORT</p><h2>Generated report</h2><p className="report-description">Your report updates automatically as you change the counts.</p></div><span className={`ready-tag ${savedStatus ? 'saved' : ''}`}>{savedStatus ? 'Saved' : 'Ready'}</span></div>
        <pre className="report-output">{report}</pre><div className="report-actions"><button className="primary-button" onClick={save}>Save event</button><button className="secondary-button" onClick={copy}>Copy report</button><button className="secondary-button share-button" onClick={share}>Share</button></div>{notice && <p className="notice" role="status">{notice}</p>}
      </section>
      <section className="history-section"><div className="section-heading"><div><p className="eyebrow">05 / SAVED RECORDS</p><h2>Event history</h2></div><span className="history-count">{history.length} saved</span></div>
        {!history.length ? <div className="empty-history"><span className="empty-icon">↗</span><strong>No saved events yet</strong><p>Save an event to keep a record of its final counts.</p></div> : <div className="history-list">{history.map(item => <article className="history-item" key={item.id}><div className="history-info"><strong>{item.venue || 'Untitled event'}</strong><span>{formatTime(item.time)} · {new Date(item.savedAt || item.createdAt).toLocaleDateString()}</span></div><div className="history-total"><strong>{item.total ?? (item.checkIn + item.frees + item.cash + item.cards)}</strong><span>guests</span></div><button className="text-button" onClick={() => openHistory(item)}>Open</button><button className="delete-button" aria-label="Delete saved event" onClick={() => setHistory(list => list.filter(x => x.id !== item.id))}>×</button></article>)}</div>}
      </section>
      <footer className="footer"><span>EventCounter</span><span>Your event, counted.</span></footer>
    </div>
  </main>
}
