import { getMediaItems } from "@/lib/media";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const media = await getMediaItems();

  return <AdminDashboard initialMedia={media} />;
}
