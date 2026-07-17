import { getMediaItems } from "@/lib/media";
import { getCurationConfig } from "@/lib/curation";
import AdminReorder from "./AdminReorder";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReorderPage() {
  const [allMedia, curation] = await Promise.all([
    getMediaItems(),
    getCurationConfig(),
  ]);

  // Only show curated items, in curated order
  const mediaMap = new Map(allMedia.map((m) => [m.pathname, m]));
  const curatedMedia = curation
    .map((pathname) => mediaMap.get(pathname))
    .filter((m): m is NonNullable<typeof m> => m != null);

  return <AdminReorder initialMedia={curatedMedia} />;
}
