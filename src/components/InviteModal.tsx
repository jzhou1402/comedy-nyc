"use client";

import { useEffect, useRef, useState } from "react";

interface InviteModalProps {
  showId: number;
  showLabel: string;
  onClose: () => void;
}

export default function InviteModal({ showId, showLabel, onClose }: InviteModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    inputRef.current?.focus();
  }, []);

  const shareUrl = `https://nyccomedy.org`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || sending) return;
    setSending(true);
    try {
      await fetch("/api/user-shows/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_id: showId, friend_email: email.trim() }),
      });
      setSent(true);
    } catch {
    } finally {
      setSending(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-full max-w-md rounded-xl border border-border bg-card p-0 text-foreground backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      onClose={onClose}
    >
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Invite a Friend</h2>
            <p className="text-xs text-muted-foreground">{showLabel}</p>
          </div>
        </div>

        {/* Copy link */}
        <button
          onClick={copyLink}
          className="w-full flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-sm hover:border-primary/40 transition-colors duration-200 cursor-pointer mb-4"
        >
          <span className="text-muted-foreground truncate mr-2">{shareUrl}</span>
          <span className="shrink-0 text-xs font-medium text-primary">
            {copied ? "Copied!" : "Copy"}
          </span>
        </button>

        {/* Email invite */}
        {!sent ? (
          <form onSubmit={sendInvite}>
            <label htmlFor="invite-email" className="block text-sm text-muted-foreground mb-2">
              Or send an email invite
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="friend@example.com"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
              />
              <button
                type="submit"
                disabled={!email.trim() || sending}
                className="shrink-0 px-4 py-2 text-sm font-semibold bg-primary text-on-primary rounded-lg hover:bg-secondary hover:text-on-secondary transition-colors duration-200 cursor-pointer disabled:opacity-50"
              >
                {sending ? "..." : "Send"}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center gap-2 text-sm text-green-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Invite sent to {email}
          </div>
        )}
      </div>

      <div className="flex justify-end border-t border-border px-6 py-4">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors duration-200 cursor-pointer"
        >
          Done
        </button>
      </div>
    </dialog>
  );
}
