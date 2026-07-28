import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_BASE_URL = "https://myaniwatch-ashen.vercel.app";

async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem("auth_token");
  } catch {
    return null;
  }
}

async function request(endpoint: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-app-client": "myaniwatch-mobile",
    "User-Agent": "MyAniWatch-Mobile/1.0.0 (Android; iOS)",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    await AsyncStorage.removeItem("auth_token");
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || "API request failed");
  }

  return data;
}

// ── Auth Services ──
export async function apiLogin(username: string, password: string) {
  const data = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  if (data.token) {
    await AsyncStorage.setItem("auth_token", data.token);
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
  }
  return data;
}

export async function apiSignup(username: string, email: string, password: string, passwordConfirm: string) {
  const data = await request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ username, email, password, passwordConfirm }),
  });
  if (data.token) {
    await AsyncStorage.setItem("auth_token", data.token);
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
  }
  return data;
}

export async function apiGetMe() {
  return request("/api/auth/me");
}

export async function apiUpdateAvatar(userId: string, avatarUrl: string) {
  return request("/api/user/avatar", {
    method: "POST",
    body: JSON.stringify({ userId, avatarUrl }),
  });
}

export async function apiTogglePrivacy(userId: string) {
  return request("/api/profile/privacy", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

// ── Anime & Search Services ──
export async function apiGetTrending() {
  return request("/api/anime/trending");
}

export async function apiGetPopular() {
  return request("/api/anime/search?sort=POPULARITY_DESC");
}

export async function apiSearchAnime(query: string, page: number = 1, genre?: string) {
  let url = `/api/anime/search?page=${page}`;
  if (query) url += `&query=${encodeURIComponent(query)}`;
  if (genre) url += `&genre=${encodeURIComponent(genre)}`;
  return request(url);
}

export async function apiGetAnimeDetails(id: string) {
  return request(`/api/anime/${id}`);
}

export async function apiGetEpisodes(animeId: string) {
  return request(`/api/v2/hianime/anime/${animeId}/episodes`).catch(() => ({ episodes: [] }));
}

// ── Multi-Provider Stream Sources (Anikai, Anizone, AniBD, 2Dhive, Senshi, Miruro, HiAnime) ──
export async function apiGetAllStreamSources(anilistId: string | number, episodeNumber: number, title?: string, malId?: number) {
  const sources: Array<{ name: string; url: string; type: "hls" | "iframe"; priority: number }> = [];
  const ep = episodeNumber || 1;
  const animeTitle = title ? title.replace(/-/g, " ").trim() : "";

  // 1. Fetch Anizone HLS
  try {
    const anizoneRes = await request(`/api/anizone/stream?title=${encodeURIComponent(animeTitle)}&anilistId=${anilistId || ""}&episode=${ep}`);
    if (anizoneRes?.url) {
      sources.push({ name: "Anizone (HLS)", url: anizoneRes.url, type: "hls", priority: 9700 });
    }
  } catch {}

  // 2. Fetch Anikai Sources
  try {
    const anikaiRes = await request(`/api/anikai/sources?title=${encodeURIComponent(animeTitle)}&ep=${ep}`);
    if (anikaiRes?.sources) {
      const allSub = [...(anikaiRes.sources.hsub || []), ...(anikaiRes.sources.sub || [])];
      allSub.forEach((s: any, idx: number) => {
        if (s.url) {
          sources.push({ name: `${s.name || "Anikai"} (Sub)`, url: s.url, type: "iframe", priority: 9000 - idx });
        }
      });
    }
  } catch {}

  // 3. Fetch AniBD HLS
  try {
    const anibdRes = await request(`/api/anibd/stream?anilistId=${anilistId}&episode=${ep}`);
    if (anibdRes?.url) {
      const ref = encodeURIComponent(anibdRes.referer || "https://playeng.animeapps.top/");
      sources.push({
        name: "AniBD (HardSub)",
        url: `${API_BASE_URL}/api/miruro-hls?ref=${ref}&url=${encodeURIComponent(anibdRes.url)}`,
        type: "hls",
        priority: 9500,
      });
    }
  } catch {}

  // 4. Fetch 2Dhive
  if (malId) {
    try {
      sources.push({
        name: "2Dhive (Sub)",
        url: `${API_BASE_URL}/api/hdhive/stream?malId=${malId}&episode=${ep}&lang=sub`,
        type: "hls",
        priority: 8600,
      });
    } catch {}
  }

  // 5. Fetch Senshi HLS
  if (malId) {
    try {
      sources.push({
        name: "Senshi (HLS)",
        url: `${API_BASE_URL}/api/senshi/stream?malId=${malId}&episode=${ep}`,
        type: "hls",
        priority: 8800,
      });
    } catch {}
  }

  // 6. Fetch MegaPlay Fallback
  if (anilistId) {
    sources.push({
      name: "MegaPlay Server",
      url: `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/sub`,
      type: "iframe",
      priority: 1800,
    });
  }

  // Sort by highest priority
  sources.sort((a, b) => b.priority - a.priority);
  return sources;
}

// ── Watched & History Services ──
export async function apiGetRecentlyWatched(userId: string, limit: number = 20, page: number = 1) {
  return request(`/api/watched?userId=${encodeURIComponent(userId)}&limit=${limit}&page=${page}`);
}

export async function apiSaveWatchedProgress(data: {
  userId: string;
  animeId: string;
  animeTitle: string;
  thumbnail: string;
  episodeId: string;
  episodeNumber: number;
  current: number;
  duration: number;
}) {
  return request("/api/watched", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function apiDeleteWatchedItem(id: string, userId: string) {
  return request("/api/watched/delete", {
    method: "POST",
    body: JSON.stringify({ id, userId }),
  });
}

// ── Watchlist Services ──
export async function apiGetWatchlist(userId: string) {
  return request(`/api/bookmarks?userId=${encodeURIComponent(userId)}`);
}

export async function apiToggleWatchlist(animeId: string, animeTitle: string, thumbnail: string, status: string = "watching") {
  return request("/api/bookmarks", {
    method: "POST",
    body: JSON.stringify({ animeId, animeTitle, thumbnail, status }),
  });
}

// ── Community Services ──
export async function apiGetPosts(category?: string) {
  const url = category ? `/api/community/posts?category=${encodeURIComponent(category)}` : "/api/community/posts";
  return request(url);
}

export async function apiCreatePost(data: { title: string; content: string; category: string; authorName: string; authorAvatar?: string }) {
  return request("/api/community/posts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function apiLikePost(postId: string, username: string) {
  return request("/api/community/posts", {
    method: "PATCH",
    body: JSON.stringify({ action: "like", postId, username }),
  });
}

// ── Watch2Gether Services ──
export async function apiGetW2GRooms() {
  return request("/api/watch2gether");
}

export async function apiCreateW2GRoom(data: { hostId: string; hostName: string; hostAvatar?: string; name: string; animeId: string; animeTitle: string; poster?: string; isPrivate?: boolean }) {
  return request("/api/watch2gether", {
    method: "POST",
    body: JSON.stringify({ action: "create", ...data }),
  });
}

export async function apiGetW2GRoomDetails(roomId: string) {
  return request(`/api/watch2gether?id=${encodeURIComponent(roomId)}`);
}

export async function apiSendW2GChat(roomId: string, sender: string, text: string) {
  return request("/api/watch2gether", {
    method: "POST",
    body: JSON.stringify({ action: "chat", roomId, sender, text }),
  });
}

// ── Leaderboard Services ──
export async function apiGetLeaderboard() {
  return request("/api/leaderboard");
}
