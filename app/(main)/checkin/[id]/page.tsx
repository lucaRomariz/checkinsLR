import { notFound } from "next/navigation";
import FeedList from "@/components/FeedList";
export default function CheckinPage({ params }: { params: { id: string } }) {
  if (!/^[\da-f-]{36}$/i.test(params.id)) notFound();
  return (
    <div>
      <header className="page-header">
        <h1>Check-in</h1>
      </header>
      <FeedList checkinId={params.id} />
    </div>
  );
}
