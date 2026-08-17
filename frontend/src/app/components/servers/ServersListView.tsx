"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Plus, Server, Terminal, Trash2 } from "lucide-react";
import useTokenHandler from "@/lib/hooks/useTokenHandler";
import { Button } from "@/app/components/ui/button";
import {
  confirmWhatsAppPhone,
  fetchServerAlerts,
  fetchServerCommands,
  fetchServers,
  linkWhatsAppPhone,
  pairServer,
  revokeServer,
  runServerCommand,
  type ServerAlertRecord,
  type ServerCommandRecord,
  type ServerRecord,
} from "./serversApi";

function statusColor(status: string) {
  switch (status) {
    case "online":
      return "text-emerald-600 bg-emerald-50";
    case "offline":
      return "text-amber-700 bg-amber-50";
    case "revoked":
      return "text-red-700 bg-red-50";
    default:
      return "text-slate-600 bg-slate-100";
  }
}

export default function ServersListView() {
  useTokenHandler();
  const [servers, setServers] = useState<ServerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [commands, setCommands] = useState<ServerCommandRecord[]>([]);
  const [alerts, setAlerts] = useState<ServerAlertRecord[]>([]);
  const [commandInput, setCommandInput] = useState("");
  const [commandOutput, setCommandOutput] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [pairResult, setPairResult] = useState<string | null>(null);
  const [waPhone, setWaPhone] = useState("");
  const [waCode, setWaCode] = useState("");
  const [waMessage, setWaMessage] = useState<string | null>(null);

  const loadServers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchServers();
      setServers(rows);
      if (!selectedId && rows[0]) {
        setSelectedId(rows[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load servers");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const loadDetails = useCallback(async (serverId: string) => {
    try {
      const [cmdRows, alertRows] = await Promise.all([
        fetchServerCommands(serverId),
        fetchServerAlerts(serverId),
      ]);
      setCommands(cmdRows);
      setAlerts(alertRows);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  useEffect(() => {
    if (selectedId) {
      loadDetails(selectedId);
    }
  }, [selectedId, loadDetails]);

  const handlePair = async () => {
    setPairing(true);
    setPairResult(null);
    try {
      const result = await pairServer(`server-${Date.now()}`);
      setPairResult(
        `Paired "${result.name}". Server ID: ${result.serverId}\nInstall: ${result.installCommand}`,
      );
      await loadServers();
    } catch (err) {
      setPairResult(err instanceof Error ? err.message : "Pair failed");
    } finally {
      setPairing(false);
    }
  };

  const handleRevoke = async (serverId: string) => {
    await revokeServer(serverId);
    if (selectedId === serverId) {
      setSelectedId(null);
    }
    await loadServers();
  };

  const handleRunCommand = async () => {
    if (!selectedId || !commandInput.trim()) return;
    setRunning(true);
    setCommandOutput("");
    try {
      const result = await runServerCommand(selectedId, commandInput.trim());
      setCommandOutput(JSON.stringify(result, null, 2));
      await loadDetails(selectedId);
    } catch (err) {
      setCommandOutput(err instanceof Error ? err.message : "Command failed");
    } finally {
      setRunning(false);
    }
  };

  const handleLinkWhatsApp = async () => {
    setWaMessage(null);
    try {
      const res = await linkWhatsAppPhone(waPhone.trim());
      setWaMessage(res.message);
    } catch (err) {
      setWaMessage(err instanceof Error ? err.message : "Link failed");
    }
  };

  const handleConfirmWhatsApp = async () => {
    setWaMessage(null);
    try {
      await confirmWhatsAppPhone(waPhone.trim(), waCode.trim());
      setWaMessage("WhatsApp verified — you can control servers from WhatsApp.");
    } catch (err) {
      setWaMessage(err instanceof Error ? err.message : "Confirm failed");
    }
  };

  const selected = servers.find((s) => s.id === selectedId);

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-500 hover:text-slate-800">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Servers</h1>
              <p className="text-sm text-slate-500">Pair agents, run commands, view alerts</p>
            </div>
          </div>
          <Button onClick={handlePair} disabled={pairing}>
            {pairing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Pair server
          </Button>
        </div>

        {pairResult && (
          <pre className="mb-4 rounded-lg border border-slate-200 bg-white p-3 text-xs whitespace-pre-wrap">
            {pairResult}
          </pre>
        )}

        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-medium text-slate-700">Link WhatsApp for remote control</h2>
          <div className="flex flex-wrap gap-2">
            <input
              className="rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Phone (e.g. 2348012345678)"
              value={waPhone}
              onChange={(e) => setWaPhone(e.target.value)}
            />
            <Button variant="outline" onClick={handleLinkWhatsApp}>Send code</Button>
            <input
              className="rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="6-digit code"
              value={waCode}
              onChange={(e) => setWaCode(e.target.value)}
            />
            <Button variant="outline" onClick={handleConfirmWhatsApp}>Verify</Button>
          </div>
          {waMessage && <p className="mt-2 text-sm text-slate-600">{waMessage}</p>}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading servers…
          </div>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : servers.length === 0 ? (
          <p className="text-slate-500">No paired servers yet. Click Pair server to start.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <div className="space-y-2">
              {servers.map((server) => (
                <button
                  key={server.id}
                  type="button"
                  onClick={() => setSelectedId(server.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    selectedId === server.id
                      ? "border-slate-800 bg-white shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-400"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 font-medium">
                        <Server className="h-4 w-4" />
                        {server.name}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{server.hostname ?? server.id}</p>
                    </div>
                    <span className={`rounded px-2 py-0.5 text-xs ${statusColor(server.status)}`}>
                      {server.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {selected && (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                  <div>
                    <h2 className="text-lg font-medium">{selected.name}</h2>
                    <p className="text-sm text-slate-500">
                      {selected.platform ?? "unknown platform"} · last heartbeat{" "}
                      {selected.lastHeartbeatAt ?? "never"}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleRevoke(selected.id)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Revoke
                  </Button>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <Terminal className="h-4 w-4" /> Run command
                  </div>
                  <textarea
                    className="mb-2 w-full rounded border border-slate-300 p-2 text-sm font-mono"
                    rows={3}
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    placeholder="uptime"
                  />
                  <Button onClick={handleRunCommand} disabled={running}>
                    {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Run
                  </Button>
                  {commandOutput && (
                    <pre className="mt-3 max-h-64 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
                      {commandOutput}
                    </pre>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-2 font-medium">Recent commands</h3>
                  <ul className="space-y-2 text-sm">
                    {commands.slice(0, 10).map((cmd) => (
                      <li key={cmd.id} className="rounded border border-slate-100 p-2">
                        <code className="text-xs">{cmd.command}</code>
                        <div className="text-xs text-slate-500">
                          {cmd.status} · exit {cmd.exitCode ?? "—"} · {cmd.createdAt}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-2 font-medium">Alerts</h3>
                  <ul className="space-y-2 text-sm">
                    {alerts.slice(0, 10).map((alert) => (
                      <li key={alert.id} className="rounded border border-slate-100 p-2">
                        <span className="font-medium">{alert.kind}</span>
                        <p className="text-xs text-slate-600">{alert.detail}</p>
                      </li>
                    ))}
                    {alerts.length === 0 && <p className="text-slate-500 text-sm">No alerts yet.</p>}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
