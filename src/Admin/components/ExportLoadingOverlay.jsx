import React from 'react';

const LABELS = {
  excel: 'Excel 파일 생성 중...',
  pdf: 'PDF 파일 생성 중...',
};


const ExportLoadingOverlay = ({ type = 'excel' }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]"
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <div className="bg-white rounded-xl shadow-2xl px-8 py-7 flex flex-col items-center gap-4 min-w-[220px]">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
      </div>
      <p className="text-sm font-medium text-gray-800">{LABELS[type] ?? '파일 생성 중...'}</p>
      <p className="text-xs text-gray-500">잠시만 기다려 주세요</p>
    </div>
  </div>
);

/** UI가 로딩 오버레이를 그릴 시간을 확보합니다. */
export const yieldToPaint = () =>
  new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

export default ExportLoadingOverlay;
