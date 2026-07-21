import { getSlideshowSettings } from "@/lib/slideshow-settings";
import AdminSettings from "./AdminSettings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SettingsPage() {
  const settings = await getSlideshowSettings();
  return <AdminSettings initialSettings={settings} />;
}
