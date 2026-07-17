import { getMediaItems } from "@/lib/media";
import { getCurationConfig } from "@/lib/curation";
import AdminSelect from "./AdminSelect";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const [media, curation] = await Promise.all([
    getMediaItems(),
    getCurationConfig(),
  ]);

  return <AdminSelect initialMedia={media} initialCuration={curation} />;
}
