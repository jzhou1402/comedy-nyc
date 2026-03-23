import LineupView from "@/components/LineupView";

export default function Home() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Upcoming Shows</h1>
      <p className="text-sm text-muted mb-6">Comedy Cellar, New York City</p>
      <LineupView />
    </div>
  );
}
