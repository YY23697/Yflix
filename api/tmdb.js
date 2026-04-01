module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "TMDB_API_KEY is not set" });
    return;
  }

  const { path, ...restQuery } = req.query;
  if (!path || typeof path !== "string" || !path.startsWith("/3/")) {
    res.status(400).json({ error: "Invalid path" });
    return;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(restQuery)) {
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, String(v)));
    } else if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }
  params.set("api_key", apiKey);

  const url = `https://api.themoviedb.org${path}?${params.toString()}`;

  try {
    const response = await fetch(url);
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : { raw: await response.text() };
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: "TMDB proxy request failed" });
  }
};
