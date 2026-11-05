'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/db/client';
import {
  Clock,
  Play,
  Square,
  Plus,
  Trash2,
  FolderKanban,
  BarChart3,
  Download,
  AlertCircle,
} from 'lucide-react';
import type { Project, TimeEntryWithProject } from '@/lib/database.types';
import { formatDateTime, formatMinutes, minutesToHours } from '@/lib/utils';
import { MAX_TASK_MINUTES, MAX_TASK_MS } from '@/lib/timeTracking';

type SubTab = 'track' | 'projects' | 'reports';

const todayStr = () => new Date().toISOString().split('T')[0];
const firstOfMonthStr = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};

// ms -> HH:MM:SS
function formatElapsed(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function TimeTrackingPage() {
  const db = useMemo(() => createClient(), []);

  const [tab, setTab] = useState<SubTab>('track');
  const [error, setError] = useState<string | null>(null);

  // Projects
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Track / running timer
  const [running, setRunning] = useState<TimeEntryWithProject | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskProjectId, setTaskProjectId] = useState('');
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  // Reports
  const [reportProjectId, setReportProjectId] = useState('');
  const [reportFrom, setReportFrom] = useState(firstOfMonthStr());
  const [reportTo, setReportTo] = useState(todayStr());
  const [reportEntries, setReportEntries] = useState<TimeEntryWithProject[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportRan, setReportRan] = useState(false);

  // ---- API helper ---------------------------------------------------------
  const apiFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const { data: { session } } = await db.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          ...(options.headers || {}),
        },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Request failed');
      return json;
    },
    [db],
  );

  // ---- Loaders ------------------------------------------------------------
  const fetchProjects = useCallback(async () => {
    try {
      const json = await apiFetch('/api/admin/time-tracking/projects');
      setProjects(json.projects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    }
  }, [apiFetch]);

  const fetchRunning = useCallback(async () => {
    try {
      const json = await apiFetch('/api/admin/time-tracking/entries');
      setRunning(json.running || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timer');
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchProjects();
    fetchRunning();
  }, [fetchProjects, fetchRunning]);

  // ---- Live ticking while a timer runs ------------------------------------
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const elapsedMs = running ? now - new Date(running.started_at).getTime() : 0;

  // ---- Actions ------------------------------------------------------------
  const handleStart = async () => {
    if (!taskTitle.trim() || !taskProjectId) return;
    setStarting(true);
    setError(null);
    try {
      await apiFetch('/api/admin/time-tracking/entries', {
        method: 'POST',
        body: JSON.stringify({
          project_id: taskProjectId,
          title: taskTitle,
          description: taskDesc,
        }),
      });
      setTaskTitle('');
      setTaskDesc('');
      await fetchRunning();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start task');
    } finally {
      setStarting(false);
    }
  };

  const handleStop = useCallback(async () => {
    if (!running || stopping) return;
    setStopping(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/time-tracking/entries/${running.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'stop' }),
      });
      await fetchRunning();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop task');
    } finally {
      setStopping(false);
    }
  }, [running, stopping, apiFetch, fetchRunning]);

  // Auto-stop once the visible timer reaches the cap.
  useEffect(() => {
    if (running && elapsedMs >= MAX_TASK_MS && !stopping) {
      handleStop();
    }
  }, [running, elapsedMs, stopping, handleStop]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setCreatingProject(true);
    setError(null);
    try {
      await apiFetch('/api/admin/time-tracking/projects', {
        method: 'POST',
        body: JSON.stringify({ name: newProjectName, description: newProjectDesc }),
      });
      setNewProjectName('');
      setNewProjectDesc('');
      await fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setCreatingProject(false);
    }
  };

  const handleToggleActive = async (p: Project) => {
    try {
      await apiFetch(`/api/admin/time-tracking/projects/${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !p.is_active }),
      });
      await fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await apiFetch(`/api/admin/time-tracking/projects/${id}`, { method: 'DELETE' });
      setDeleteConfirm(null);
      await fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  const runReport = useCallback(async () => {
    setReportLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (reportProjectId) params.set('project_id', reportProjectId);
      if (reportFrom) params.set('from', reportFrom);
      if (reportTo) params.set('to', reportTo);
      const json = await apiFetch(`/api/admin/time-tracking/entries?${params.toString()}`);
      setReportEntries(json.entries || []);
      setReportRan(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setReportLoading(false);
    }
  }, [apiFetch, reportProjectId, reportFrom, reportTo]);

  const reportTotalMinutes = reportEntries.reduce(
    (sum, e) => sum + (e.duration_minutes ?? 0),
    0,
  );
  const reportProjectName = reportProjectId
    ? projects.find((p) => p.id === reportProjectId)?.name ?? 'Project'
    : 'All Projects';

  const handleDownloadPdf = async () => {
    // Lazy-load jsPDF so the ~140KB bundle is only fetched on demand.
    const { generateProjectReportPdf } = await import('@/lib/timeTrackingPdf');
    generateProjectReportPdf({
      projectName: reportProjectName,
      from: reportFrom,
      to: reportTo,
      entries: reportEntries,
    });
  };

  const activeProjects = projects.filter((p) => p.is_active);

  // ---- Render -------------------------------------------------------------
  const tabs: { key: SubTab; label: string; icon: typeof Clock }[] = [
    { key: 'track', label: 'Track', icon: Clock },
    { key: 'projects', label: 'Projects', icon: FolderKanban },
    { key: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Time Tracking</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track tasks per project and generate time reports.
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ===================== TRACK ===================== */}
      {tab === 'track' && (
        <div className="space-y-6">
          {running ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-green-600 mb-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
                Running
              </div>
              <h2 className="text-xl font-bold text-gray-900">{running.title}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {running.project_name || 'Unknown project'}
                {running.description ? ` · ${running.description}` : ''}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Started {formatDateTime(running.started_at)}
              </p>
              <div className="mt-5 flex items-center gap-5">
                <span className="text-4xl font-mono font-semibold tabular-nums text-gray-900">
                  {formatElapsed(Math.min(elapsedMs, MAX_TASK_MS))}
                </span>
                <button
                  onClick={handleStop}
                  disabled={stopping}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  <Square className="w-4 h-4" />
                  {stopping ? 'Ending…' : 'End'}
                </button>
              </div>
              <p className="mt-3 text-xs text-gray-400">
                Tasks are automatically capped at {formatMinutes(MAX_TASK_MINUTES)}.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Task</h2>
              {activeProjects.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Create a project first in the <strong>Projects</strong> tab.
                </p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="e.g. Homepage hero redesign"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={taskDesc}
                      onChange={(e) => setTaskDesc(e.target.value)}
                      rows={3}
                      placeholder="What are you working on?"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={taskProjectId}
                      onChange={(e) => setTaskProjectId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select a project…</option>
                      {activeProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-gray-400">
                    The start time is captured automatically when you press Start.
                  </p>
                  <button
                    onClick={handleStart}
                    disabled={starting || !taskTitle.trim() || !taskProjectId}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    {starting ? 'Starting…' : 'Start'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================== PROJECTS ===================== */}
      {tab === 'projects' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Project</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Acme Ltd Website"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleCreateProject}
                disabled={creatingProject || !newProjectName.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
                {creatingProject ? 'Adding…' : 'Add Project'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {projects.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No projects yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">
                        Description
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">
                        Created
                      </th>
                      <th className="text-center px-4 py-3 font-medium text-gray-500">Active</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {projects.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                        <td className="px-4 py-3 text-gray-600 hidden md:table-cell max-w-[280px] truncate">
                          {p.description || '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden lg:table-cell whitespace-nowrap">
                          {formatDateTime(p.created_at)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleActive(p)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              p.is_active ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                p.is_active ? 'translate-x-4.5' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {deleteConfirm === p.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDeleteProject(p.id)}
                                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(p.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                                title="Delete (also removes its time entries)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== REPORTS ===================== */}
      {tab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                <select
                  value={reportProjectId}
                  onChange={(e) => setReportProjectId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <input
                  type="date"
                  value={reportFrom}
                  onChange={(e) => setReportFrom(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input
                  type="date"
                  value={reportTo}
                  onChange={(e) => setReportTo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={runReport}
                disabled={reportLoading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                {reportLoading ? 'Loading…' : 'Run Report'}
              </button>
            </div>
          </div>

          {reportRan && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow-sm p-5">
                  <p className="text-sm text-gray-500">Total time</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatMinutes(reportTotalMinutes)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {minutesToHours(reportTotalMinutes)} hours
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-5">
                  <p className="text-sm text-gray-500">Tasks</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{reportEntries.length}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-5">
                  <p className="text-sm text-gray-500">Project</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1 truncate">
                    {reportProjectName}
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleDownloadPdf}
                  disabled={reportEntries.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
              </div>

              {/* Entries table */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {reportEntries.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No tasks recorded for this filter.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-500">Task</th>
                          {!reportProjectId && (
                            <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">
                              Project
                            </th>
                          )}
                          <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">
                            Start
                          </th>
                          <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">
                            End
                          </th>
                          <th className="text-right px-4 py-3 font-medium text-gray-500">
                            Duration
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {reportEntries.map((e) => (
                          <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                              {new Date(e.started_at).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">{e.title}</p>
                              {e.description && (
                                <p className="text-xs text-gray-500 max-w-[320px] truncate">
                                  {e.description}
                                </p>
                              )}
                            </td>
                            {!reportProjectId && (
                              <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                                {e.project_name || '—'}
                              </td>
                            )}
                            <td className="px-4 py-3 text-gray-500 hidden lg:table-cell whitespace-nowrap">
                              {new Date(e.started_at).toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-3 text-gray-500 hidden lg:table-cell whitespace-nowrap">
                              {e.ended_at
                                ? new Date(e.ended_at).toLocaleTimeString('en-GB', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                              {formatMinutes(e.duration_minutes ?? 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
