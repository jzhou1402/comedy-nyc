"use client";

import { useEffect, useRef } from "react";

interface FollowModalProps {
  comedianName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function FollowModal({ comedianName, onConfirm, onClose }: FollowModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-full max-w-sm rounded-xl border border-border bg-card p-0 text-foreground backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      onClose={onClose}
    >
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/10">
            <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold">Follow {comedianName}</h2>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          We'll email you when <span className="text-foreground font-medium">{comedianName}</span> is in town performing at the Comedy Cellar.
        </p>
      </div>

      <div className="flex gap-3 justify-end border-t border-border px-6 py-4">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors duration-200 cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-semibold bg-primary text-on-primary rounded-lg hover:bg-secondary hover:text-on-secondary transition-colors duration-200 cursor-pointer"
        >
          Confirm
        </button>
      </div>
    </dialog>
  );
}
