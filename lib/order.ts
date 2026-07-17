import { put, list } from "@vercel/blob";

const ORDER_PATH = "config/order.json";

/**
 * Reads the ordering config from the Blob store.
 * Returns an array of pathnames in display order, or an empty array
 * if no config exists yet.
 */
export async function getOrderConfig(): Promise<string[]> {
  try {
    const result = await list({ prefix: ORDER_PATH, limit: 1 });
    const blob = result.blobs.find((b) => b.pathname === ORDER_PATH);
    if (!blob) return [];

    const response = await fetch(blob.url);
    if (!response.ok) return [];

    const data = await response.json();
    if (Array.isArray(data)) return data;
    return [];
  } catch {
    return [];
  }
}

/**
 * Saves the ordering config to the Blob store.
 * Overwrites any existing config.
 */
export async function saveOrderConfig(order: string[]): Promise<void> {
  await put(ORDER_PATH, JSON.stringify(order), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}
