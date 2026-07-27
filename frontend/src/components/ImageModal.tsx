import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ImageModalProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ src, alt = '이미지', onClose }) => {
  useEffect(() => {
    const rootEl = document.getElementById('root');
    if (rootEl) rootEl.setAttribute('inert', '');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (rootEl) rootEl.removeAttribute('inert');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors z-10 cursor-pointer"
        title="닫기 (ESC)"
      >
        <X className="w-5 h-5" />
      </button>

      {/* 이미지 컨테이너 */}
      <div
        className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl border border-white/10"
          draggable={false}
        />
      </div>

      {/* 하단 힌트 */}
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs select-none">
        클릭하거나 ESC를 눌러 닫기
      </p>
    </div>,
    document.body
  );
};
