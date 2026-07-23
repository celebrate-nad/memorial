import { getMediaItems } from "@/lib/media";
import { getCurationConfig } from "@/lib/curation";
import { getResolutionMap } from "@/lib/resolution";
import AdminSelect from "./AdminSelect";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const [media, curation] = await Promise.all([
    getMediaItems(),
    getCurationConfig(),
  ]);

  // Get resolution data for photos only
  const photos = media.filter((m) => m.kind === "photo");
  const resolutionMap = await getResolutionMap(photos);

  return (
    <AdminSelect
      initialMedia={media}
      initialCuration={curation}
      resolutionMap={resolutionMap}
    />
  );
}
