import { ReactNode } from 'react';
import { IconClose } from '../icons';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-md bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-3 h-10">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="h-7 w-7 grid place-items-center text-slate-400 hover:bg-slate-100 rounded"
          >
            <IconClose className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-3">{children}</div>
      </div>
    </div>
  );
}
