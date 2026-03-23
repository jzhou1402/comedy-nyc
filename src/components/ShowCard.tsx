"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

interface Comedian {
  id: number;
  name: string;
  credits: string;
  headshot_url: string;
}

interface Show {
  id: number;
  date: string;
  time: string;
  venue_room: string;
  reservation_url: string;
  comedians: Comedian[];
}

export default function ShowCard({
  show,
  favoriteIds,
  onToggleFavorite,
}: {
  show: Show;
  favoriteIds: Set<number>;
  onToggleFavorite: (comedianId: number, name: string) => void;
}) {
  const { data: session } = useSession();
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-lg border border-card-border bg-card-bg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <div>
          <span className="font-semibold text-accent">{show.time}</span>
          <span className="mx-2 text-muted">-</span>
          <span className="text-sm text-muted">{show.venue_room}</span>
        </div>
        <span className="text-xs text-muted">{expanded ? "hide" : "show"}</span>
      </button>

      {expanded && (
        <div className="border-t border-card-border px-4 py-2">
          {show.comedians.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-2">
              {c.headshot_url ? (
                <img
                  src={
                    c.headshot_url.startsWith("http")
                      ? c.headshot_url
                      : `https://www.comedycellar.com${c.headshot_url}`
                  }
                  alt={c.name}
                  className="h-10 w-10 rounded-full object-cover bg-zinc-800"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-muted">
                  {c.name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{c.name}</p>
                {c.credits && (
                  <p className="text-xs text-muted truncate">{c.credits}</p>
                )}
              </div>
              {session && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(c.id, c.name);
                  }}
                  className={`text-lg transition-colors ${
                    favoriteIds.has(c.id) ? "text-accent" : "text-zinc-600 hover:text-accent"
                  }`}
                  title={favoriteIds.has(c.id) ? "Remove favorite" : "Add favorite"}
                >
                  {favoriteIds.has(c.id) ? "\u2665" : "\u2661"}
                </button>
              )}
            </div>
          ))}
          {show.reservation_url && (
            <a
              href={
                show.reservation_url.startsWith("http")
                  ? show.reservation_url
                  : `https://www.comedycellar.com${show.reservation_url}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 mb-1 inline-block rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors"
            >
              Make a Reservation
            </a>
          )}
        </div>
      )}
    </div>
  );
}
