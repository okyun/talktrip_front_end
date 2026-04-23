import React, { useEffect, useState } from 'react';
import { getProductClickStats } from '../../../common/api/adminApi';

const AdminProductClickStatsPage = () => {
  const [data, setData] = useState([]);
  const [windowStartMs, setWindowStartMs] = useState(null);
  const [windowEndMs, setWindowEndMs] = useState(null);
  const limit = 3;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const effectiveLimit = limit;

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getProductClickStats(effectiveLimit, { onlyCurrentWindow: true });
      if (res && Array.isArray(res.items)) {
        setData(res.items);
        const ws = res.windowStartMs != null ? Number(res.windowStartMs) : null;
        const we = res.windowEndMs != null ? Number(res.windowEndMs) : null;
        setWindowStartMs(Number.isFinite(ws) ? ws : null);
        setWindowEndMs(Number.isFinite(we) ? we : null);
        return;
      }
      // 레거시(배열 직접) 호환
      setData(Array.isArray(res) ? res : []);
      setWindowStartMs(null);
      setWindowEndMs(null);
    } catch (e) {
      console.error(e);
      setError('클릭 통계를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toTimeMs = (v) => {
    if (v == null) return 0;
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'string' && v.trim() !== '') return new Date(v).getTime() || 0;
    if (typeof v === 'number') return v;
    return 0;
  };

  // onlyCurrentWindow=true이면 사실상 단일 윈도우이지만, 혹시 응답이 섞이는 경우를 대비해 정렬(최신 windowStart 우선)한다.
  const sortedData = (Array.isArray(data) ? [...data] : [])
    .sort((a, b) => toTimeMs(b?.windowStart) - toTimeMs(a?.windowStart));

  const latestItem = sortedData[0] ?? data[0];
  const currentWindowText = (() => {
    if (windowStartMs != null && windowEndMs != null) {
      return `${new Date(windowStartMs).toLocaleTimeString()} ~ ${new Date(windowEndMs).toLocaleTimeString()}`;
    }
    if (latestItem) {
      return `${new Date(latestItem.windowStart).toLocaleTimeString()} ~ ${new Date(latestItem.windowEnd).toLocaleTimeString()}`;
    }
    return '최근 3분 윈도우(현재)';
  })();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">상품 클릭 통계</h1>
          <p className="text-sm text-gray-500">3분 윈도우 기준 /api/stats/products/clicks</p>
          <p className="text-xs text-gray-500">윈도우(현재·서버 계산): {currentWindowText}</p>
        </div>
        <div className="flex items-center gap-2">
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

      {!loading && !error && data.length > 0 && (
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">클릭 상위 상품</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left">순위</th>
                  <th className="px-3 py-2 text-left">상품 ID</th>
                  <th className="px-3 py-2 text-right">클릭 수</th>
                  <th className="px-3 py-2 text-left">윈도우</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((item, idx) => (
                  <tr key={`${item.productId}-${item.windowStart}`} className="border-b last:border-0">
                    <td className="px-3 py-2 text-gray-800">#{idx + 1}</td>
                    <td className="px-3 py-2 text-gray-800">{item.productId}</td>
                    <td className="px-3 py-2 text-right text-gray-800">{(item.clickCount || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-gray-700 text-xs">
                      {new Date(item.windowStart).toLocaleTimeString()} ~ {new Date(item.windowEnd).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="text-sm text-gray-500">표시할 데이터가 없습니다.</div>
      )}
    </div>
  );
};

export default AdminProductClickStatsPage;

