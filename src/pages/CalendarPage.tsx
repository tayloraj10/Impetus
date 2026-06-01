import { useEffect, useState, useMemo } from 'react'
import { subscribeAllEventsGlobal } from '../services/eventsService'
import { useTopics } from '../hooks/useTopics'
import type { ImpetusEvent } from '../types'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getCalendarCells(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function dayKey(year: number, month: number, day: number) {
  return `${year}-${month}-${day}`
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function ChevronLeft() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

export function CalendarPage() {
  const today = new Date()
  const [events, setEvents] = useState<ImpetusEvent[]>([])
  const { topics } = useTopics()
  const [selectedTopicId, setSelectedTopicId] = useState<string>('')
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate())

  useEffect(() => subscribeAllEventsGlobal(setEvents), [])

  const topicMap = useMemo(() => new Map(topics.map(t => [t.id, t])), [topics])

  const filtered = useMemo(
    () => events.filter(e => !selectedTopicId || e.topicId === selectedTopicId),
    [events, selectedTopicId],
  )

  const byDay = useMemo(() => {
    const map = new Map<string, ImpetusEvent[]>()
    for (const e of filtered) {
      const key = dayKey(e.date.getFullYear(), e.date.getMonth(), e.date.getDate())
      const arr = map.get(key) ?? []
      arr.push(e)
      map.set(key, arr)
    }
    return map
  }, [filtered])

  function eventsForDay(d: number): ImpetusEvent[] {
    return byDay.get(dayKey(year, month, d)) ?? []
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  function goToToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedDay(today.getDate())
  }

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
  const cells = getCalendarCells(year, month)

  const displayEvents = selectedDay
    ? eventsForDay(selectedDay)
    : filtered
        .filter(e => e.date >= today)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 30)

  const panelTitle = selectedDay
    ? `${MONTHS[month]} ${selectedDay}`
    : 'Upcoming'

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Toolbar */}
      <div className="bg-zinc-900/80 border-b border-zinc-800 px-4 py-2 flex items-center gap-3 shrink-0 backdrop-blur-sm flex-wrap">
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft />
          </button>
          <span className="text-sm font-semibold text-zinc-100 min-w-[148px] text-center select-none">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ChevronRight />
          </button>
        </div>

        {!isCurrentMonth && (
          <button
            onClick={goToToday}
            className="text-xs text-emerald-400 hover:text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/30 hover:border-emerald-500/50 transition-colors"
          >
            Today
          </button>
        )}

        <select
          value={selectedTopicId}
          onChange={e => setSelectedTopicId(e.target.value)}
          className="ml-auto bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 transition-colors"
        >
          <option value="">All Topics</option>
          {topics.map(t => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Calendar grid */}
        <div className="flex-1 flex flex-col overflow-hidden p-4">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1 shrink-0">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-zinc-600 py-1.5 select-none">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div
            className="flex-1 grid grid-cols-7 gap-px bg-zinc-800/60 rounded-xl overflow-hidden"
            style={{ gridTemplateRows: `repeat(${cells.length / 7}, 1fr)` }}
          >
            {cells.map((day, i) => {
              if (!day) {
                return <div key={i} className="bg-zinc-950/80" />
              }
              const dayEvents = eventsForDay(day)
              const isToday = sameDay(new Date(year, month, day), today)
              const isSelected = day === selectedDay
              const isPast = new Date(year, month, day) < today && !isToday

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  className={`flex flex-col p-1.5 sm:p-2 text-left transition-all relative outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 ${
                    isSelected
                      ? 'bg-zinc-800 ring-1 ring-inset ring-emerald-500/60'
                      : isPast
                      ? 'bg-zinc-950/50 hover:bg-zinc-900/80'
                      : 'bg-zinc-900 hover:bg-zinc-800/80'
                  }`}
                >
                  <span
                    className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full shrink-0 select-none ${
                      isToday
                        ? 'bg-emerald-500 text-zinc-950 font-bold'
                        : isSelected
                        ? 'text-emerald-400'
                        : isPast
                        ? 'text-zinc-700'
                        : 'text-zinc-400'
                    }`}
                  >
                    {day}
                  </span>

                  {dayEvents.length > 0 && (
                    <div className="mt-1 flex flex-col gap-px w-full min-h-0">
                      {dayEvents.slice(0, 2).map(e => (
                        <div
                          key={e.id}
                          className={`text-xs px-1 py-0.5 rounded truncate leading-tight ${
                            isPast
                              ? 'bg-zinc-800 text-zinc-600'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-zinc-600 px-1">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Side panel — desktop only */}
        <div className="w-72 xl:w-80 border-l border-zinc-800 flex flex-col overflow-hidden shrink-0 hidden lg:flex">
          <div className="px-4 py-3 border-b border-zinc-800 shrink-0">
            <h3 className="text-sm font-semibold text-zinc-100">{panelTitle}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {displayEvents.length} {displayEvents.length === 1 ? 'event' : 'events'}
              {!selectedDay && ' upcoming'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {displayEvents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-zinc-600 text-sm">No events</p>
                {selectedDay && (
                  <p className="text-zinc-700 text-xs mt-1">Nothing scheduled this day</p>
                )}
              </div>
            ) : (
              displayEvents.map(e => {
                const topic = topicMap.get(e.topicId)
                return (
                  <a
                    key={e.id}
                    href={e.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-zinc-900 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all group"
                  >
                    <div className="font-medium text-zinc-100 text-sm group-hover:text-emerald-400 transition-colors leading-snug">
                      {e.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {topic && (
                        <span className="text-xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">
                          {topic.title}
                        </span>
                      )}
                      <span className="text-xs text-zinc-500">
                        {e.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {e.endDate && (
                          <> &ndash; {e.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                        )}
                      </span>
                    </div>
                    {e.location && (
                      <div className="text-xs text-zinc-600 mt-1 truncate">{e.location}</div>
                    )}
                    {e.isVirtual && !e.location && (
                      <div className="text-xs text-zinc-600 mt-1">Virtual</div>
                    )}
                  </a>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Mobile: selected day events below grid */}
      {selectedDay && (
        <div className="lg:hidden border-t border-zinc-800 max-h-52 overflow-y-auto p-3 space-y-2 bg-zinc-950 shrink-0">
          <p className="text-xs font-medium text-zinc-500 mb-2">
            {MONTHS[month]} {selectedDay} — {eventsForDay(selectedDay).length} event{eventsForDay(selectedDay).length !== 1 ? 's' : ''}
          </p>
          {eventsForDay(selectedDay).length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-4">No events this day</p>
          ) : eventsForDay(selectedDay).map(e => (
            <a
              key={e.id}
              href={e.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-zinc-900 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition-colors"
            >
              <div className="font-medium text-zinc-100 text-sm">{e.title}</div>
              <div className="text-xs text-zinc-500 mt-1">
                {topicMap.get(e.topicId)?.title} &middot; {e.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
