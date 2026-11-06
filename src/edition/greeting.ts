import type { EditionGreeting } from "../core/edition";

// Public edition: every word the visitor reads.
// Generic and friendly, so anyone recovering can receive it. Simplified Chinese first,
// with natural English touches. Keep personal names and private jokes out of this file:
// personalised editions live in their own private repositories.

export const greeting = {
  title: "A Little Sunshine",
  tagline: "一点快乐，一点阳光，送给正在休息的你。",

  loading: "正在收集一点阳光…",

  welcome: {
    title: "A Little Sunshine ☀️",
    text: "欢迎来到你的小小快乐星球！",
    button: "出发吧！",
  },

  door: {
    text: "门后有什么惊喜？进去看看！",
    hint: "打开门",
  },

  pocket: {
    title: "快乐口袋",
    text: "今天的快乐，由这个口袋负责！点一下，每次都有不同的小惊喜。",
    open: "打开口袋",
    again: "再来一个",
    next: "继续",
  },

  pocketMessages: [
    "今日份阳光已送达 ☀️",
    "多喝热水！（这句是必须的）",
    "病菌已经投降，剩下的交给休息就好～",
    "记得笑一笑，好得更快哦！",
    "睡个好觉，比什么都重要 😴",
    "今天也要乖乖吃药哦！",
    "满血复活倒计时中……",
  ],

  garden: {
    title: "愿望花园",
    text: "每天都要收获一点好心情！点一朵花，看看它会开出什么。",
    pick: "开一朵花",
    next: "继续逛逛",
    full: "整个花园都开满啦 🌸",
  },

  // One per flower in the garden (twelve).
  flowerMessages: [
    "多喝水，多休息！",
    "喉咙舒服点了吗？来杯温水吧 🍵",
    "今天的任务：好好躺平休息。",
    "病菌：我认输了 🏳️",
    "工作可以等，身体最重要！",
    "吃饱饱，睡好好～",
    "每天都比昨天好一点点！",
    "元气值 +10 ✨",
    "好心情也是一种药 😄",
    "慢慢来，不用急。",
    "送你一朵小花 🌸",
    "大家都在等你回来哦！",
  ],

  letter: {
    heading: "有几句话想跟你说……",
    open: "打开信",
    salutation: "Hi there!",
    paragraphs: [
      "希望你今天比昨天舒服一点点！",
      "恭喜你又打败了一批病菌 😂",
      "这几天继续乖乖休息，好好养病，别逞强哦！",
      "希望你快快恢复元气，早日满血复活，我们等你回来！",
    ],
    closing: "Take care! ☀️",
    signature: "– 一群惦记着你的人",
    next: "继续",
  },

  finale: {
    title: "Get Well Soon!",
    text: "快快恢复元气！我们等你好起来！",
    button: "再逛一次花园",
  },

  // The companion robot's little lines.
  robot: {
    name: "Sunny",
    hello: "嗨！我是 Sunny，带你逛逛 ✨",
    door: "门后有惊喜哦～",
    pocket: "点一下！里面总有好东西。",
    garden: "点点花朵，看看会开出什么～",
    allBloomed: "哇，整个花园都开花啦！",
    finale: "See you soon! 💙",
    pokes: ["Beep boop! 💙", "哈哈，好痒！", "要好好休息哦！", "被你发现啦 ✨", "送你一点阳光！"],
  },

  sound: { on: "Music on", off: "Music off" },

  fallback: {
    note: "你的浏览器暂时无法显示 3D，不过祝福一样送到！",
    pocketButton: "打开口袋",
  },
} satisfies EditionGreeting;
