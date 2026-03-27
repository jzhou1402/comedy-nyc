"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import VenueRequestModal from "@/components/VenueRequestModal";

interface ShowComedian {
  id: number;
  name: string;
  headshot_url: string;
}

interface Show {
  id: number;
  date: string;
  time: string;
  venue_room: string;
  venue: string;
  reservation_url: string;
  comedians: ShowComedian[];
}

interface Location {
  id: number;
  name: string;
  venue: string;
  address: string;
  lat: number;
  lng: number;
}

const FILTERS = [
  { label: "1 day", days: 1 },
  { label: "2 days", days: 2 },
  { label: "3 days", days: 3 },
  { label: "4 days", days: 4 },
  { label: "5 days", days: 5 },
  { label: "6 days", days: 6 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
];

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [days, setDays] = useState(7);
  const [shows, setShows] = useState<Show[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [showVenueRequest, setShowVenueRequest] = useState(false);

  // Fetch locations once
  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((data) => setLocations(data))
      .catch(() => {});
  }, []);

  // Fetch shows
  useEffect(() => {
    setLoading(true);
    fetch(`/api/shows/map?days=${days}`)
      .then((r) => r.json())
      .then((data) => setShows(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      const map = L.map(mapRef.current!, {
        center: [40.733, -73.994],
        zoom: 14,
        zoomControl: false,
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when shows or locations change
  useEffect(() => {
    if (!mapInstanceRef.current || locations.length === 0) return;

    import("leaflet").then((L) => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      // Match shows to locations by venue_room
      const locShowMap = new Map<string, { location: Location; shows: Show[] }>();

      for (const loc of locations) {
        locShowMap.set(loc.name, { location: loc, shows: [] });
      }

      for (const show of shows) {
        const entry = locShowMap.get(show.venue_room);
        if (entry) {
          entry.shows.push(show);
        }
      }

      for (const [locName, { location, shows: locShows }] of locShowMap) {
        if (locShows.length === 0) continue;

        const count = locShows.length;
        const uniqueComedians = new Set(locShows.flatMap((s) => s.comedians.map((c) => c.name)));
        const size = Math.max(40, Math.min(64, 30 + count));

        const icon = L.divIcon({
          className: "",
          html: `<div style="
            background: #D97706;
            color: white;
            border: 2px solid #F59E0B;
            border-radius: 50%;
            width: ${size}px;
            height: ${size}px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 16px;
            font-family: 'Bebas Neue', sans-serif;
            letter-spacing: 1px;
            box-shadow: 0 0 20px rgba(217, 119, 6, 0.4);
            cursor: pointer;
          ">${count}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker([location.lat, location.lng], { icon }).addTo(mapInstanceRef.current!);

        marker.bindPopup(
          `<div style="font-family: 'Source Sans 3', sans-serif; min-width: 200px;">
            <div style="font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 1px; margin-bottom: 2px;">${locName.toUpperCase()}</div>
            <div style="color: #A1A1AA; font-size: 12px; margin-bottom: 2px;">${location.venue}</div>
            <div style="color: #A1A1AA; font-size: 13px; margin-bottom: 8px;">${location.address}</div>
            <div style="color: #D97706; font-weight: 600; font-size: 14px;">${count} shows &middot; ${uniqueComedians.size} comedians</div>
          </div>`,
          { className: "dark-popup" }
        );

        marker.on("click", () => setSelectedLocation(locName));
        markersRef.current.push(marker);
      }
    });
  }, [shows, locations]);

  const formatDate = (d: string) => {
    const date = new Date(d + "T12:00:00");
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const filteredShows = selectedLocation
    ? shows.filter((s) => s.venue_room === selectedLocation)
    : shows;

  // Group by date
  const byDate = new Map<string, Show[]>();
  for (const s of filteredShows) {
    if (!byDate.has(s.date)) byDate.set(s.date, []);
    byDate.get(s.date)!.push(s);
  }

  const selectedLoc = locations.find((l) => l.name === selectedLocation);

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem-1px)]" style={{ margin: "-2rem -1rem -2rem -1rem" }}>
      {/* Filter bar */}
      <div className="shrink-0 border-b border-border bg-background px-4 py-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-sm font-medium text-muted-foreground shrink-0">Shows in next:</span>
          {FILTERS.map((f) => (
            <button
              key={f.days}
              onClick={() => setDays(f.days)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
                days === f.days
                  ? "bg-primary text-on-primary"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="ml-auto shrink-0">
            <button
              onClick={() => setShowVenueRequest(true)}
              className="rounded-lg border border-dashed border-primary/40 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-all duration-200 cursor-pointer"
            >
              + Suggest a venue
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Map */}
        <div ref={mapRef} className="flex-1 min-h-0" />

        {/* Sidebar */}
        <div className="w-80 shrink-0 border-l border-border bg-background overflow-y-auto hidden md:block">
          <div className="p-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display text-xl tracking-wide">
                {selectedLocation ? selectedLocation.toUpperCase() : "ALL LOCATIONS"}
              </h2>
              {selectedLocation && (
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Show all
                </button>
              )}
            </div>
            {selectedLoc && (
              <p className="text-xs text-muted-foreground mb-3">{selectedLoc.address}</p>
            )}
            {!selectedLocation && (
              <p className="text-xs text-muted-foreground mb-3">{filteredShows.length} shows across {new Set(filteredShows.map((s) => s.venue_room)).size} locations</p>
            )}

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : filteredShows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shows in this range.</p>
            ) : (
              <div className="space-y-5">
                {Array.from(byDate).map(([date, dateShows]) => (
                  <div key={date}>
                    <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                      {formatDate(date)}
                    </h3>
                    <div className="space-y-2">
                      {dateShows.map((show) => (
                        <div
                          key={show.id}
                          className="rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-colors duration-200"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-display text-base tracking-wide text-primary">
                              {show.time}
                            </span>
                            <span className="text-xs text-muted-foreground">{show.venue_room}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {show.comedians.slice(0, 4).map((c, i) => (
                              <Link
                                key={c.id}
                                href={`/comedians/${c.id}`}
                                className="text-xs text-card-foreground hover:text-primary transition-colors duration-200"
                              >
                                {c.name}{i < Math.min(show.comedians.length, 4) - 1 ? "," : ""}
                              </Link>
                            ))}
                            {show.comedians.length > 4 && (
                              <span className="text-xs text-muted-foreground">
                                +{show.comedians.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showVenueRequest && (
        <VenueRequestModal onClose={() => setShowVenueRequest(false)} />
      )}
    </div>
  );
}
