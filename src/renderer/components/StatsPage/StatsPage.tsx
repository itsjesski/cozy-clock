/**
 * StatsPage component - stats dashboard
 */

import React, { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useStatsStore } from '../../store/statsStore'
import { useGlobalStore } from '../../store/globalStore'
import { formatTimeHuman } from '@shared/utils'
import type { GlobalStats, StatsHistory, StatsPeriod, StatsResetScope } from '../../../types'
import styles from './StatsPage.module.css'

interface StatsPageProps {
  onBackToTimers: () => void
}

const PERIOD_LABELS: Record<StatsPeriod, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'Last 7 Days',
  month: 'This Month',
  lifetime: 'Lifetime',
}

const STAT_CARDS: Array<{ key: keyof Omit<GlobalStats, 'lastResetAt'>; label: string; color: string }> = [
  { key: 'sitTime', label: 'Sit Time', color: 'var(--accent-primary)' },
  { key: 'standTime', label: 'Stand Time', color: 'var(--success)' },
  { key: 'pomodoroWorkTime', label: 'Pomodoro Work', color: 'var(--accent-secondary)' },
  { key: 'pomodoroBreakTime', label: 'Pomodoro Breaks', color: 'var(--warning)' },
  { key: 'genericTimerTime', label: 'Generic Timers', color: 'var(--error)' },
]

const emptyStats = (): GlobalStats => ({
  sitTime: 0,
  standTime: 0,
  pomodoroWorkTime: 0,
  pomodoroBreakTime: 0,
  genericTimerTime: 0,
  lastResetAt: Date.now(),
})

const getDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const sumHistory = (entries: StatsHistory[]): GlobalStats =>
  entries.reduce<GlobalStats>(
    (total, entry) => ({
      ...total,
      sitTime: total.sitTime + entry.sitTime,
      standTime: total.standTime + entry.standTime,
      pomodoroWorkTime: total.pomodoroWorkTime + entry.pomodoroWorkTime,
      pomodoroBreakTime: total.pomodoroBreakTime + entry.pomodoroBreakTime,
      genericTimerTime: total.genericTimerTime + entry.genericTimerTime,
    }),
    emptyStats(),
  )

const filterHistoryByPeriod = (history: StatsHistory[], period: StatsPeriod) => {
  const today = new Date()
  const todayKey = getDateKey(today)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const yesterdayKey = getDateKey(yesterday)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - 6)
  weekStart.setHours(0, 0, 0, 0)
  const monthYear = today.getFullYear()
  const monthIndex = today.getMonth()

  return history.filter((entry) => {
    if (period === 'today') return entry.date === todayKey
    if (period === 'yesterday') return entry.date === yesterdayKey
    if (period === 'week') {
      const entryDate = new Date(`${entry.date}T00:00:00`)
      return entryDate >= weekStart && entryDate <= today
    }
    if (period === 'month') {
      const entryDate = new Date(`${entry.date}T00:00:00`)
      return entryDate.getFullYear() === monthYear && entryDate.getMonth() === monthIndex
    }
    return true
  })
}

const downloadTextFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export const StatsPage: React.FC<StatsPageProps> = ({ onBackToTimers }) => {
  const settings = useGlobalStore((state) => state.settings)
  const setSettings = useGlobalStore((state) => state.setSettings)
  const { stats, history, lifetimeStats, selectedPeriod, setOverview, setSelectedPeriod } = useStatsStore()
  const [isLoading, setIsLoading] = useState(false)
  const [resetScope, setResetScope] = useState<StatsResetScope | null>(null)

  useEffect(() => {
    const loadOverview = async () => {
      setIsLoading(true)
      try {
        const result = await window.electronAPI?.getStats(selectedPeriod)
        if (result?.success && result.data) {
          setOverview(result.data)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadOverview()
  }, [selectedPeriod, setOverview])

  useEffect(() => {
    const refreshOverview = () => {
      window.electronAPI?.getStats(selectedPeriod).then((result: any) => {
        if (result?.success && result.data) {
          setOverview(result.data)
        }
      })
    }

    const unsubscribe = window.electronAPI?.onStatsUpdate(refreshOverview)
    return () => {
      unsubscribe?.()
    }
  }, [selectedPeriod, setOverview])

  const periodHistory = useMemo(
    () => filterHistoryByPeriod(history, selectedPeriod),
    [history, selectedPeriod],
  )

  const selectedStats = useMemo(
    () => (selectedPeriod === 'lifetime' ? lifetimeStats : sumHistory(periodHistory)),
    [lifetimeStats, periodHistory, selectedPeriod],
  )

  const chartData = useMemo(() => {
    const source = selectedPeriod === 'lifetime' ? history.slice(-14) : periodHistory
    return source.map((entry) => ({
      name: entry.date.slice(5),
      sitTime: Math.round(entry.sitTime / 60),
      standTime: Math.round(entry.standTime / 60),
      pomodoroWorkTime: Math.round(entry.pomodoroWorkTime / 60),
      pomodoroBreakTime: Math.round(entry.pomodoroBreakTime / 60),
      genericTimerTime: Math.round(entry.genericTimerTime / 60),
    }))
  }, [history, periodHistory, selectedPeriod])

  const exportJson = () => {
    downloadTextFile(
      `cozy-clock-stats-${selectedPeriod}.json`,
      JSON.stringify(
        {
          period: selectedPeriod,
          currentStats: stats,
          selectedStats,
          lifetimeStats,
          history,
        },
        null,
        2,
      ),
      'application/json',
    )
  }

  const exportCsv = () => {
    const rows = [
      ['date', 'sit_minutes', 'stand_minutes', 'pomodoro_work_minutes', 'pomodoro_break_minutes', 'generic_minutes'],
      ...history.map((entry) => [
        entry.date,
        `${Math.round(entry.sitTime / 60)}`,
        `${Math.round(entry.standTime / 60)}`,
        `${Math.round(entry.pomodoroWorkTime / 60)}`,
        `${Math.round(entry.pomodoroBreakTime / 60)}`,
        `${Math.round(entry.genericTimerTime / 60)}`,
      ]),
    ]
    downloadTextFile(
      `cozy-clock-stats-${selectedPeriod}.csv`,
      rows.map((row) => row.join(',')).join('\n'),
      'text/csv;charset=utf-8',
    )
  }

  const handleReset = async () => {
    if (!resetScope) return

    const result = await window.electronAPI?.resetStats(['all'], resetScope)
    if (result?.success && result.data) {
      setOverview(result.data)
    }
    setResetScope(null)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Stats Dashboard</h2>
          <p className={styles.subtitle}>Track your timer activity across recent periods and lifetime totals.</p>
        </div>
        <button className={styles.secondaryButton} onClick={onBackToTimers}>
          Back to Timers
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.periodTabs}>
          {(Object.keys(PERIOD_LABELS) as StatsPeriod[]).map((period) => (
            <button
              key={period}
              className={`${styles.periodTab} ${selectedPeriod === period ? styles.periodTabActive : ''}`}
              onClick={() => setSelectedPeriod(period)}
            >
              {PERIOD_LABELS[period]}
            </button>
          ))}
        </div>

        <div className={styles.toolbarActions}>
          <label className={styles.scheduleField}>
            Auto Reset
            <select
              className={styles.select}
              value={settings.autoResetStatsSchedule ?? 'never'}
              onChange={(event) => {
                const autoResetStatsSchedule = event.target.value as
                  | 'never'
                  | 'daily'
                  | 'weekly'
                  | 'monthly'
                setSettings({ autoResetStatsSchedule })
                window.electronAPI?.updateSettings({ autoResetStatsSchedule })
              }}
            >
              <option value="never">Never</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <button className={styles.secondaryButton} onClick={exportJson}>
            Export JSON
          </button>
          <button className={styles.secondaryButton} onClick={exportCsv}>
            Export CSV
          </button>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>{PERIOD_LABELS[selectedPeriod]}</h3>
          {isLoading && <span className={styles.mutedText}>Loading…</span>}
        </div>
        <div className={styles.cardGrid}>
          {STAT_CARDS.map((card) => (
            <div key={card.key} className={styles.statCard} style={{ ['--stat-accent' as string]: card.color }}>
              <span className={styles.statLabel}>{card.label}</span>
              <strong className={styles.statValue}>{formatTimeHuman(selectedStats[card.key])}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Current Totals</h3>
          <span className={styles.mutedText}>Reset on demand or by schedule</span>
        </div>
        <div className={styles.cardGrid}>
          {STAT_CARDS.map((card) => (
            <div key={`current-${card.key}`} className={styles.statCard} style={{ ['--stat-accent' as string]: card.color }}>
              <span className={styles.statLabel}>{card.label}</span>
              <strong className={styles.statValue}>{formatTimeHuman(stats[card.key])}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Lifetime Totals</h3>
          <span className={styles.mutedText}>Manual reset only</span>
        </div>
        <div className={styles.cardGrid}>
          {STAT_CARDS.map((card) => (
            <div key={`lifetime-${card.key}`} className={styles.statCard} style={{ ['--stat-accent' as string]: card.color }}>
              <span className={styles.statLabel}>{card.label}</span>
              <strong className={styles.statValue}>{formatTimeHuman(lifetimeStats[card.key])}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Activity Chart</h3>
          <span className={styles.mutedText}>Minutes per day</span>
        </div>
        <div className={styles.chartWrap}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 10,
                    color: 'var(--text-primary)',
                  }}
                />
                <Legend />
                <Bar dataKey="sitTime" name="Sit" stackId="a" fill="var(--accent-primary)">
                  {chartData.map((_, index) => (
                    <Cell key={`sit-${index}`} fill="var(--accent-primary)" />
                  ))}
                </Bar>
                <Bar dataKey="standTime" name="Stand" stackId="a" fill="var(--success)">
                  {chartData.map((_, index) => (
                    <Cell key={`stand-${index}`} fill="var(--success)" />
                  ))}
                </Bar>
                <Bar dataKey="pomodoroWorkTime" name="Pomodoro Work" stackId="a" fill="var(--accent-secondary)" />
                <Bar dataKey="pomodoroBreakTime" name="Pomodoro Break" stackId="a" fill="var(--warning)" />
                <Bar dataKey="genericTimerTime" name="Generic" stackId="a" fill="var(--error)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.emptyState}>Complete some timer cycles to populate stats.</div>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Reset Controls</h3>
          <span className={styles.mutedText}>Confirmation required</span>
        </div>
        <div className={styles.resetActions}>
          <button className={styles.secondaryButton} onClick={() => setResetScope('current')}>
            Reset Current Stats
          </button>
          <button className={styles.secondaryButton} onClick={() => setResetScope('lifetime')}>
            Reset Lifetime Stats
          </button>
        </div>
      </section>

      {resetScope && (
        <div className={styles.overlay} onClick={() => setResetScope(null)}>
          <div className={styles.confirmModal} onClick={(event) => event.stopPropagation()}>
            <h4 className={styles.confirmTitle}>Confirm Reset</h4>
            <p className={styles.confirmText}>
              {resetScope === 'current'
                ? 'Reset current stats totals? History entries stay intact.'
                : 'Reset lifetime stats totals? This does not change your daily history.'}
            </p>
            <div className={styles.resetActions}>
              <button className={styles.secondaryButton} onClick={() => setResetScope(null)}>
                Cancel
              </button>
              <button className={styles.primaryButton} onClick={handleReset}>
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StatsPage
