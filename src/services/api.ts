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
    "Referer": "https://myaniwatch-ashen.vercel.app/",
    "Origin": "https://myaniwatch-ashen.vercel.app",
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

// ── Home Page ──
export async function apiGetHomePage() {
  return request("/api/home");
}

// ── Anime & Search Services ──
export async function apiGetTrending() {
  return request("/api/anime/trending");
}

export async function apiGetPopular() {
  return request("/api/anime/search?sort=POPULARITY_DESC");
}

export async function apiSearchAnime(query: string, page: number = 1, genre?: string, sort?: string) {
  let url = `/api/anime/search?page=${page}`;
  if (query) url += `&query=${encodeURIComponent(query)}`;
  if (genre) url += `&genre=${encodeURIComponent(genre)}`;
  if (sort) url += `&sort=${encodeURIComponent(sort)}`;
  return request(url);
}

export async function apiGetAnimeDetails(id: string) {
  return request(`/api/anime/${id}`);
}

export async function apiGetEpisodes(animeId: string) {
  return request(`/api/anime/${animeId}/episodes`);
}

// ── Comments Services ──
export async function apiGetComments(animeId: string, episode: number) {
  return request(`/api/comments?animeId=${encodeURIComponent(animeId)}&episode=${episode}`);
}

export async function apiPostComment(data: { animeId: string; episode: number; content: string; authorName: string; authorAvatar?: string; isSpoiler?: boolean; parentCommentId?: string }) {
  return request("/api/comments", { method: "POST", body: JSON.stringify(data) });
}

// ── Watch Stats ──
export async function apiGetWatchStats(userId: string) {
  return request(`/api/stats/watchtime?userId=${encodeURIComponent(userId)}`);
}

// ── Profile ──
export async function apiGetProfile(userId: string) {
  return request(`/api/profile/${encodeURIComponent(userId)}`);
}

// ── Delete Post ──
export async function apiDeletePost(postId: string, authorName: string, authorRole?: string) {
  return request(`/api/community/posts?id=${postId}&authorName=${encodeURIComponent(authorName)}&authorRole=${authorRole || ""}`, { method: "DELETE" });
}

export async function apiExtractHls(url: string) {
  return request("/api/extract-hls", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

// ── Multi-Provider Stream Sources (Anikai, Anizone, Miruro, MegaPlay) ──
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

  // 2. Fetch Anikai & Extract HLS
  try {
    const anikaiRes = await request(`/api/anikai/sources?title=${encodeURIComponent(animeTitle)}&ep=${ep}`);
    if (anikaiRes?.sources) {
      const allSub = [...(anikaiRes.sources.hsub || []), ...(anikaiRes.sources.sub || [])];
      const extractedPromises = allSub.slice(0, 4).map(async (s: any, idx: number) => {
        if (!s.url) return null;
        try {
          if (s.url.includes(".m3u8") || s.url.includes("master.m3u8") || s.url.includes("/api/")) {
            return { name: `${s.name || "HD-Server"} (HLS)`, url: s.url, type: "hls" as const, priority: 9600 - idx };
          }
          const extData = await apiExtractHls(s.url);
          if (extData?.hls) {
            return { name: `${s.name || "HD-Server"} (HLS)`, url: extData.hls, type: "hls" as const, priority: 9600 - idx };
          }
        } catch {}
        return { name: `${s.name || "HD-Server"} (Server)`, url: s.url, type: "iframe" as const, priority: 7000 - idx };
      });

      const extractedResults = (await Promise.all(extractedPromises)).filter(Boolean);
      sources.push(...(extractedResults as any[]));
    }
  } catch {}

  // 3. Fetch MegaPlay Fallback
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

export async function apiToggleWatchlist(animeId: string, animeTitle: string, thumbnail: string, status: string = "watching", userId?: string) {
  return request("/api/bookmarks", {
    method: "POST",
    body: JSON.stringify({ userId: userId || "default", animeId, animeTitle, thumbnail, status }),
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
