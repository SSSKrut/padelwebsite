export const apiFetch = async (url: string, method = "GET", body?: any) => {
  let res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    // Try to refresh token
    const refreshRes = await fetch("/.netlify/functions/auth-refresh", {
      method: "POST",
    });
    if (refreshRes.ok) {
      // Retry the original request
      res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Request failed");
  }
  return res.json();
};
