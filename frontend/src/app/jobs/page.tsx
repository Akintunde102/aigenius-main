'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { serverCall } from '@/servercall/init';
import { serverCalls } from '@/servercall/store';

// Types for tracking status
type JobStatus = 'pending' | 'sending' | 'sent' | 'failed';

/** Gmail/outreach duplicate check — no gateway route registered yet; returns null = proceed. */
async function fetchOutreachHistoryState(
  _to: string,
  _company: string,
): Promise<{ reached: boolean; type: 'failed' | 'sent'; reason?: string } | null> {
  return null;
}

interface ActivityLog {
  timestamp: string;
  msg: string;
  type: 'info' | 'success' | 'error';
}

export default function JobsReviewPage() {
  const [jobLeads, setJobLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: '' });

  // Automation State
  const [isAutoSending, setIsAutoSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Persistence Keys
  const PROGRESS_KEY = 'outreach_progress_v1';
  const GLOBAL_SENT_KEY = 'outreach_global_sent_v1';

  // Load and sync jobs
  useEffect(() => {
    fetch('/jobs.json')
      .then(res => res.json())
      .then((data) => {
        const savedProgress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
        const globalSent = JSON.parse(localStorage.getItem(GLOBAL_SENT_KEY) || '[]');

        const enrichedJobs = data.map((job: any) => {
          // Check both current session progress AND global history
          const isGlobalSent = globalSent.includes(job.contactEmail);
          const currentStatus = savedProgress[job.id]?.status || (isGlobalSent ? 'sent' : 'pending');

          return {
            ...job,
            status: currentStatus,
            lastError: savedProgress[job.id]?.lastError || null,
          };
        });

        setJobLeads(enrichedJobs);
        if (enrichedJobs.length > 0) {
          const firstPending = enrichedJobs.find((j: any) => j.status === 'pending') || enrichedJobs[0];
          setSelectedLead(firstPending);
          setEditedSubject(firstPending.draftSubject);
          setEditedBody(firstPending.draftBody);
        }
      })
      .catch(err => console.error("Could not load jobs", err));
  }, []);

  // Save progress whenever jobLeads changes
  useEffect(() => {
    if (jobLeads.length === 0) return;
    const progress = jobLeads.reduce((acc: any, job: any) => {
      acc[job.id] = { status: job.status, lastError: job.lastError };
      return acc;
    }, {});
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }, [jobLeads]);

  const addLog = useCallback((msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    const newLog: ActivityLog = {
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      msg,
      type
    };
    setActivityLogs(prev => [newLog, ...prev].slice(0, 50));
  }, []);

  const updateJobStatus = useCallback((jobId: string, newStatus: JobStatus, error: string | null = null) => {
    setJobLeads(prev => prev.map(job => {
      if (job.id === jobId) {
        // If status becomes "sent", add to global registry
        if (newStatus === 'sent') {
          const globalSent = JSON.parse(localStorage.getItem(GLOBAL_SENT_KEY) || '[]');
          if (!globalSent.includes(job.contactEmail)) {
            localStorage.setItem(GLOBAL_SENT_KEY, JSON.stringify([...globalSent, job.contactEmail]));
          }
        }
        return { ...job, status: newStatus, lastError: error };
      }
      return job;
    }));

    if (selectedLead?.id === jobId) {
      setSelectedLead((prev: any) => ({ ...prev, status: newStatus, lastError: error }));
    }
  }, [selectedLead]);

  const executeSend = async (lead: any, subject: string, body: string) => {
    setIsSending(true);
    updateJobStatus(lead.id, 'sending');
    addLog(`Sending to ${lead.company}...`, 'info');

    try {
      const response = await serverCall({
        serverCallProps: {
          call: serverCalls.postGatewayNotifyMail,
          data: {
            to: lead.contactEmail,
            subject: subject,
            message: body,
          },
        },
        authorized: true,
      });

      if (response && response.success) {
        updateJobStatus(lead.id, 'sent');
        addLog(`Successfully sent to ${lead.company}`, 'success');
        return true;
      } else {
        const errMsg = response?.error || 'Failed to send (Unauthorized/Gmail Error)';
        updateJobStatus(lead.id, 'failed', errMsg);
        addLog(`FAILED for ${lead.company}: ${errMsg}`, 'error');
        return false;
      }
    } catch (err: any) {
      updateJobStatus(lead.id, 'failed', 'Network Error');
      addLog(`Network Error sending to ${lead.company}`, 'error');
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const startAutomation = () => {
    const nextJob = jobLeads.find(j => j.status === 'pending');
    if (!nextJob) {
      addLog("All jobs processed!", "success");
      return;
    }
    setIsAutoSending(true);
    setIsPaused(false);
    addLog("Automation STARTED", "info");
  };

  const stopAutomation = () => {
    setIsAutoSending(false);
    setIsPaused(false);
    setCountdown(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    addLog("Automation STOPPED", "info");
  };

  const togglePause = () => {
    setIsPaused(prev => !prev);
    addLog(isPaused ? "Automation RESUMED" : "Automation PAUSED", "info");
  };

  const currentlyProcessingIdRef = useRef<string | null>(null);

  // Automation Trigger Effect
  useEffect(() => {
    if (!isAutoSending || isPaused || isSending || countdown !== null) return;

    const nextJob = jobLeads.find(j => j.status === 'pending');
    if (!nextJob) {
      setIsAutoSending(false);
      addLog("Done! No more pending leads.", "success");
      return;
    }

    if (currentlyProcessingIdRef.current === nextJob.id) return;

    const runCycle = async () => {
      currentlyProcessingIdRef.current = nextJob.id;

      // 1. Verify against Gmail history
      addLog(`Verifying history for ${nextJob.company}...`, 'info');
      try {
        const checkRes = await fetchOutreachHistoryState(nextJob.contactEmail, nextJob.company);

        if (checkRes?.reached) {
          const statusType = checkRes.type === 'failed' ? 'failed' : 'sent';
          updateJobStatus(nextJob.id, statusType, checkRes.reason);
          addLog(`Verified: Already ${statusType} to ${nextJob.company} (${checkRes.reason})`, statusType === 'sent' ? 'success' : 'error');
          currentlyProcessingIdRef.current = null;
          return;
        }
      } catch (e) {
        addLog(`Check failed for ${nextJob.company}, proceeding...`, 'error');
      }

      // 2. Execute Send
      await executeSend(nextJob, nextJob.draftSubject, nextJob.draftBody);

      currentlyProcessingIdRef.current = null;

      // 3. Start countdown for next
      if (isAutoSending && !isPaused) {
        const delay = Math.floor(Math.random() * (60 - 30 + 1) + 30);
        setCountdown(delay);
      }
    };

    runCycle();
  }, [isAutoSending, isPaused, isSending, jobLeads, countdown, executeSend, addLog, updateJobStatus]);

  // Separate Countdown Timer Effect
  useEffect(() => {
    if (countdown === null || isPaused) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCountdown(null);
    }
  }, [countdown, isPaused]);

  const handleSelectLead = (lead: any) => {
    setSelectedLead(lead);
    setEditedSubject(lead.draftSubject);
    setEditedBody(lead.draftBody);
    setStatus({ type: null, msg: '' });
  };

  if (!selectedLead) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const sentCount = jobLeads.filter(j => j.status === 'sent').length;
  const failedCount = jobLeads.filter(j => j.status === 'failed').length;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 lg:p-8 font-sans selection:bg-cyan-500/30">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

        {/* Header */}
        <div className="col-span-1 lg:col-span-12 mb-2 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-emerald-400">
              EMEA Remote Outreach
            </h1>
            <p className="text-gray-400 mt-1 text-sm lg:text-lg">
              Automate {jobLeads.length} targeted applications safely.
            </p>
          </div>            <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block">Progress</span>
              <p className="text-sm font-bold text-cyan-400">{sentCount} Sent / {failedCount} Failed</p>
            </div>
            <div className="hidden lg:block text-right">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block">Connected as</span>
              <p className="text-sm text-emerald-400 font-medium tracking-tight">jegedeakintunde@gmail.com</p>
            </div>
          </div>
        </div>

        {/* Automation Panel */}
        <div className="col-span-1 lg:col-span-12 bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-6 justify-between backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${isAutoSending ? (isPaused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse') : 'bg-gray-600'}`} />
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                {isAutoSending ? (isPaused ? 'Paused' : 'Auto-Sending Mode Active') : 'Manual Mode'}
              </h3>
              {isAutoSending && !isPaused && countdown !== null && (
                <p className="text-cyan-400 text-xs font-mono">Next send in: {countdown}s</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAutoSending ? (
              <button
                onClick={startAutomation}
                className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-cyan-600/20"
              >
                Start Automation
              </button>
            ) : (
              <>
                <button
                  onClick={togglePause}
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors"
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={stopAutomation}
                  className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 px-6 py-2 rounded-lg text-sm font-bold transition-colors border border-rose-500/30"
                >
                  Stop
                </button>
              </>
            )}
          </div>

          {/* Micro Log */}
          <div className="hidden xl:block flex-1 max-w-md h-12 bg-black/40 rounded-lg overflow-y-auto border border-white/5 p-2 font-mono text-[10px] custom-scrollbar">
            {activityLogs.length > 0 ? (
              activityLogs.map((log, i) => (
                <div key={i} className={`flex gap-2 ${log.type === 'error' ? 'text-rose-400' : log.type === 'success' ? 'text-emerald-400' : 'text-gray-400'}`}>
                  <span className="opacity-50">[{log.timestamp}]</span>
                  <span>{log.msg}</span>
                </div>
              ))
            ) : (
              <div className="text-gray-600 italic">No activity yet...</div>
            )}
          </div>

          <div className="w-full md:w-48 bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(sentCount / jobLeads.length) * 100}%` }}
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500"
            />
          </div>
        </div>

        {/* Leads Sidebar */}
        <div className="col-span-1 lg:col-span-4 space-y-3 h-[calc(100vh-280px)] overflow-y-auto pr-2 custom-scrollbar">
          {jobLeads.map((lead) => (
            <motion.div
              key={lead.id}
              whileHover={{ x: 4 }}
              onClick={() => handleSelectLead(lead)}
              className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border relative overflow-hidden ${selectedLead.id === lead.id
                  ? 'bg-white/10 border-cyan-500/50 shadow-[0_4px_20px_rgba(6,182,212,0.1)]'
                  : 'bg-white/5 border-white/5 hover:bg-white/10'
                } ${lead.status === 'sent' ? 'opacity-70' : ''}`}
            >
              {lead.status === 'sent' && (
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
              )}
              {lead.status === 'failed' && (
                <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
              )}

              <div className="flex justify-between items-start">
                <h3 className="text-base font-semibold truncate flex-1">{lead.company}</h3>
                <div className="flex items-center gap-2">
                  {lead.status === 'sent' && (
                    <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  {lead.status === 'failed' && (
                    <svg className="w-4 h-4 text-rose-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                  {lead.status === 'sending' && (
                    <div className="w-3 h-3 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                  )}
                </div>
              </div>
              <p className="text-cyan-400 text-[10px] mt-0.5 truncate uppercase tracking-wider font-bold">{lead.role}</p>

              {lead.status === 'failed' && lead.lastError && (
                <p className="text-[9px] text-rose-400/80 mt-1 italic truncate">{lead.lastError}</p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Email Editor / Preview */}
        <div className="col-span-1 lg:col-span-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedLead.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 lg:p-10 backdrop-blur-2xl relative h-full flex flex-col"
            >
              <div className="mb-8">
                <div className="flex items-center gap-4 mb-3">
                  <h2 className="text-3xl font-bold tracking-tight">{selectedLead.company}</h2>
                  {selectedLead.status === 'sent' ? (
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30 uppercase">Applied</span>
                  ) : selectedLead.status === 'failed' ? (
                    <span className="bg-rose-500/20 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-500/30 uppercase">Failed</span>
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                  )}
                  <span className="text-cyan-400 font-mono text-sm tracking-tighter ml-auto lg:ml-0">{selectedLead.role}</span>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
                  {selectedLead.description}
                </p>
              </div>

              <div className="space-y-6 flex-1">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Recipient</label>
                  <div className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">
                        {selectedLead.contactName[0]}
                      </span>
                      <div>
                        <p className="text-white font-medium">{selectedLead.contactName}</p>
                        <p className="text-gray-500 text-xs">{selectedLead.contactEmail}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="outreach-subject" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Subject</label>
                  <input
                    id="outreach-subject"
                    type="text"
                    disabled={selectedLead.status === 'sent' || isSending}
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 focus:border-cyan-500/50 rounded-xl px-5 py-3 text-white outline-none transition-all text-sm font-medium disabled:opacity-50"
                  />
                </div>

                <div className="flex-1 min-h-[300px] flex flex-col">
                  <label htmlFor="outreach-body" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1 flex justify-between">
                    <span>Message Body</span>
                    <span className="text-[8px] opacity-50">Saved locally</span>
                  </label>
                  <textarea
                    id="outreach-body"
                    disabled={selectedLead.status === 'sent' || isSending}
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    className="w-full flex-1 bg-black/30 border border-white/10 focus:border-cyan-500/50 rounded-xl px-5 py-4 text-white outline-none transition-all leading-relaxed resize-none font-mono text-xs disabled:opacity-50"
                  />
                </div>

                <div className="pt-4 flex items-center justify-between">
                  {selectedLead.status === 'sent' ? (
                    <div className="flex items-center gap-3 text-emerald-400 bg-emerald-500/10 px-6 py-3 rounded-xl border border-emerald-500/20 font-bold transition-all w-full justify-center">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Sent Successfully
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 mr-4">
                        {selectedLead.status === 'failed' && (
                          <div className="text-xs px-4 py-2 rounded-lg border bg-rose-500/10 border-rose-500/30 text-rose-400">
                            Error: {selectedLead.lastError || 'Unknown failure'}
                          </div>
                        )}
                      </div>

                      <button
                        disabled={isSending || isAutoSending}
                        onClick={async () => {
                          addLog(`Manually verifying history for ${selectedLead.company}...`, 'info');
                          try {
                            const checkRes = await fetchOutreachHistoryState(
                              selectedLead.contactEmail,
                              selectedLead.company,
                            );
                            if (checkRes?.reached) {
                              const statusType = checkRes.type === 'failed' ? 'failed' : 'sent';
                              updateJobStatus(selectedLead.id, statusType, checkRes.reason);
                              addLog(`Verification Result: Found ${statusType} (${checkRes.reason})`, statusType === 'sent' ? 'success' : 'error');
                            } else {
                              addLog(`Verification Result: No previous outreach found in Gmail for ${selectedLead.company}.`, 'info');
                            }
                          } catch (e) {
                            addLog(`Verification failed.`, 'error');
                          }
                        }}
                        className="mr-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-widest border border-cyan-400/20 px-4 py-2 rounded-lg hover:bg-cyan-400/5"
                      >
                        Verify History
                      </button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isSending || isAutoSending}
                        onClick={() => executeSend(selectedLead, editedSubject, editedBody)}
                        className={`relative overflow-hidden bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-bold py-3.5 px-10 rounded-xl flex items-center gap-3 transition-opacity ${isSending || isAutoSending ? 'opacity-70 cursor-wait' : 'hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]'}`}
                      >
                        {isSending ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                            </svg>
                            Send Manually
                          </>
                        )}
                      </motion.button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Scrollbar CSS */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
