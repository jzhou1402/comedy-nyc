"use client";

import { useSession, signIn } from "next-auth/react";
import { useState } from "react";
import InviteModal from "./InviteModal";

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
  venue?: string;
  reservation_url: string;
  comedians: Comedian[];
}

export default function ShowCard({
  show,
  favoriteIds,
  goingIds,
  onToggleFavorite,
  onToggleGoing,
}: {
  show: Show;
  favoriteIds: Set<number>;
  goingIds: Set<number>;
  onToggleFavorite: (comedianId: number, name: string) => void;
  onToggleGoing: (showId: number) => void;
}) {
  const { data: session } = useSession();
  const [expanded, setExpanded] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  const isGoing = goingIds.has(show.id);

  const formatDate = (d: string) => {
    const date = new Date(d + "T12:00:00");
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <article className="rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 hover:border-primary/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-2 px-3 sm:px-5 py-3 sm:py-4 text-left hover:bg-muted/50 transition-colors duration-150 cursor-pointer"
        aria-expanded={expanded}
        aria-label={`${show.time} show at ${show.venue_room}, ${show.comedians.length} performers`}
      >
        <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap min-w-0">
          <span className="font-display text-lg sm:text-2xl tracking-wide text-primary shrink-0">
            {show.time.toUpperCase()}
          </span>
          <span className="text-muted-foreground hidden sm:inline">&middot;</span>
          <span className="text-xs sm:text-sm text-muted-foreground truncate">{show.venue_room}</span>
          {show.venue && show.venue !== "Comedy Cellar" && (
            <span className="text-[10px] sm:text-xs font-medium text-secondary bg-secondary/10 px-1.5 sm:px-2 py-0.5 rounded-full shrink-0">{show.venue}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {isGoing && (
            <span className="text-[10px] sm:text-xs font-medium text-green-500 bg-green-500/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
              Going
            </span>
          )}
          <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
            {show.comedians.length} acts
          </span>
          <svg
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border">
          <ul className="divide-y divide-border/50" role="list">
            {show.comedians.map((c) => (
              <li key={c.id} className="flex items-center gap-2.5 sm:gap-4 px-3 sm:px-5 py-2 sm:py-3 hover:bg-muted/30 transition-colors duration-150">
                {c.headshot_url ? (
                  <img
                    src={
                      c.headshot_url.startsWith("http")
                        ? c.headshot_url
                        : `https://www.comedycellar.com${c.headshot_url}`
                    }
                    alt=""
                    className="h-9 w-9 sm:h-11 sm:w-11 rounded-full object-cover bg-muted shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-muted flex items-center justify-center text-xs sm:text-sm font-semibold text-muted-foreground shrink-0"
                    aria-hidden="true"
                  >
                    {c.name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs sm:text-sm text-card-foreground">{c.name}</p>
                  {c.credits && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {c.credits}
                    </p>
                  )}
                </div>
                {session && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(c.id, c.name);
                    }}
                    className={`p-2 rounded-lg transition-all duration-200 cursor-pointer ${
                      favoriteIds.has(c.id)
                        ? "text-accent bg-accent/10 hover:bg-accent/20"
                        : "text-muted-foreground hover:text-accent hover:bg-accent/10"
                    }`}
                    aria-label={
                      favoriteIds.has(c.id)
                        ? `Remove ${c.name} from favorites`
                        : `Add ${c.name} to favorites`
                    }
                    aria-pressed={favoriteIds.has(c.id)}
                  >
                    <svg
                      className="w-5 h-5"
                      fill={favoriteIds.has(c.id) ? "currentColor" : "none"}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 flex-wrap px-3 sm:px-5 py-3 border-t border-border/50">
            {show.reservation_url && (
              <a
                href={
                  show.reservation_url.startsWith("http")
                    ? show.reservation_url
                    : `https://www.comedycellar.com${show.reservation_url}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-on-primary hover:bg-secondary hover:text-on-secondary transition-colors duration-200"
              >
                Reserve
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            <button
              onClick={() => {
                if (!session) { signIn("google"); return; }
                onToggleGoing(show.id);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer ${
                isGoing
                  ? "border-green-500 text-green-500 bg-green-500/10 hover:bg-green-500/20"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                {isGoing ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                )}
              </svg>
              {isGoing ? "Going" : "I'm Going"}
            </button>
            {isGoing && (
              <button
                onClick={() => setShowInvite(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Invite
              </button>
            )}
          </div>
        </div>
      )}

      {showInvite && (
        <InviteModal
          showId={show.id}
          showLabel={`${formatDate(show.date)} at ${show.time} - ${show.venue_room}`}
          onClose={() => setShowInvite(false)}
        />
      )}
    </article>
  );
}
