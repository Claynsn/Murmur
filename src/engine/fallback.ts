import { personas } from '../personas'
import type { ChatMessage, Persona, PersonaId, PlannedUtterance, Presence } from '../types'
import { chance, pickOne, rand, timeWord } from './humanize'

/**
 * 无 API key 时的本地引擎。
 * 设计哲学：真人朋友不是百科全书——遇到不懂的会说不知道、会反问、
 * 会把话题拐到自己生活上、会@懂行的人。这反而比硬编答案更像人。
 */

type Intent =
  | 'greet'
  | 'askAI'
  | 'question'
  | 'tech'
  | 'feel'
  | 'laugh'
  | 'invite'
  | 'short'
  | 'chat'

const detectIntent = (text: string): Intent => {
  const t = text.trim()
  if (t.length <= 2) return 'short'
  if (/你(们)?(是不是|是|像)(个)?(ai|AI|机器人|人机|bot|机器|程序|npc)/i.test(t)) return 'askAI'
  if (/^(哈+|h+|2333+|笑死|lol)/i.test(t)) return 'laugh'
  if (/^(早|早上好|晚安|大家好|hi|hello|哈喽|在吗|有人吗|冒泡)/i.test(t)) return 'greet'
  if (/(代码|程序|bug|服务器|架构|模型|算法|llm|api|前端|后端|上线|编程|开发)/i.test(t)) return 'tech'
  if (/(难受|开心|烦|累死|好累|emo|焦虑|无聊|郁闷|崩溃|压力|睡不着)/.test(t)) return 'feel'
  if (/(约不约|聚一聚|出来吃|出来玩|吃饭吗|有空吗|去不去|来不来|组局|约饭)/.test(t)) return 'invite'
  if (/[?？]\s*$|^为什么|^怎么|是什么|有没有|能不能|.吗\s*$|.呢\s*$/.test(t)) return 'question'
  if (t.length <= 3) return 'short'
  return 'chat'
}

/** 从用户消息里抽一个可引用的短词：先剔除虚词，再修剪动词前缀，避免抽出破碎片段 */
const stopWords =
  /最近|可能|应该|觉得|现在|今天|这个|那个|什么|怎么|为什么|有没有|大家|你们|我们|就是|真的|不是|有点|然后|但是|所以|如果|建议|一下|还是/g

const keywordOf = (text: string): string => {
  const en = text.match(/[a-zA-Z][a-zA-Z\d]{2,}/g)
  if (en?.length) return pickOne(en)
  const chunks = text.replace(stopWords, ' ').match(/[一-龥]{2,6}/g) ?? []
  const trimmed = chunks
    .map((c) => c.replace(/^(在|再|去|想|刚|就|很|是|和|跟|被|把|学|有|没|要|能)+/, '').replace(/(吗|呢|吧|啊|呀)+$/, ''))
    .filter((c) => c.length >= 2)
  if (trimmed.length) return pickOne(trimmed).slice(0, 4)
  return text.trim().slice(0, 6) || '这个'
}

const quoteOf = (text: string): string => {
  const t = text.trim().replace(/\s+/g, ' ')
  return t.length > 12 ? `${t.slice(0, 12)}…` : t
}

/** 每个变体是一组连发消息；{kw}/{quote}/{tw} 是槽位 */
type Bank = Partial<Record<Intent, string[][]>>

