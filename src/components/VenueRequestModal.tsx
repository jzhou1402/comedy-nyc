"use client";

import { useEffect, useRef, useState } from "react";

interface VenueRequestModalProps {
  onClose: () => void;
}

export default function VenueRequestModal({ onClose }: VenueRequestModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ message: string; normalized?: any } | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/venue-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: value.trim() }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ message: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-full max-w-md rounded-xl border border-border bg-card p-0 text-foreground backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      onClose={onClose}
    >
      {!result ? (
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Suggest a Venue</h2>
                <p className="text-xs text-muted-foreground">Not seeing your favorite comedy club?</p>
              </div>
            </div>

            <label htmlFor="venue-input" className="block text-sm text-muted-foreground mb-2">
              Enter the venue name, address, or anything you know about it
            </label>
            <input
              ref={inputRef}
              id="venue-input"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder='e.g. "Gotham Comedy Club" or "the one on 23rd st"'
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
              autoComplete="off"
            />
          </div>

          <div className="flex gap-3 justify-end border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors duration-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!value.trim() || submitting}
              className="px-4 py-2 text-sm font-semibold bg-primary text-on-primary rounded-lg hover:bg-secondary hover:text-on-secondary transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      ) : (
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/10">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold">Got it!</h2>
          </div>

          <p className="text-sm text-muted-foreground mb-3">{result.message}</p>

          {result.normalized && (
            <div className="rounded-lg bg-muted/50 border border-border p-3 text-sm space-y-1">
              {result.normalized.name && (
                <p><span className="text-muted-foreground">Venue:</span> <span className="text-foreground font-medium">{result.normalized.name}</span></p>
              )}
              {result.normalized.address && (
                <p><span className="text-muted-foreground">Address:</span> <span className="text-foreground">{result.normalized.address}</span></p>
              )}
              {result.normalized.website && (
                <p><span className="text-muted-foreground">Website:</span> <span className="text-foreground">{result.normalized.website}</span></p>
              )}
            </div>
          )}

          <div className="flex justify-end mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold bg-primary text-on-primary rounded-lg hover:bg-secondary hover:text-on-secondary transition-colors duration-200 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
