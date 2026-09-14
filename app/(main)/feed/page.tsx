import Inspiration from "@/components/Inspiration";
import FeedList from "@/components/FeedList";
export default function FeedPage({
  searchParams,
}: {
  searchParams: { before?: string; beforeId?: string };
}) {
  return (
    <div>
      <header className="page-header">
        <p className="eyebrow">Compartilhe sua rotina</p>
        <h1>Feed</h1>
      </header>
      <Inspiration />
      <FeedList {...searchParams} />
    </div>
  );
}