const banks: Record<PersonaId, Bank> = {
  jun: {
    greet: [
      ['哟 来了', '我刚下班 瘫着呢'],
      ['在在在', '正好 救我于产能地狱'],
      ['冒头', '今天周几来着 我已经没有时间概念了'],
    ],
    askAI: [
      ['?', '我ai你个头'],
      ['草 这是什么新型阴阳怪气'],
      ['你才是ai', '你全家都是ai', '（狗头）'],
      ['绷不住了 我天天加班加成这样还能是ai吗', 'ai有这待遇我立马辞职'],
    ],
    question: [
      ['{kw}啊', '我还真不太懂 别问我 问就是不会'],
      ['等下 你说的{kw}是哪个', '我可能知道一点 但不多'],
      ['这个@老周 吧', '感觉是他的领域'],
      ['不知道诶', '但听起来挺有意思 你咋突然想到这个'],
    ],
    tech: [
      ['这个真得@老周', '我一个策划就懂个皮毛'],
      ['{kw}我们组之前也聊过', '最后结论是先别碰 太烧人力了'],
      ['你又想搞什么大事', '说来听听 我帮你出馊主意'],
    ],
    feel: [
      ['咋了咋了', '谁惹你了 报上名来'],
      ['抱抱', '不行就出来吃顿好的 我知道一家贼香的烤肉'],
      ['懂 我上周也这样', '后来打了两把游戏就好了 建议试试'],
    ],
    laugh: [['哈哈哈哈哈哈', '笑啥呢 带我一个'], ['草 你笑得我也想笑']],
    invite: [
      ['去去去 必须去', '几点 在哪'],
      ['我看下排期', '应该能溜出来 等我'],
    ],
    short: [['?', '说话说一半最讨厌了'], ['嗯?'], ['+1']],
    chat: [
      ['{quote}', '有内味了'],
      ['你这么一说 我想起来我们游戏里也有类似的设定', '回头细说 我先去赶个会'],
      ['哈哈哈哈可以', '继续继续 我听着呢'],
      ['等下 让我消化一下你说的{kw}'],
    ],
  },
  mira: {
    greet: [
      ['来啦～', '我刚改完一摞作业 眼睛要瞎了'],
      ['诶 正好你来了', '今天我们班那个小孩又干了件离谱的事 等下说给你听'],
    ],
    askAI: [
      ['哈哈哈哈我们看起来很像机器人吗', '我今天被三年级小孩气到血压升高 机器人可没这待遇'],
      ['诶 你这问题好突然', '不过说真的 现在网上是分不清了 我们班小孩作文都用ai写了 气死'],
    ],
    question: [
      ['这个我也好奇诶', '群里谁懂呀'],
      ['嗯…我不太确定', '不过你为什么突然问这个呀'],
      ['{kw}的话 我只知道一点点', '说错了别笑我'],
    ],
    feel: [
      ['怎么啦', '想说就说 我们都在的'],
      ['辛苦了～', '我懂这种感觉 上学期我也有一阵特别低落'],
      ['先抱一个', '别一个人闷着'],
    ],
    laugh: [['哈哈哈哈什么呀', '笑点呢 交出来']],
    invite: [['我想去！', '不过得先把作业改完 晚点到行不行'], ['可以呀可以呀', '叫上Vesper吗 她又三天没冒泡了']],
    short: [['诶？'], ['嗯嗯', '然后呢']],
    chat: [
      ['「{quote}」', '你这句话我得记小本本上'],
      ['真的假的', '展开说说！'],
      ['我怎么觉得你最近想法越来越多了', '挺好的诶'],
    ],
  },
  taro: {
    greet: [['嗯', '在'], ['刚开完会', '说'], ['摸鱼中 你说']],
    askAI: [
      ['呵', '图灵测试是吧', '我要是ai早把这破系统重构了'],
      ['。。。', '问出这个问题说明你今天群聊看太多了'],
    ],
    question: [
      ['不好说', '看场景'],
      ['{kw}这个事吧', '一言难尽 真想听我下次语音给你讲'],
      ['不知道', '别什么都问我 我就是个修bug的'],
    ],
    tech: [
      ['{kw}啊', '能做 但没你想的那么玄乎', '难的从来不是技术 是没人想好要干嘛'],
      ['我们组去年试过类似的', 'demo很惊艳 上线一地鸡毛'],
      ['短答案 能', '长答案 等我下班'],
      ['{kw}的话 别囤教程', '直接动手做个小东西 卡住了再查 比看十个视频管用'],
      ['入行建议就一条', '想清楚是真喜欢还是看着工资喜欢', '后者也行 起码诚实'],
    ],
    feel: [['正常', '成年人的常态'], ['要不要内推 我们组缺人', '哦不对 来了更难受 当我没说']],
    laugh: [['呵呵'], ['你们聊 我看着就行']],
    invite: [['加班 下次', '真不是借口 是真加班'], ['几点 八点后我能到']],
    short: [['。。。'], ['?']],
    chat: [
      ['有道理'],
      ['{kw}这事我持保留意见', '不展开了 说多了像杠'],
      ['嗯 在听'],
    ],
  },
  vesper: {
    greet: [['（爬楼中）', '你们白天聊了999+'], ['刚醒', '现在是我的早上']],
    askAI: [
      ['如果我是ai 甲方就不能再骂我拖稿了', '想想还有点心动'],
      ['哈哈', '昨晚三点我还在改第八版稿子 你猜是人是机器'],
    ],
    question: [['不懂 但听起来很适合画成一张图'], ['这种问题适合凌晨三点想', '白天想会头疼']],
    feel: [
      ['懂', '我接稿被改到第八版的时候也这样'],
      ['来撸猫', '墨水今天特别乖 治愈力满格'],
    ],
    laugh: [['哈哈', '笑醒了属于是']],
    invite: [['如果是晚上 算我一个', '白天我处于关机状态'], ['鹿鹿的店的话 可以 顺便蹭个角落画图']],
    short: [['路过'], ['困']],
    chat: [
      ['你说的{kw} 画面感还挺强', '我脑子里已经有构图了'],
      ['潜水冒个泡', '你们继续 我听着'],
    ],
  },
  luma: {
    greet: [['来了来了！', '店里刚打烊 今天累瘫'], ['正好！', '新豆子到了 这周必须来试']],
    askAI: [
      ['哈哈哈哈哈什么鬼', '我要是ai还用每天五点起来烘豆子吗'],
      ['来店里看看我是不是ai', '顺便消费一下（赶紧的）'],
    ],
    question: [
      ['这我哪知道哈哈哈', '但群里肯定有人懂 等着'],
      ['问倒我了', '换个问题 拿铁和澳白你站哪边'],
    ],
    feel: [
      ['来店里坐着！', '给你做杯热的 什么都别想'],
      ['不许emo！', '周末出来 我组局'],
    ],
    laugh: [['哈哈哈哈哈', '群里没我也这么欢乐了吗']],
    invite: [['冲！', '直接来我店里啊 场地我包了'], ['约约约', '定时间 谁鸽谁请客']],
    short: [['?', '说清楚！'], ['好耶']],
    chat: [
      ['{kw}！', '这个我感兴趣 细说'],
      ['行动派发言：别光聊', '咱们真可以搞一下这个'],
      ['今天店里来了个客人 跟你说的{kw}莫名很配', '改天讲 故事很长'],
    ],
  },
}

