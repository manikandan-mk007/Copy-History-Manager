// utils/sync.js

// Push a single item to the cloud
export async function syncHistoryItemToCloud(item, settings) {
  const response = await fetch(`${settings.backendUrl}/api/history/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.authToken}`
    },
    body: JSON.stringify(item)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to sync history item");
  }

  return await response.json();
}

// Push all local items to the cloud
export async function syncAllHistoryToCloud(history, settings) {
  const response = await fetch(`${settings.backendUrl}/api/history/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.authToken}`
    },
    body: JSON.stringify({ items: history })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to sync all history");
  }

  return await response.json();
}

// Pull all cloud items for this account
export async function fetchCloudHistory(settings) {
  const response = await fetch(`${settings.backendUrl}/api/history`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.authToken}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to fetch cloud history");
  }

  const data = await response.json();

  // Backend may return { items: [...] } or just [...]
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}
