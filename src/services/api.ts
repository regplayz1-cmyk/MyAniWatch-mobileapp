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
    "x-api-key": "maw_live_8f9e7d6c5b4a3f2e1d0c9b8a7f6e5d4c",
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

// ── Anime & Search Services ──
export async function apiGetTrending() {
  return request("/api/anime/trending");
}

export async function apiGetPopular() {
  return request("/api/anime/popular");
}

export async function apiSearchAnime(query: string, page: number = 1) {
  return request(`/api/anime/search?query=${encodeURIComponent(query)}&page=${page}`);
}

export async function apiGetAnimeDetails(id: string) {
  return request(`/api/anime/${id}`);
}

export async function apiGetEpisodes(animeId: string) {
  return request(`/api/v2/hianime/anime/${animeId}/episodes`);
}

export async function apiGetStreamSources(animeId: string, episodeNumber: number, server?: string) {
  let url = `/api/v2/hianime/episode/sources?animeId=${encodeURIComponent(animeId)}&number=${episodeNumber}`;
  if (server) url += `&server=${server}`;
  return request(url);
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
  return request(`/api/watchlist?userId=${encodeURIComponent(userId)}`);
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
