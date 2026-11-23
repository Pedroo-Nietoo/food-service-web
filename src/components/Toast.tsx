import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useEffect } from 'react';

export interface ToastMessage {
  type: 'success' | 'error';
  text: string;
}

export function Toast({
  toast,
  onClose,
}: {
  toast: ToastMessage | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 max-w-[calc(100vw-2.5rem)]">
      <div
        role="alert"
        className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-[12px] border px-4 py-3 shadow-lg ${
          isSuccess
            ? 'border-[#b7dec2] bg-[#edf6ef] text-[#277254]'
            : 'border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]'
        }`}
      >
        {isSuccess ? (
          <CheckCircle2 className="size-5 shrink-0" />
        ) : (
          <AlertCircle className="size-5 shrink-0" />
        )}
        <p className="text-[13px] font-medium leading-snug">{toast.text}</p>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 shrink-0 rounded p-1 opacity-70 hover:opacity-100"
          aria-label="Fechar aviso"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
