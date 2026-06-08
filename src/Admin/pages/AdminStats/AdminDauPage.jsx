import React, { useEffect, useMemo, useState } from 'react';
import { getAdminDauDaily, getAdminDauRange } from '../../../common/api/adminApi';
import { postMyDauVisitBitmap, postMyDauVisitSet } from '../../../common/api/dauApi';

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDaysStr = (yyyyMmDd, delta) => {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

const AdminDauPage = () => {
  const [pickDate, setPickDate] = useState(todayStr());
  const [dailyBitmap, setDailyBitmap] = useState(null);
  const [dailySet, setDailySet] = useState(null);
  const [rangeStart, setRangeStart] = useState(addDaysStr(todayStr(), -6));
  const [rangeEnd, setRangeEnd] = useState(todayStr());
  const [rangeRows, setRangeRows] = useState([]);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [loadingRange, setLoadingRange] = useState(false);
  const [error, setError] = useState('');

  const [visitLoading, setVisitLoading] = useState(false);
  const [visitResult, setVisitResult] = useState(null); // { endpoint, status, at, message? }

  const rangeSumBitmap = useMemo(
    () => rangeRows.reduce((acc, r) => acc + (Number(r.bitmapUniqueVisitors ?? r.uniqueVisitors) || 0), 0),
    [rangeRows],
  );
  const rangeSumSet = useMemo(
    () => rangeRows.reduce((acc, r) => acc + (Number(r.setUniqueVisitors) || 0), 0),
    [rangeRows],
  );

  const loadDaily = async () => {
    try {
      setLoadingDaily(true);
      setError('');
      const res = await getAdminDauDaily(pickDate || undefined);
      const b = res?.bitmapUniqueVisitors ?? res?.bitmap_unique_visitors;
      const s = res?.setUniqueVisitors ?? res?.set_unique_visitors;
      setDailyBitmap(b != null ? Number(b) : null);
      setDailySet(s != null ? Number(s) : null);
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.error || e?.message || '일별 DAU 조회에 실패했습니다.');
      setDailyBitmap(null);
      setDailySet(null);
    } finally {
      setLoadingDaily(false);
    }
  };

  const loadRange = async () => {
    try {
      setLoadingRange(true);
      setError('');
      const res = await getAdminDauRange(rangeStart, rangeEnd);
      const rows = Array.isArray(res) ? res : [];
      setRangeRows(rows);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.error || e?.message || '기간 DAU 조회에 실패했습니다.';
      setError(msg);
      setRangeRows([]);
    } finally {
      setLoadingRange(false);
    }
  };

  useEffect(() => {
    loadDaily();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">DAU (일별 활성 사용자)</h1>
      <p className="text-gray-600 mb-4">
        동일한 방문 이벤트를 <strong>비트맵</strong>(<code className="bg-gray-100 px-1 rounded text-xs">talktrip:dau:bitmap:YYYYMMDD</code>
        , BITCOUNT)과 <strong>Set</strong>(<code className="bg-gray-100 px-1 rounded text-xs">talktrip:dau:set:YYYYMMDD</code>
        , SCARD)에 각각 쌓아 비교합니다. Set은 회원 ID를 문자열 멤버로 저장합니다.
      </p>
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-8">
        Set 도입 이전·한쪽만 기록된 날은 두 수치가 다를 수 있습니다. 기록 시점을 맞춘 뒤 비교하세요.
      </p>

      {error ? (
        <div className="mb-6 rounded-lg bg-red-50 text-red-800 px-4 py-3 text-sm">{error}</div>
      ) : null}

      <section className="bg-white rounded-xl shadow border border-gray-100 p-6 mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">DauController 확인 (방문 기록 API)</h2>
        <p className="text-sm text-gray-600 mb-4">
          아래 버튼은 <code className="bg-gray-100 px-1 rounded text-xs">POST /api/me/dau/visit/bitmap</code> /
          <code className="bg-gray-100 px-1 rounded text-xs ml-1">POST /api/me/dau/visit/set</code> 를 직접 호출합니다.
          성공이면 204, 로그인 안 되어 있으면 401이 나옵니다.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={visitLoading}
            onClick={async () => {
              try {
                setVisitLoading(true);
                setError('');
                const res = await postMyDauVisitBitmap();
                setVisitResult({
                  endpoint: '/api/me/dau/visit/bitmap',
                  status: res?.status ?? null,
                  at: new Date().toISOString(),
                });
              } catch (e) {
                const status = e?.response?.status ?? null;
                const msg =
                  e?.response?.data?.error ||
                  e?.response?.data?.message ||
                  e?.message ||
                  '방문 기록(비트맵) 호출에 실패했습니다.';
                setVisitResult({
                  endpoint: '/api/me/dau/visit/bitmap',
                  status,
                  at: new Date().toISOString(),
                  message: msg,
                });
                setError(msg);
              } finally {
                setVisitLoading(false);
              }
            }}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {visitLoading ? '호출 중…' : 'visit/bitmap 호출'}
          </button>

          <button
            type="button"
            disabled={visitLoading}
            onClick={async () => {
              try {
                setVisitLoading(true);
                setError('');
                const res = await postMyDauVisitSet();
                setVisitResult({
                  endpoint: '/api/me/dau/visit/set',
                  status: res?.status ?? null,
                  at: new Date().toISOString(),
                });
              } catch (e) {
                const status = e?.response?.status ?? null;
                const msg =
                  e?.response?.data?.error ||
                  e?.response?.data?.message ||
                  e?.message ||
                  '방문 기록(Set) 호출에 실패했습니다.';
                setVisitResult({
                  endpoint: '/api/me/dau/visit/set',
                  status,
                  at: new Date().toISOString(),
                  message: msg,
                });
                setError(msg);
              } finally {
                setVisitLoading(false);
              }
            }}
            className="px-4 py-2 rounded-md bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50"
          >
            {visitLoading ? '호출 중…' : 'visit/set 호출'}
          </button>

          <button
            type="button"
            onClick={() => setVisitResult(null)}
            className="px-3 py-2 text-sm text-gray-600 underline"
          >
            결과 지우기
          </button>
        </div>

        {visitResult ? (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800">
            <div className="font-medium mb-1">마지막 호출 결과</div>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <div>
                <span className="text-gray-500">endpoint</span>:{' '}
                <code className="bg-white px-1 rounded">{visitResult.endpoint}</code>
              </div>
              <div>
                <span className="text-gray-500">status</span>: <span className="tabular-nums">{String(visitResult.status)}</span>
              </div>
              <div>
                <span className="text-gray-500">at</span>: <span className="tabular-nums">{visitResult.at}</span>
              </div>
            </div>
            {visitResult.message ? (
              <div className="mt-2 text-red-700">
                <span className="text-gray-500">message</span>: {visitResult.message}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="bg-white rounded-xl shadow border border-gray-100 p-6 mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">특정 일 조회</h2>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            날짜
            <input
              type="date"
              className="border border-gray-300 rounded-md px-3 py-2"
              value={pickDate}
              onChange={(e) => setPickDate(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={loadDaily}
            disabled={loadingDaily}
            className="px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loadingDaily ? '조회 중…' : '조회'}
          </button>
          <div className="flex flex-wrap gap-6 items-baseline">
            <div>
              <div className="text-xs text-gray-500 mb-1">비트맵</div>
              <div className="text-2xl font-bold text-blue-700 tabular-nums">
                {dailyBitmap === null ? '—' : `${dailyBitmap.toLocaleString()}명`}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Set</div>
              <div className="text-2xl font-bold text-indigo-700 tabular-nums">
                {dailySet === null ? '—' : `${dailySet.toLocaleString()}명`}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">기간별 (최대 120일)</h2>
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            시작
            <input
              type="date"
              className="border border-gray-300 rounded-md px-3 py-2"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            종료
            <input
              type="date"
              className="border border-gray-300 rounded-md px-3 py-2"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={loadRange}
            disabled={loadingRange}
            className="px-4 py-2 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loadingRange ? '불러오는 중…' : '기간 조회'}
          </button>
          <button
            type="button"
            onClick={() => {
              const end = todayStr();
              setRangeEnd(end);
              setRangeStart(addDaysStr(end, -6));
            }}
            className="px-3 py-2 text-sm text-gray-600 underline"
          >
            최근 7일로 설정
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          각 행은 그날의 고유 회원 수입니다. 합계 참고: 비트맵 {rangeSumBitmap.toLocaleString()} / Set {rangeSumSet.toLocaleString()}
          (여러 날짜의 사람 합이 아닙니다).
        </p>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">날짜</th>
                <th className="text-right px-4 py-3 font-semibold">비트맵 (BITCOUNT)</th>
                <th className="text-right px-4 py-3 font-semibold">Set (SCARD)</th>
              </tr>
            </thead>
            <tbody>
              {rangeRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    기간 조회 버튼을 눌러 데이터를 불러오세요.
                  </td>
                </tr>
              ) : (
                rangeRows.map((row) => {
                  const bm = Number(row.bitmapUniqueVisitors ?? row.uniqueVisitors) || 0;
                  const st = Number(row.setUniqueVisitors) || 0;
                  return (
                  <tr key={row.date} className="border-t border-gray-100 hover:bg-gray-50/80">
                    <td className="px-4 py-3">{row.date}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-blue-800">
                      {bm.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-indigo-800">
                      {st.toLocaleString()}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminDauPage;