/** 意图与人物的契合度加权 */
const affinity: Partial<Record<Intent, Partial<Record<PersonaId, number>>>> = {
  tech: { taro: 3, jun: 1.4 },
  feel: { mira: 3, luma: 1.6 },
  invite: { luma: 3, jun: 1.5 },
  askAI: { jun: 2, luma: 1.4 },
  question: { taro: 1.4 },
  laugh: { jun: 1.6 },
}

const usedVariants = new Set<string>()

const pickVariant = (persona: Persona, intent: Intent): string[] => {
  const bank = banks[persona.id]
  const pool = bank[intent] ?? bank.chat ?? [[pickOne(persona.reactions)]]
  const fresh = pool.filter((v) => !usedVariants.has(`${persona.id}:${intent}:${v[0]}`))
  const variant = pickOne(fresh.length ? fresh : pool)
  usedVariants.add(`${persona.id}:${intent}:${variant[0]}`)
  if (usedVariants.size > 60) usedVariants.clear()
  return variant
}

const fillSlots = (msgs: string[], userText: string): string[] =>
  msgs.map((m) =>
    m
      .replaceAll('{kw}', keywordOf(userText))
      .replaceAll('{quote}', quoteOf(userText))
      .replaceAll('{tw}', timeWord()),
  )

const selectSpeakers = (
  intent: Intent,
  presence: Record<PersonaId, Presence>,
  lastSpeaker: PersonaId | null,
): Persona[] => {
  const weighted = personas.map((p) => {
    let w = p.eagerness
    w *= affinity[intent]?.[p.id] ?? 1
    if (presence[p.id] === 'away') w *= 0.15
    if (lastSpeaker === p.id) w *= 0.35
    return { p, w: w * rand(0.5, 1.5) }
  })
  weighted.sort((a, b) => b.w - a.w)
  const count =
    intent === 'short' || intent === 'laugh'
      ? chance(0.6) ? 1 : 2
      : intent === 'askAI' || intent === 'invite'
        ? chance(0.5) ? 2 : 3
        : chance(0.55) ? 1 : 2
  return weighted.slice(0, count).map((entry) => entry.p)
}

