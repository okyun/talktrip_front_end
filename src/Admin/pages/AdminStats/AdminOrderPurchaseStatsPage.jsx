import React, { useEffect, useMemo, useState } from 'react';
import { getOrderPurchaseStatsTop3 } from '../../../common/api/adminApi';

const AdminOrderPurchaseStatsPage = () => {
  const [data, setData] = useState([]);
  const [windowStartMs, setWindowStartMs] = useState(null);
  const [windowEndMs, setWindowEndMs] = useState(null);
  const WINDOW_SIZE_MS = 30 * 60 * 1000;
  const currentAlignedWindowStart = useMemo(() => {
    const now = Date.now();
    return now - (now % WINDOW_SIZE_MS);
  }, []);
  const [selectedWindowStart, setSelectedWindowStart] = useState(currentAlignedWindowStart);
  const limit = 3;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getOrderPurchaseStatsTop3({ windowStartTime: selectedWindowStart, onlyCurrentWindow: false });
      setData(Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []));
      const ws = res?.windowStartMs != null ? Number(res.windowStartMs) : null;
      const we = res?.windowEndMs != null ? Number(res.windowEndMs) : null;
      setWindowStartMs(Number.isFinite(ws) ? ws : null);
      setWindowEndMs(Number.isFinite(we) ? we : null);
    } catch (e) {
      console.error(e);
      setError('구매 통계를 불러오지 못했습니다.');
      setData([]);
      setWindowStartMs(null);
      setWindowEndMs(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedWindowStart]);

  const sortedData = useMemo(() => {
    const items = Array.isArray(data) ? data : [];

    // If backend returns duplicates (same productId + same windowStart),
    // aggregate them by summing purchaseCount.
    const m = new Map();
    for (const it of items) {
      const productId = it?.productId;
      const windowStart = it?.windowStart;
      const key = `${productId ?? 'unknown'}-${windowStart ?? 'unknown'}`;
      const prev = m.get(key);
      const add = Number(it?.purchaseCount || 0);
      if (!prev) {
        m.set(key, {
          productId,
          windowStart,
          windowEnd: it?.windowEnd,
          purchaseCount: add,
        });
      } else {
        prev.purchaseCount = Number(prev.purchaseCount || 0) + add;
        // keep latest windowEnd if differs
        if (it?.windowEnd) prev.windowEnd = it.windowEnd;
      }
    }

    const aggregated = Array.from(m.values());
    // purchaseCount desc, tie-break: productId
    aggregated.sort((a, b) => {
      const c = Number(b?.purchaseCount || 0) - Number(a?.purchaseCount || 0);
      if (c !== 0) return c;
      return Number(a?.productId || 0) - Number(b?.productId || 0);
    });
    return aggregated.slice(0, limit);
  }, [data]);

  const windowOptions = useMemo(() => {
    const now = Date.now();
    const cur = now - (now % WINDOW_SIZE_MS);
    const opts = [];
    for (let i = 0; i < 24; i += 1) {
      const start = cur - (i * WINDOW_SIZE_MS);
      const end = start + WINDOW_SIZE_MS;
      opts.push({
        value: start,
        label: `${new Date(start).toLocaleString()} ~ ${new Date(end).toLocaleTimeString()}`,
      });
    }
    return opts;
  }, [WINDOW_SIZE_MS]);

  const windowText = useMemo(() => {
    if (windowStartMs != null && windowEndMs != null) {
      return `${new Date(windowStartMs).toLocaleTimeString()} ~ ${new Date(windowEndMs).toLocaleTimeString()}`;
    }
    const start = Number.isFinite(Number(selectedWindowStart)) ? Number(selectedWindowStart) : null;
    const end = start != null ? start + WINDOW_SIZE_MS : null;
    if (start != null && end != null) {
      return `${new Date(start).toLocaleTimeString()} ~ ${new Date(end).toLocaleTimeString()}`;
    }
    return '최근 30분 윈도우(현재)';
  }, [selectedWindowStart, WINDOW_SIZE_MS, windowStartMs, windowEndMs]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">구매 통계 (Top3)</h1>
          <p className="text-sm text-gray-500">30분 윈도우(프론트) /api/stats/orders/purchases</p>
          <p className="text-xs text-gray-500">윈도우(현재·서버 계산): {windowText}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">윈도우</label>
          <select
            value={selectedWindowStart}
            onChange={(e) => setSelectedWindowStart(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
          >
            {windowOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className="text-sm text-gray-600">TOP {limit}</span>
          <button
            onClick={load}
            className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            새로고침
          </button>
        </div>
      </div>

      {loading && <div className="text-gray-500">불러오는 중...</div>}
      {error && <div className="text-red-600 text-sm">{error}</div>}

      {!loading && !error && sortedData.length > 0 && (
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">구매 상위 상품</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left">순위</th>
                  <th className="px-3 py-2 text-left">상품 ID</th>
                  <th className="px-3 py-2 text-right">구매 수</th>
                  <th className="px-3 py-2 text-left">윈도우</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((item, idx) => (
                  <tr
                    key={`${item.productId ?? 'unknown'}-${item.windowStart ?? 'unknown'}`}
                    className="border-b last:border-0"
                  >
                    <td className="px-3 py-2 text-gray-800">#{idx + 1}</td>
                    <td className="px-3 py-2 text-gray-800">{item.productId}</td>
                    <td className="px-3 py-2 text-right text-gray-800">{Number(item.purchaseCount || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-gray-700 text-xs">
                      {item.windowStart ? new Date(item.windowStart).toLocaleTimeString() : '-'} ~ {item.windowEnd ? new Date(item.windowEnd).toLocaleTimeString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && sortedData.length === 0 && (
        <div className="text-sm text-gray-500">표시할 데이터가 없습니다.</div>
      )}
    </div>
  );
};

export default AdminOrderPurchaseStatsPage;

