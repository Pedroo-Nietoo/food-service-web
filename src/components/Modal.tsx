import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  maxWidth = 'max-w-lg',
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px]">
      <div
        className={`w-full ${maxWidth} rounded-[14px] border border-[#e7e8e2] bg-white shadow-xl`}
      >
        <div className="flex items-start justify-between border-b border-[#e7e8e2] px-6 py-4">
          <div>
            <h2 className="text-[16px] font-semibold text-[#252824]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-[12px] text-[#73766e]">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#73766e] transition hover:bg-[#f7f8f4] hover:text-[#252824]"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
