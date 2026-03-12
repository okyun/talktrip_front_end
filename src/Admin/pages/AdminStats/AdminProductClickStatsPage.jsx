import React, { useEffect, useState } from 'react';
import { getProductClickStats } from '../../../common/api/adminApi';

const AdminProductClickStatsPage = () => {
  const [data, setData] = useState([]);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 최대 30개로 제한
  const effectiveLimit = Math.min(limit, 30);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getProductClickStats(effectiveLimit);
      setData(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
      setError('클릭 통계를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [limit]);

  const currentWindowText = data.length > 0
    ? `${new Date(data[0].windowStart).toLocaleTimeString()} ~ ${new Date(data[0].windowEnd).toLocaleTimeString()}`
    : '최근 15분 윈도우';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">상품 클릭 통계</h1>
          <p className="text-sm text-gray-500">15분 윈도우 기준 /api/stats/products/clicks</p>
          <p className="text-xs text-gray-500">윈도우: {currentWindowText}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">TOP</label>
          <select
            value={limit}
            onChange={(e) => {
              const newLimit = Number(e.target.value);
              setLimit(Math.min(newLimit, 30)); // 최대 30으로 제한
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            {[5, 10, 20, 30].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
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
                {data.map((item, idx) => (
                  <tr key={item.productId} className="border-b last:border-0">
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

