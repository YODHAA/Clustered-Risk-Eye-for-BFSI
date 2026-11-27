import React from 'react';
import { ConfirmModalState, ToastItem } from '../types/risk';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  confirmModal: ConfirmModalState | null;
  onCloseConfirm: () => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  confirmModal,
  onCloseConfirm,
}) => {
  return (
    <>
      {/* Non-blocking Toast Stack */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => {
          const toneStyle =
            toast.tone === 'error'
              ? 'border-error/40 bg-surface-container-lowest text-on-surface'
              : toast.tone === 'warning'
              ? 'border-amber-400/60 bg-surface-container-lowest text-on-surface'
              : toast.tone === 'success'
              ? 'border-secondary/40 bg-surface-container-lowest text-on-surface'
              : 'border-primary/40 bg-surface-container-lowest text-on-surface';

          const iconName =
            toast.tone === 'error'
              ? 'gpp_maybe'
              : toast.tone === 'warning'
              ? 'warning'
              : toast.tone === 'success'
              ? 'verified'
              : 'info';

          const iconColor =
            toast.tone === 'error'
              ? 'text-error'
              : toast.tone === 'warning'
              ? 'text-amber-600'
              : toast.tone === 'success'
              ? 'text-secondary'
              : 'text-primary';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-xl border shadow-xl p-3 flex items-start gap-2.5 transition-all ${toneStyle}`}
            >
              <span className={`material-symbols-outlined text-[18px] mt-0.5 shrink-0 ${iconColor}`}>
                {iconName}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-label-lg font-semibold text-on-surface leading-tight">
                  {toast.title}
                </div>
                <p className="font-body-sm text-on-surface-variant mt-0.5 leading-snug">
                  {toast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface shrink-0"
                aria-label="Dismiss notification"
              >
                <span className="material-symbols-outlined text-[15px]">close</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Institutional Confirmation Modal */}
      {confirmModal?.open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-inverse-surface/45 backdrop-blur-sm p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-2xl max-w-md w-full p-5 flex flex-col gap-4"
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  confirmModal.tone === 'error'
                    ? 'bg-error-container text-error'
                    : 'bg-primary-fixed text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {confirmModal.tone === 'error' ? 'security' : 'verified_user'}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-headline-sm font-bold text-on-surface">
                  {confirmModal.title}
                </h3>
                <p className="font-body-md text-on-surface-variant mt-1 leading-relaxed">
                  {confirmModal.description}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={onCloseConfirm}
                className="h-8 px-3.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  onCloseConfirm();
                }}
                className={`h-8 px-4 rounded font-label-md font-semibold shadow-sm transition-opacity hover:opacity-90 whitespace-nowrap shrink-0 ${
                  confirmModal.tone === 'error'
                    ? 'bg-error text-on-error'
                    : 'bg-primary text-on-primary'
                }`}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
