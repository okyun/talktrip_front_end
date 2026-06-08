import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getOrderPurchaseStatsRange } from '../../../common/api/adminApi';
import { getProductDetail } from '../../../common/api/productApi';
import { useCustomLogin } from '../../../common/hook/useCustomLogin';
import ExportLoadingOverlay, { yieldToPaint } from '../../components/ExportLoadingOverlay';
import {
  buildExportRows,
  exportOrderPurchaseStatsExcel,
  exportOrderPurchaseStatsPdf,
  formatRangeLabel,
  formatEventTime,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '../../utils/orderPurchaseStatsExport';

const WINDOW_SIZE_MS = 30 * 60 * 1000;
const LIMIT = 3;

const AdminOrderPurchaseStatsPage = () => {
  const { memberId } = useCustomLogin();
  const tableRef = useRef(null);

  const now = Date.now();
  const defaultEndMs = now;
  const defaultStartMs = now - WINDOW_SIZE_MS;

  const [startTimeMs, setStartTimeMs] = useState(defaultStartMs);
  const [endTimeMs, setEndTimeMs] = useState(defaultEndMs);
  const [startInput, setStartInput] = useState(toDatetimeLocalValue(defaultStartMs));
  const [endInput, setEndInput] = useState(toDatetimeLocalValue(defaultEndMs));

  const [data, setData] = useState([]);
  const [queryStartMs, setQueryStartMs] = useState(null);
  const [queryEndMs, setQueryEndMs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(null);
  const [error, setError] = useState('');
  const [productNameById, setProductNameById] = useState({});

  const load = useCallback(async () => {
    const start = fromDatetimeLocalValue(startInput);
    const end = fromDatetimeLocalValue(endInput);

    if (start == null || end == null) {
      setError('시작·종료 시간을 올바르게 입력해주세요.');
      return;
    }
    if (end <= start) {
      setError('종료 시간은 시작 시간보다 이후여야 합니다.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setStartTimeMs(start);
      setEndTimeMs(end);

      const res = await getOrderPurchaseStatsRange({
        startTimeMs: start,
        endTimeMs: end,
        limit: LIMIT,
      });

      setData(Array.isArray(res?.items) ? res.items : []);
      setQueryStartMs(Number(res?.startTimeMs ?? start));
      setQueryEndMs(Number(res?.endTimeMs ?? end));
    } catch (e) {
      console.error(e);
      setError('구매 통계를 불러오지 못했습니다.');
      setData([]);
      setQueryStartMs(null);
      setQueryEndMs(null);
    } finally {
      setLoading(false);
    }
  }, [startInput, endInput]);

  useEffect(() => {
    load();
  }, []);

  const sortedData = useMemo(() => {
    const items = Array.isArray(data) ? data : [];
    return [...items]
      .sort((a, b) => {
        const c = Number(b?.purchaseCount || 0) - Number(a?.purchaseCount || 0);
        if (c !== 0) return c;
        return Number(a?.productId || 0) - Number(b?.productId || 0);
      })
      .slice(0, LIMIT);
  }, [data]);

  useEffect(() => {
    const ids = Array.from(new Set(sortedData.map((x) => x?.productId).filter((v) => v != null)));
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

  const rangeLabel = useMemo(() => {
    const s = queryStartMs ?? startTimeMs;
    const e = queryEndMs ?? endTimeMs;
    return formatRangeLabel(s, e);
  }, [queryStartMs, queryEndMs, startTimeMs, endTimeMs]);

  const exportMeta = useMemo(() => ({
    startTimeMs: queryStartMs ?? startTimeMs,
    endTimeMs: queryEndMs ?? endTimeMs,
  }), [queryStartMs, queryEndMs, startTimeMs, endTimeMs]);

  const handleExcelDownload = async () => {
    if (sortedData.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    try {
      setExportLoading('excel');
      await yieldToPaint();
      const rows = buildExportRows(sortedData, productNameById);
      exportOrderPurchaseStatsExcel(rows, exportMeta);
    } catch (e) {
      console.error(e);
      alert('Excel 생성에 실패했습니다.');
    } finally {
      setExportLoading(null);
    }
  };

  const handlePdfDownload = async () => {
    if (sortedData.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    if (!tableRef.current) return;

    try {
      setExportLoading('pdf');
      await yieldToPaint();
      await exportOrderPurchaseStatsPdf(tableRef.current, exportMeta);
    } catch (e) {
      console.error(e);
      alert('PDF 생성에 실패했습니다.');
    } finally {
      setExportLoading(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">구매 통계 (Top3)</h1>
          <p className="text-sm text-gray-500">Redis ZINCRBY 합산 /api/trending/products/purchases/range</p>
          <p className="text-xs text-gray-500">조회 구간: {rangeLabel || '-'}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-600">시작</label>
            <input
              type="datetime-local"
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-600">종료</label>
            <input
              type="datetime-local"
              value={endInput}
              onChange={(e) => setEndInput(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
          </div>
          <span className="text-sm text-gray-600 pb-1">TOP {LIMIT}</span>
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
          >
            조회
          </button>
          <button
            onClick={handleExcelDownload}
            disabled={sortedData.length === 0 || loading || exportLoading}
            className="px-3 py-1 rounded bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-60"
          >
            Excel
          </button>
          <button
            onClick={handlePdfDownload}
            disabled={sortedData.length === 0 || loading || exportLoading}
            className="px-3 py-1 rounded bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-60"
          >
            PDF
          </button>
        </div>
      </div>

      {loading && <div className="text-gray-500">불러오는 중...</div>}
      {error && <div className="text-red-600 text-sm">{error}</div>}

      {!loading && !error && sortedData.length > 0 && (
        <div ref={tableRef} className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-1">구매 상위 상품</h2>
          <p className="text-xs text-gray-500 mb-3">조회 구간: {rangeLabel}</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left">순위</th>
                  <th className="px-3 py-2 text-left">상품 ID</th>
                  <th className="px-3 py-2 text-left">상품명</th>
                  <th className="px-3 py-2 text-right">구매 수</th>
                  <th className="px-3 py-2 text-left">구매시간</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((item, idx) => (
                  <tr
                    key={`${item.productId ?? 'unknown'}-${idx}`}
                    className="border-b last:border-0"
                  >
                    <td className="px-3 py-2 text-gray-800">#{idx + 1}</td>
                    <td className="px-3 py-2 text-gray-800">{item.productId}</td>
                    <td className="px-3 py-2 text-gray-800">
                      {productNameById[item.productId] ?? <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-800">
                      {Number(item.purchaseCount || 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-gray-700 text-xs">{formatEventTime(item.createdAt)}</td>
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

      {exportLoading && <ExportLoadingOverlay type={exportLoading} />}
    </div>
  );
};

export default AdminOrderPurchaseStatsPage;
