import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, Link, useLocation, useParams, useSearchParams } from 'react-router-dom';

const dummyGroups = [
  { id: 'GR_CEBU_TRAVELERS', title: '필리핀 세부 여행자 모임', desc: '호핑투어/맛집/환전/교통 정보 공유' },
  { id: 'GR_DANANG_TRAVELERS', title: '베트남 다낭 여행자 모임', desc: '바나힐/미케비치/현지투어 일정 조율' },
  { id: 'GR_BANGKOK_TRAVELERS', title: '태국 방콕 여행자 모임', desc: '야시장/마사지/교통 팁/환율 정보' }
];

const OpenChatPage = () => {
  const location = useLocation();
  const { channelId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [groups, setGroups] = useState(dummyGroups);
  const [groupQuery, setGroupQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState(() => searchParams.get('g') || null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinTarget, setJoinTarget] = useState(null);

  const isAdminPath = useMemo(() => location.pathname.startsWith('/admin'), [location.pathname]);

  const normalized = (v) => String(v || '').toLowerCase();
  const filteredGroups = useMemo(() => {
    const q = normalized(groupQuery);
    if (!q) return groups;
    return groups.filter(g => normalized(g.title).includes(q) || normalized(g.desc).includes(q));
  }, [groups, groupQuery]);

  const getChannelLink = (id) => {
    const base = isAdminPath ? `/admin/openchat/${id}` : `/openchat/${id}`;
    return selectedGroupId ? `${base}?g=${encodeURIComponent(selectedGroupId)}` : base;
  };

  const renderGroupSelector = () => (
    <div className={`flex h-screen ${isAdminPath ? 'theme-purple' : 'theme-blue'}`}>
      <main className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">모임 선택</h2>
            <p className="text-sm text-gray-500 mt-1">예: 필리핀 세부 여행자 모임, 다낭 여행자 모임 등</p>
          </div>
          <div className="mb-3">
            <input
              value={groupQuery}
              onChange={(e) => setGroupQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-main"
              placeholder="모임명을 검색하세요 (예: 세부, 다낭, 방콕)"
            />
          </div>
          <ul className="bg-white border rounded-lg divide-y">
            {filteredGroups.map((g) => (
              <li key={g.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{g.title}</div>
                  <div className="text-sm text-gray-500 truncate mt-0.5">{g.desc}</div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <button
                    className="btn-main px-3 py-2 rounded-lg text-sm hover:opacity-90"
                    onClick={() => {
                      setJoinTarget(g);
                      setShowJoinModal(true);
                    }}
                  >
                    선택
                  </button>
                </div>
              </li>
            ))}
            {filteredGroups.length === 0 && (
              <li className="p-6 text-center text-sm text-gray-500">검색 결과가 없습니다.</li>
            )}
          </ul>
        </div>
      </main>

      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setShowJoinModal(false); setJoinTarget(null); }} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900">오픈채팅 선택 확인</h3>
              <p className="text-sm text-gray-500 mt-1">{joinTarget?.title} 오픈채팅방을 선택하시겠습니까?</p>
            </div>
            <div className="px-5 py-4 flex items-center justify-end gap-2">
              <button
                className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50"
                onClick={() => { setShowJoinModal(false); setJoinTarget(null); }}
              >
                취소
              </button>
              <button
                className="btn-main px-3 py-2 rounded-lg text-sm hover:opacity-90"
                onClick={() => {
                  if (joinTarget?.id) {
                    setSelectedGroupId(joinTarget.id);
                    const next = new URLSearchParams(searchParams);
                    next.set('g', joinTarget.id);
                    setSearchParams(next, { replace: false });
                  }
                  setShowJoinModal(false);
                  setJoinTarget(null);
                }}
              >
                오픈채팅방 선택하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderChannelPlaceholder = () => (
    <div className={`flex h-screen ${isAdminPath ? 'theme-purple' : 'theme-blue'}`}>
      <aside className="w-72 border-r bg-white flex flex-col">
        <div className="px-4 py-2 border-b bg-gray-50">
          <div className="font-bold text-gray-900">오픈채팅 채널</div>
          <div className="text-xs text-gray-500">선택된 모임: {selectedGroupId}</div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ul>
            <li className="px-4 py-3 text-sm text-gray-500">채널 목록을 준비 중입니다...</li>
          </ul>
        </div>
      </aside>
      <main className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <div className="text-2xl mb-2">👥</div>
          <div>오픈채팅 채널을 선택하세요.</div>
        </div>
      </main>
    </div>
  );

  return selectedGroupId ? renderChannelPlaceholder() : renderGroupSelector();
};

export default OpenChatPage;


