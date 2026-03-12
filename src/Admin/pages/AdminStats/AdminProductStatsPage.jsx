import React, { useEffect, useMemo, useState } from 'react';
import { getProductStatsTop } from '../../../common/api/adminApi';

const AdminProductStatsPage = () => {
  const [data, setData] = useState([]);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const maxSales = useMemo(() => Math.max(...data.map((d) => d.salesSum || 0), 1), [data]);
  const maxCount = useMemo(() => Math.max(...data.map((d) => d.orderCount || 0), 1), [data]);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getProductStatsTop(limit);
      setData(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
      setError('상품 통계를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [limit]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">상품 통계</h1>
          <p className="text-sm text-gray-500">/api/stats/products/top</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">TOP</label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
          >
            {[5, 10, 20, 50].map((n) => (
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

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">매출 순위</h2>
            <div className="space-y-3">
              {data.map((item, idx) => {
                const ratio = Math.round(((item.salesSum || 0) / maxSales) * 100);
                return (
                  <div key={item.productId} className="space-y-1">
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>#{idx + 1} 상품 {item.productId}</span>
                      <span>{(item.salesSum || 0).toLocaleString()}원</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded">
                      <div
                        className="h-2 rounded bg-gradient-to-r from-blue-500 to-indigo-600"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {data.length === 0 && <div className="text-sm text-gray-500">데이터가 없습니다.</div>}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">주문 수 순위</h2>
            <div className="space-y-3">
              {data.map((item, idx) => {
                const ratio = Math.round(((item.orderCount || 0) / maxCount) * 100);
                return (
                  <div key={item.productId} className="space-y-1">
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>#{idx + 1} 상품 {item.productId}</span>
                      <span>{item.orderCount?.toLocaleString()} 건</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded">
                      <div
                        className="h-2 rounded bg-gradient-to-r from-emerald-500 to-teal-600"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {data.length === 0 && <div className="text-sm text-gray-500">데이터가 없습니다.</div>}
            </div>
          </div>
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">인기 상품 리스트</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left">순위</th>
                  <th className="px-3 py-2 text-left">상품 ID</th>
                  <th className="px-3 py-2 text-right">주문 수</th>
                  <th className="px-3 py-2 text-right">매출 합계</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, idx) => (
                  <tr key={item.productId} className="border-b last:border-0">
                    <td className="px-3 py-2 text-gray-800">#{idx + 1}</td>
                    <td className="px-3 py-2 text-gray-800">{item.productId}</td>
                    <td className="px-3 py-2 text-right text-gray-800">{(item.orderCount || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-gray-800">{(item.salesSum || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductStatsPage;

