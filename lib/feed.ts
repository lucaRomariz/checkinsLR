import { getSession } from "@/lib/session";
import type { Checkin } from "@/lib/types";

export async function getFeed(
  options: {
    before?: string;
    beforeId?: string;
    userId?: string;
    checkinId?: string;
  } = {},
) {
  const { supabase } = await getSession();
  const validCursor =
    options.before &&
    !isNaN(Date.parse(options.before)) &&
    /^[\da-f-]{36}$/i.test(options.beforeId ?? "");
  const { data, error } = await supabase.rpc("get_feed", {
    p_before: validCursor ? options.before : null,
    p_before_id: validCursor ? options.beforeId : null,
    p_user_id: options.userId ?? null,
    p_checkin_id: options.checkinId ?? null,
  });
  if (error) throw new Error("Não foi possível carregar os check-ins.");
  const all = (data ?? []) as Checkin[];
  const rows = all.slice(0, 20);
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/checkin-images/`;
  const images = rows.filter((c) => c.image_url?.startsWith(prefix));
  if (images.length) {
    const paths = images.map((c) => c.image_url!.slice(prefix.length));
    const { data: signed, error: signError } = await supabase.storage
      .from("checkin-images")
      .createSignedUrls(paths, 3600);
    if (signError) throw new Error("Não foi possível carregar as fotos.");
    const urls = new Map(signed?.map((s) => [s.path, s.signedUrl]));
    for (const c of images)
      c.image_url = urls.get(c.image_url!.slice(prefix.length)) ?? null;
  }
  return { rows, hasMore: all.length > 20 };
}
