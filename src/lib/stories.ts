import coverBunny from "@/assets/cover-bunny.jpg";
import coverDragon from "@/assets/cover-dragon.jpg";
import coverCat from "@/assets/cover-cat.jpg";
import scene1 from "@/assets/scene-1.jpg";
import scene2 from "@/assets/scene-2.jpg";
import scene3 from "@/assets/scene-3.jpg";
import scene4 from "@/assets/scene-4.jpg";

export type Lang = "ko" | "en" | "jp";

export interface StoryPage {
  seq: number;
  photo: string;
  audio: Partial<Record<Lang, string>>;
  subtitle: Record<Lang, string>;
}

export interface Story {
  id: string;
  title: string;
  summary: string;
  cover: string;
  createdAt: string;
  pages: StoryPage[];
}

export interface StoryGenerateInput {
  title?: string;
  heroName?: string;
  prompt: string;
  apiKey?: string;
}

interface BoardResponse {
  id: number;
  title: string;
  contents?: string | null;
  summary: string;
  coverPath?: string | null;
  coverUrl?: string | null;
  photoPath?: string | null;
  photoUrl?: string | null;
  imagePath?: string | null;
  imageUrl?: string | null;
  status: number;
  createdDate: string;
}

interface ContentResponse {
  id: number;
  bookId: number;
  seq: number;
  photoPath?: string | null;
  photoUrl?: string | null;
  imagePath?: string | null;
  imageUrl?: string | null;
  audioPath?: string | null;
  audioUrl?: string | null;
  voicePath?: string | null;
  voiceUrl?: string | null;
  audioKoPath?: string | null;
  audioKoUrl?: string | null;
  audioEnPath?: string | null;
  audioEnUrl?: string | null;
  audioJpPath?: string | null;
  audioJpUrl?: string | null;
  audioPathKo?: string | null;
  audioPathEn?: string | null;
  audioPathJp?: string | null;
  subtitleKo?: string | null;
  subtitleEn?: string | null;
  subtitleJp?: string | null;
  textKo?: string | null;
  textEn?: string | null;
  textJp?: string | null;
}

interface BoardContentsCreateResponse {
  board: BoardResponse;
  contents: ContentResponse[];
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:8080";

const COVERS = [coverBunny, coverDragon, coverCat];
const SCENES = [scene1, scene2, scene3, scene4];

const SEED_STORIES: Story[] = [
  {
    id: "seed-1",
    title: "작은 토끼 기사 코코",
    summary: "마법 숲을 모험하며 새 친구를 만나는 작은 토끼 기사의 이야기",
    cover: coverBunny,
    createdAt: "2025-05-20T09:00:00Z",
    pages: [
      {
        seq: 1,
        photo: scene1,
        audio: {},
        subtitle: {
          ko: "옛날 옛적, 작은 토끼 기사 코코가 마법 숲 입구에 서 있었어요.",
          en: "Once upon a time, a tiny bunny knight named Coco stood at the edge of a magical forest.",
          jp: "むかしむかし、小さなうさぎの騎士ココが魔法の森の入口に立っていました。",
        },
      },
      {
        seq: 2,
        photo: scene2,
        audio: {},
        subtitle: {
          ko: "코코는 반짝이는 반딧불 친구를 만나 함께 길을 찾았어요.",
          en: "Coco met a sparkling firefly friend, and they found the path together.",
          jp: "ココはきらきら光るホタルの友だちに会い、一緒に道を探しました。",
        },
      },
    ],
  },
];

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function resolveAssetPath(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  const trimmed = path.trim();
  if (!trimmed) return undefined;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  const normalized = trimmed.replaceAll("\\", "/");
  if (normalized.startsWith("/")) return `${API_BASE_URL}${normalized}`;
  return `${API_BASE_URL}/${normalized}`;
}

function resolveImage(content: ContentResponse, seq = 1): string {
  return (
    resolveAssetPath(content.photoUrl) ??
    resolveAssetPath(content.photoPath) ??
    resolveAssetPath(content.imageUrl) ??
    resolveAssetPath(content.imagePath) ??
    SCENES[(seq - 1) % SCENES.length]
  );
}

function resolveAudio(content: ContentResponse): Partial<Record<Lang, string>> {
  const common =
    resolveAssetPath(content.audioUrl) ??
    resolveAssetPath(content.audioPath) ??
    resolveAssetPath(content.voiceUrl) ??
    resolveAssetPath(content.voicePath);

  return {
    ko:
      resolveAssetPath(content.audioKoUrl) ??
      resolveAssetPath(content.audioKoPath) ??
      resolveAssetPath(content.audioPathKo) ??
      common,
    en:
      resolveAssetPath(content.audioEnUrl) ??
      resolveAssetPath(content.audioEnPath) ??
      resolveAssetPath(content.audioPathEn),
    jp:
      resolveAssetPath(content.audioJpUrl) ??
      resolveAssetPath(content.audioJpPath) ??
      resolveAssetPath(content.audioPathJp),
  };
}

function mapBoardToStory(board: BoardResponse, contents: ContentResponse[] = []): Story {
  const ordered = [...contents].sort((a, b) => a.seq - b.seq);
  const pages = ordered.map((content) => ({
    seq: content.seq,
    photo: resolveImage(content, content.seq),
    audio: resolveAudio(content),
    subtitle: {
      ko: content.subtitleKo ?? content.textKo ?? "",
      en: content.subtitleEn ?? content.textEn ?? "",
      jp: content.subtitleJp ?? content.textJp ?? "",
    },
  }));

  return {
    id: String(board.id),
    title: board.title,
    summary: board.summary,
    cover:
      pages[0]?.photo ??
      resolveAssetPath(board.coverUrl) ??
      resolveAssetPath(board.coverPath) ??
      resolveAssetPath(board.photoUrl) ??
      resolveAssetPath(board.photoPath) ??
      resolveAssetPath(board.imageUrl) ??
      resolveAssetPath(board.imagePath) ??
      COVERS[board.id % COVERS.length],
    createdAt: board.createdDate,
    pages,
  };
}

export async function listStories(): Promise<Story[]> {
  try {
    const boards = await fetchJson<BoardResponse[]>("/api/boards");
    return Promise.all(
      boards.map(async (board) => {
        try {
          const contents = await fetchJson<ContentResponse[]>(`/api/boards/${board.id}/contents`);
          return mapBoardToStory(board, contents);
        } catch (error) {
          console.warn(`Failed to load contents for story ${board.id}.`, error);
          return mapBoardToStory(board);
        }
      }),
    );
  } catch (error) {
    console.warn("Failed to load stories from backend. Showing seed stories.", error);
    return SEED_STORIES;
  }
}

export async function getStory(id: string): Promise<Story | undefined> {
  if (id.startsWith("seed-")) {
    return SEED_STORIES.find((story) => story.id === id);
  }

  const [board, contents] = await Promise.all([
    fetchJson<BoardResponse>(`/api/boards/${id}`),
    fetchJson<ContentResponse[]>(`/api/boards/${id}/contents`),
  ]);

  return mapBoardToStory(board, contents);
}

export async function createStoryFromPrompt(input: StoryGenerateInput): Promise<Story> {
  const generated = await fetchJson<BoardContentsCreateResponse>("/api/stories/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return mapBoardToStory(generated.board, generated.contents);
}
