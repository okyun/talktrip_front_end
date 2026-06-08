import { useEffect, useState } from 'react';

const AnimatedDots = () => (
  <span className="inline-flex ml-0.5" aria-hidden="true">
    {[0, 1, 2].map((index) => (
      <span
        key={index}
        className="animate-bounce text-blue-600 font-bold"
        style={{ animationDelay: `${index * 150}ms`, animationDuration: '1s' }}
      >
        .
      </span>
    ))}
  </span>
);

const WaitingOverlay = ({
  title = '처리 중',
  message = '기다려주세요',
  delayedMessage = '요청이 많아 처리에 시간이 걸리고 있어요. 잠시만 기다려주세요.',
  delayMs = 2000,
}) => {
  const [showDelayedMessage, setShowDelayedMessage] = useState(false);

  useEffect(() => {
    setShowDelayedMessage(false);
    const timer = setTimeout(() => setShowDelayedMessage(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, title, message]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl px-8 py-8 flex flex-col items-center gap-4 min-w-[260px] max-w-[320px] mx-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
          <div className="absolute inset-3 rounded-full bg-blue-50 animate-pulse" />
        </div>

        <div className="text-center space-y-2">
          <p className="text-base font-semibold text-gray-900">{title}</p>
          <p className="text-sm text-gray-600">
            {message}
            <AnimatedDots />
          </p>
          {showDelayedMessage && (
            <p className="text-xs text-gray-500 leading-relaxed">
              {delayedMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WaitingOverlay;
