"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSessionCache } from "@/lib/useSessionCache";
import ShowCard from "./ShowCard";
import FollowModal from "./FollowModal";

interface Show {
  id: number;
  date: string;
  time: string;
  venue_room: string;
  venue?: string;
  reservation_url: string;
  comedians: { id: number; name: string; credits: string; headshot_url: string }[];
}

const fetchJson = (url: string) => fetch(url).then((r) => r.json());

export default function LineupView() {
  const { data: session } = useSession();
  const { data: dates, loading: datesLoading } = useSessionCache<string[]>(
    "dates",
    () => fetchJson("/api/shows/dates")
  );
  const [selectedDate, setSelectedDate] = useState<string>("");
  const { data: favoriteIds, update: updateFavorites } = useSessionCache<number[]>(
    "favorite_ids",
    () =>
      session
        ? fetchJson("/api/favorites").then((favs: any[]) =>
            Array.isArray(favs) ? favs.map((f) => f.id) : []
          )
        : Promise.resolve([])
  );

  // Set initial date once dates load
  useEffect(() => {
    if (dates && dates.length > 0 && !selectedDate) {
      setSelectedDate(dates[0]);
    }
  }, [dates, selectedDate]);

  // Shows are cached per date
  const { data: shows, loading: showsLoading } = useSessionCache<Show[]>(
    `shows_${selectedDate}`,
    () => (selectedDate ? fetchJson(`/api/shows?date=${selectedDate}`) : Promise.resolve([]))
  );

  const { data: goingShowIds, update: updateGoing } = useSessionCache<number[]>(
    "going_show_ids",
    () =>
      session
        ? fetchJson("/api/user-shows?tab=upcoming").then((shows: any[]) =>
            Array.isArray(shows) ? shows.map((s) => s.id) : []
          )
        : Promise.resolve([])
  );

  const favSet = new Set(favoriteIds ?? []);
  const goingSet = new Set(goingShowIds ?? []);
  const [followModal, setFollowModal] = useState<{ id: number; name: string } | null>(null);

  const toggleFavorite = useCallback(
    async (comedianId: number, name: string) => {
      const isFav = favSet.has(comedianId);
      if (isFav) {
        await fetch("/api/favorites", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comedian_id: comedianId }),
        });
        updateFavorites((prev) => (prev ?? []).filter((id) => id !== comedianId));
      } else {
        setFollowModal({ id: comedianId, name });
      }
    },
    [favSet, updateFavorites]
  );

  const toggleGoing = useCallback(
    async (showId: number) => {
      const isGoing = goingSet.has(showId);
      if (isGoing) {
        await fetch("/api/user-shows", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ show_id: showId }),
        });
        updateGoing((prev) => (prev ?? []).filter((id) => id !== showId));
      } else {
        await fetch("/api/user-shows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ show_id: showId }),
        });
        updateGoing((prev) => [...(prev ?? []), showId]);
      }
    },
    [goingSet, updateGoing]
  );

  const confirmFollow = useCallback(async () => {
    if (!followModal) return;
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comedian_id: followModal.id }),
    });
    updateFavorites((prev) => [...(prev ?? []), followModal.id]);
    setFollowModal(null);
  }, [followModal, updateFavorites]);

  const formatDate = (d: string) => {
    const date = new Date(d + "T12:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const loading = datesLoading || (selectedDate && showsLoading);

  if (!datesLoading && (!dates || dates.length === 0)) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-foreground">No shows loaded yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Run the scraper to populate lineup data.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        className="flex gap-2 overflow-x-auto pb-3 mb-6 -mx-4 px-4 sm:-mx-6 sm:px-6"
        role="tablist"
        aria-label="Select date"
      >
        {(dates ?? []).map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDate(d)}
            role="tab"
            aria-selected={d === selectedDate}
            className={`
              shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer
              ${d === selectedDate
                ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              }
            `}
          >
            {formatDate(d)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading shows">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card h-20 animate-pulse" />
          ))}
        </div>
      ) : !shows || shows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No shows scheduled for this date.
        </div>
      ) : (
        <div className="space-y-4">
          {shows.map((show) => (
            <ShowCard
              key={show.id}
              show={show}
              favoriteIds={favSet}
              goingIds={goingSet}
              onToggleFavorite={toggleFavorite}
              onToggleGoing={toggleGoing}
            />
          ))}
        </div>
      )}

      {followModal && (
        <FollowModal
          comedianName={followModal.name}
          onConfirm={confirmFollow}
          onClose={() => setFollowModal(null)}
        />
      )}
    </div>
  );
}
