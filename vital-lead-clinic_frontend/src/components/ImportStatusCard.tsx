import React, { useEffect, useState } from "react";
import { getImportStatus, ImportStatus } from "@/services/importService";

type State = {
  loading: boolean;
  error: string | null;
  data: ImportStatus | null;
};

const ImportStatusCard: React.FC = () => {
  const [state, setState] = useState<State>({ loading: true, error: null, data: null });

  const load = async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await getImportStatus();
      setState({ loading: false, error: null, data });
    } catch (error: any) {
      setState({ loading: false, error: error?.message || "Failed to load", data: null });
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const { data, loading, error } = state;

  return (
    <div className="bg-white shadow-sm rounded-lg p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-gray-700">Imports</div>
        <button
          onClick={load}
          className="text-xs text-blue-600 hover:text-blue-700"
          disabled={loading}
        >
          Refresh
        </button>
      </div>
      {loading && <div className="text-sm text-gray-500">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {data && (
        <div className="space-y-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">Contracts</div>
            <div className="text-sm text-gray-800">
              Leads: <span className="font-semibold">{data.contracts.leads}</span> · Errors:{" "}
              <span className="font-semibold text-amber-600">{data.contracts.errors}</span>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">WhatsApp History</div>
            <div className="text-sm text-gray-800">
              Leads: <span className="font-semibold">{data.whatsappHistory.leads}</span> · Messages:{" "}
              <span className="font-semibold">{data.whatsappHistory.messages}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportStatusCard;
