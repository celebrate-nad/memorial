import { getMediaItems } from "@/lib/media";
import { getSlideshowSettings } from "@/lib/slideshow-settings";
import AdminSettings from "./AdminSettings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SettingsPage() {
  const [settings, media] = await Promise.all([
    getSlideshowSettings(),
    getMediaItems(),
  ]);

  const photos = media.filter((m) => m.kind === "photo");
  return <AdminSettings initialSettings={settings} photos={photos} />;
}
