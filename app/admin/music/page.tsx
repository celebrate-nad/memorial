import { getMusicItems } from "@/lib/media";
import AdminMusic from "./AdminMusic";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MusicPage() {
  const music = await getMusicItems();
  return <AdminMusic initialMusic={music} />;
}