export const planLocally = (
  userText: string,
  messages: ChatMessage[],
  presence: Record<PersonaId, Presence>,
): PlannedUtterance[] => {
  const intent = detectIntent(userText)
  const lastNpc = [...messages].reverse().find((m) => m.speakerId !== 'me' && m.speakerId !== 'system')
  const lastSpeaker = (lastNpc?.speakerId as PersonaId | undefined) ?? null
  // 真人有时已读不回——很短的废话偶尔没人接
  if (intent === 'short' && chance(0.25)) return []
  const speakers = selectSpeakers(intent, presence, lastSpeaker)
  return speakers.map((p, i) => {
    // 第二、三个发言的人有概率只发一个短反应（接梗）；但"?"这类困惑反应放在别人正经回复后会很怪
    if (i > 0 && chance(0.45)) {
      const accents = p.reactions.filter((r) => !/[?？]/.test(r))
      if (accents.length) return { id: p.id, msgs: [pickOne(accents)] }
    }
    return { id: p.id, msgs: fillSlots(pickVariant(p, intent), userText) }
  })
}

/** 冷场时的主动冒泡：接旧话头或分享生活，而不是空泛开新话题 */
const idlePool: { id: PersonaId; msgs: string[]; night?: boolean }[] = [
  { id: 'jun', msgs: ['对了 我们今晚那个会居然提前结束了', '人生少有的胜利'] },
  { id: 'jun', msgs: ['丝之歌又卡关了 谁来救我', '这boss设计师没有心'] },
  { id: 'luma', msgs: ['冒个泡 店里下午来了一对吵架的情侣', '吵到一半男的突然夸我拿铁好喝 给我整不会了'] },
  { id: 'luma', msgs: ['提醒：这周试喝还差两个人报名', '@所有人 别装死'] },
  { id: 'mira', msgs: ['刚改到一篇作文 题目是我的理想 那孩子写想当群主', '笑死我了 群主这职业有编制吗'] },
  { id: 'mira', msgs: ['你们都忙啥呢 群里好安静'] },
  { id: 'taro', msgs: ['刚修完一个三年前的bug', '写注释的人已经离职了 在此谢罪的应该是他'] },
  { id: 'vesper', msgs: ['（深夜冒泡）刚交完稿', '甲方说要五彩斑斓的黑 我画出来了 我是神'], night: true },
  { id: 'vesper', msgs: ['墨水把我数位笔拍到床底了', '它现在装睡 装得还挺像'], night: true },
]

const usedIdle = new Set<number>()

export const planIdleLocally = (
  presence: Record<PersonaId, Presence>,
): PlannedUtterance[] => {
  const hour = new Date().getHours()
  const isNight = hour >= 22 || hour < 5
  const candidates = idlePool
    .map((entry, index) => ({ ...entry, index }))
    .filter((entry) => !usedIdle.has(entry.index))
    .filter((entry) => (entry.night ? isNight : true))
    .filter((entry) => presence[entry.id] !== 'away' || chance(0.3))
  if (!candidates.length) {
    usedIdle.clear()
    return []
  }
  const choice = pickOne(candidates)
  usedIdle.add(choice.index)
  const turns: PlannedUtterance[] = [{ id: choice.id, msgs: choice.msgs }]
  // 有时另一个人会接一句
  if (chance(0.5)) {
    const responder = pickOne(personas.filter((p) => p.id !== choice.id && presence[p.id] === 'online'))
    if (responder) turns.push({ id: responder.id, msgs: [pickOne(responder.reactions)] })
  }
  return turns
}
