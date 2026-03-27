import LineupView from "@/components/LineupView";

export default function Home() {
  return (
    <div>
      <section className="mb-8">
        <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-foreground">
          UPCOMING SHOWS
        </h1>
        <p className="mt-2 text-muted-foreground text-lg">
          Comedy Cellar &middot; The Stand &middot; NY Comedy Club &middot; New York City
        </p>
      </section>
      <LineupView />
    </div>
  );
}
