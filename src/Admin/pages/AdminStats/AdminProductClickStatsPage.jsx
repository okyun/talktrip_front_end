import React, { useEffect, useMemo, useState } from 'react';
import { getProductClickStats } from '../../../common/api/adminApi';
import { getProductDetail } from '../../../common/api/productApi';
import { useCustomLogin } from '../../../common/hook/useCustomLogin';

const AdminProductClickStatsPage = () => {
  const { memberId } = useCustomLogin();
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

  const effectiveLimit = limit;
  const [productNameById, setProductNameById] = useState({});

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getProductClickStats(effectiveLimit, { onlyCurrentWindow: true, windowStartTime: selectedWindowStart });
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
  }, [selectedWindowStart]);

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

  const toTimeMs = (v) => {
    if (v == null) return 0;
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'string' && v.trim() !== '') return new Date(v).getTime() || 0;
    if (typeof v === 'number') return v;
    return 0;
  };

  // onlyCurrentWindow=true이면 사실상 단일 윈도우이지만, 혹시 응답이 섞이는 경우를 대비해 정렬(최신 windowStart 우선)한다.
  // 같은 (productId, windowStart) 키가 중복으로 내려오는 경우, clickCount를 합산해 1건으로 만든다.
  const mergedData = useMemo(() => {
    const rows = Array.isArray(data) ? data : [];
    const map = new Map();

    for (const item of rows) {
      const productId = item?.productId;
      const windowStartMs = toTimeMs(item?.windowStart);
      const key = `${productId ?? '(null)'}-${windowStartMs}`;

      const prev = map.get(key);
      const nextClickCount = Number(item?.clickCount ?? 0) || 0;

      if (!prev) {
        map.set(key, {
          ...item,
          productId,
          windowStart: windowStartMs ? new Date(windowStartMs).toISOString() : item?.windowStart,
          clickCount: nextClickCount,
        });
        continue;
      }

      map.set(key, {
        ...prev,
        clickCount: (Number(prev?.clickCount ?? 0) || 0) + nextClickCount,
      });
    }

    return Array.from(map.values());
  }, [data]);

  const sortedData = [...mergedData].sort((a, b) => toTimeMs(b?.windowStart) - toTimeMs(a?.windowStart));

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

  // TopN(기본 3)이라, 화면 렌더링에 필요한 상품명은 추가 호출로 보강한다.
  useEffect(() => {
    const ids = Array.from(new Set(sortedData.map((x) => x?.productId).filter((v) => v != null && String(v).trim() !== '')));
    if (ids.length === 0) return;

    const missing = ids.filter((id) => productNameById[id] == null);
    if (missing.length === 0) return;

    let cancelled = false;

    (async () => {
      const entries = await Promise.all(
        missing.map(async (id) => {
          try {
            const res = await getProductDetail(id, memberId);
            const name =
              res?.name ??
              res?.productName ??
              res?.title ??
              res?.product?.name ??
              null;
            return [id, name];
          } catch (e) {
            console.error('상품명 조회 실패:', id, e);
            return [id, null];
          }
        }),
      );

      if (cancelled) return;
      setProductNameById((prev) => {
        const next = { ...prev };
        for (const [id, name] of entries) next[id] = name;
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [sortedData, memberId]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">상품 클릭 통계 (Top3)</h1>
          <p className="text-sm text-gray-500">30분 윈도우 기준 /api/stats/products/clicks</p>
          <p className="text-xs text-gray-500">윈도우(현재·서버 계산): {currentWindowText}</p>
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

      {!loading && !error && data.length > 0 && (
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">클릭 상위 상품</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left">순위</th>
                  <th className="px-3 py-2 text-left">상품 ID</th>
                  <th className="px-3 py-2 text-left">상품명</th>
                  <th className="px-3 py-2 text-right">클릭 수</th>
                  <th className="px-3 py-2 text-left">윈도우</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((item, idx) => (
                  <tr key={`${item.productId}-${item.windowStart}`} className="border-b last:border-0">
                    <td className="px-3 py-2 text-gray-800">#{idx + 1}</td>
                    <td className="px-3 py-2 text-gray-800">{item.productId}</td>
                    <td className="px-3 py-2 text-gray-800">
                      {productNameById[item.productId] ?? <span className="text-gray-400">-</span>}
                    </td>
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

