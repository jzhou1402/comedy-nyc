"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import ShowCard from "./ShowCard";

interface Show {
  id: number;
  date: string;
  time: string;
  venue_room: string;
  reservation_url: string;
  comedians: { id: number; name: string; credits: string; headshot_url: string }[];
}

export default function LineupView() {
  const { data: session } = useSession();
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [shows, setShows] = useState<Show[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/shows/dates")
      .then((r) => r.json())
      .then((d: string[]) => {
        setDates(d);
        if (d.length > 0 && !selectedDate) setSelectedDate(d[0]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    fetch(`/api/shows?date=${selectedDate}`)
      .then((r) => r.json())
      .then((s: Show[]) => setShows(s))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedDate]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((favs: any[]) => {
        if (Array.isArray(favs)) {
          setFavoriteIds(new Set(favs.map((f) => f.id)));
        }
      })
      .catch(() => {});
  }, [session]);

  const toggleFavorite = useCallback(
    async (comedianId: number, _name: string) => {
      const isFav = favoriteIds.has(comedianId);
      if (isFav) {
        await fetch("/api/favorites", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comedian_id: comedianId }),
        });
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(comedianId);
          return next;
        });
      } else {
        const reason = prompt(`Why do you like this comedian? (optional)`);
        await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comedian_id: comedianId, reason: reason || null }),
        });
        setFavoriteIds((prev) => new Set(prev).add(comedianId));
      }
    },
    [favoriteIds]
  );

  const formatDate = (d: string) => {
    const date = new Date(d + "T12:00:00");
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  if (dates.length === 0 && !loading) {
    return (
      <div className="text-center py-16 text-muted">
        <p className="text-lg">No shows loaded yet.</p>
        <p className="text-sm mt-2">Run the scraper to populate lineup data.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {dates.map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDate(d)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              d === selectedDate
                ? "bg-accent text-white"
                : "bg-card-bg border border-card-border text-muted hover:text-foreground"
            }`}
          >
            {formatDate(d)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted">Loading...</div>
      ) : shows.length === 0 ? (
        <div className="text-center py-12 text-muted">No shows for this date.</div>
      ) : (
        <div className="space-y-3">
          {shows.map((show) => (
            <ShowCard
              key={show.id}
              show={show}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
