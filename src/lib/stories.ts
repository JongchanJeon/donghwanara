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

const BUNNY_PAGES: StoryPage[] = [
  {
    seq: 1,
    photo: scene1,
    subtitle: {
      ko: "옛날 옛적에, 작은 토끼 기사 '코코'가 마법의 숲 입구에 서 있었어요.",
      en: "Once upon a time, a tiny bunny knight named Coco stood at the edge of a magical forest.",
      jp: "むかしむかし、小さなウサギの騎士「ココ」が魔法の森の入り口に立っていました。",
    },
  },
  {
    seq: 2,
    photo: scene2,
    subtitle: {
      ko: "숲 속에서 코코는 반짝이는 반딧불 친구를 만났답니다.",
      en: "Deep in the forest, Coco met a sparkling firefly friend.",
      jp: "森の奥で、ココはキラキラ光るホタルのお友だちに出会いました。",
    },
  },
  {
    seq: 3,
    photo: scene3,
    subtitle: {
      ko: "둘은 반짝이는 시냇물 위의 작은 다리를 함께 건넜어요.",
      en: "Together, they crossed a tiny bridge over a sparkling stream.",
      jp: "二人はキラキラ光る小川の上の小さな橋を一緒に渡りました。",
    },
  },
  {
    seq: 4,
    photo: scene4,
    subtitle: {
      ko: "마법 나무 아래에서 코코는 새 친구를 꼭 안아주었어요. 끝!",
      en: "Under the magic tree, Coco gave the new friend a warm hug. The end!",
      jp: "魔法の木の下で、ココは新しいお友だちをぎゅっと抱きしめました。おしまい！",
    },
  },
];

const DRAGON_PAGES: StoryPage[] = [
  {
    seq: 1,
    photo: scene2,
    subtitle: {
      ko: "작은 아기 용 '루루'는 사탕 산 위를 처음으로 날아올랐어요.",
      en: "Baby dragon Lulu flew over the candy mountains for the very first time.",
      jp: "赤ちゃんドラゴンの「ルル」は、初めてお菓子の山の上を飛びました。",
    },
  },
  {
    seq: 2,
    photo: scene3,
    subtitle: {
      ko: "무지개 구름 사이에서 별 친구를 만났답니다.",
      en: "Among the rainbow clouds, Lulu met a friendly star.",
      jp: "虹の雲の間で、星のお友だちに出会いました。",
    },
  },
  {
    seq: 3,
    photo: scene4,
    subtitle: {
      ko: "별 친구와 함께 가장 높은 산 꼭대기에 도착했어요. 정말 멋졌어요!",
      en: "With the star, Lulu reached the top of the highest mountain. It was magical!",
      jp: "星と一緒に、ルルはいちばん高い山のてっぺんにたどり着きました。すてきでした！",
    },
  },
];

const CAT_PAGES: StoryPage[] = [
  {
    seq: 1,
    photo: scene1,
    subtitle: {
      ko: "우주비행사 고양이 '미오'는 우주선을 타고 별을 향해 출발했어요.",
      en: "Astronaut cat Mio launched into the sky toward the stars.",
      jp: "宇宙飛行士のネコ「ミオ」は、星に向かって出発しました。",
    },
  },
  {
    seq: 2,
    photo: scene2,
    subtitle: {
      ko: "둥근 행성에서 작은 외계 친구를 만났답니다.",
      en: "On a round planet, Mio met a tiny alien friend.",
      jp: "まるい惑星で、小さな宇宙人のお友だちに出会いました。",
    },
  },
  {
    seq: 3,
    photo: scene4,
    subtitle: {
      ko: "둘은 별빛 아래에서 손을 잡고 집으로 돌아왔어요.",
      en: "Hand in hand under the starlight, they returned home together.",
      jp: "星明かりの下で手をつないで、二人は一緒におうちに帰りました。",
    },
  },
];

const SEED: Story[] = [
  {
    id: "seed-1",
    title: "용감한 토끼 기사 코코",
    summary: "마법의 숲을 모험하며 새 친구를 사귀는 작은 토끼 기사의 이야기.",
    cover: coverBunny,
    createdAt: "2025-05-20T09:00:00Z",
    pages: BUNNY_PAGES,
  },
  {
    id: "seed-2",
    title: "아기 용 루루의 첫 비행",
    summary: "사탕 산 위를 날며 무지개 친구를 만나는 따뜻한 모험 이야기.",
    cover: coverDragon,
    createdAt: "2025-05-18T11:30:00Z",
    pages: DRAGON_PAGES,
  },
  {
    id: "seed-3",
    title: "우주 고양이 미오의 별 여행",
    summary: "별과 행성을 여행하며 외계 친구를 만나는 우주 모험.",
    cover: coverCat,
    createdAt: "2025-05-15T14:10:00Z",
    pages: CAT_PAGES,
  },
];

const KEY = "storybook.stories.v1";
const COVERS = [coverBunny, coverDragon, coverCat];
const SCENES = [scene1, scene2, scene3, scene4];

function load(): Story[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as Story[];
  } catch {
    return SEED;
  }
}

function save(list: Story[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function listStories(): Story[] {
  return load().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getStory(id: string): Story | undefined {
  return load().find((s) => s.id === id);
}

export function createStoryFromPrompt(prompt: string, title?: string): Story {
  const id = "u-" + Math.random().toString(36).slice(2, 9);
  const finalTitle = title?.trim() || autoTitle(prompt);
  const pages: StoryPage[] = SCENES.slice(0, 4).map((photo, i) => ({
    seq: i + 1,
    photo,
    subtitle: generateSubtitle(prompt, i),
  }));
  const story: Story = {
    id,
    title: finalTitle,
    summary: prompt.slice(0, 80),
    cover: COVERS[Math.floor(Math.random() * COVERS.length)],
    createdAt: new Date().toISOString(),
    pages,
  };
  const list = load();
  list.push(story);
  save(list);
  return story;
}

function autoTitle(prompt: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  return trimmed.length > 20 ? trimmed.slice(0, 18) + "…" : trimmed || "나의 동화";
}

function generateSubtitle(prompt: string, idx: number): Record<Lang, string> {
  const base = prompt.trim() || "신비한 모험";
  const ko = [
    `옛날 옛적에, ${base}에 대한 이야기가 시작되었어요.`,
    `주인공은 새로운 친구를 만나 함께 모험을 떠났답니다.`,
    `용기를 내어 어려움을 함께 헤쳐 나갔어요.`,
    `모두 행복하게 웃으며 이야기는 끝이 났어요. 끝!`,
  ];
  const en = [
    `Once upon a time, a story about "${base}" began.`,
    `Our hero met a new friend and went on an adventure together.`,
    `With courage, they faced every challenge side by side.`,
    `Everyone smiled happily, and the story came to an end!`,
  ];
  const jp = [
    `むかしむかし、「${base}」の物語が始まりました。`,
    `主人公は新しいお友だちに出会い、一緒に冒険に出ました。`,
    `勇気を出して、二人で困難を乗り越えました。`,
    `みんな幸せに笑って、お話はおしまい！`,
  ];
  return { ko: ko[idx], en: en[idx], jp: jp[idx] };
}
