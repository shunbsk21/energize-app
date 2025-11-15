// FIX: Removed circular dependency by importing types from the corrected `types.ts` file.
// This file now correctly separates constants from type definitions.
import type { EnergyCategory, EnergyQuestionnaire, Advice } from '../app/types';

export const ENERGY_CATEGORIES: { [key in EnergyCategory]: { name: string; description: string; color: string; shortName: string; } } = {
  physical: { name: '身体的エネルギー', description: 'フィジカル', color: '#34D399', shortName: '身体' },
  mental: { name: '精神的エネルギー', description: '目的意識', color: '#FBBF24', shortName: '精神' },
  emotional: { name: '感情的エネルギー', description: '意欲・ポジティブさ', color: '#F87171', shortName: '感情' },
  intellectual: { name: '頭脳エネルギー', description: '集中力・思考力', color: '#60A5FA', shortName: '頭脳' },
};

export const QUESTIONS: EnergyQuestionnaire = {
  physical: [
    { id: 'p1', text: '朝、すっきりと起きられている。', isReversed: false },
    { id: 'p2', text: '日中、体のだるさや重さを感じることが少ない。', isReversed: false },
    { id: 'p3', text: '体が「軽い」「エネルギッシュだ」と感じる瞬間がある。', isReversed: false },
    { id: 'p4', text: '疲れが抜けず、くたくただと感じる。', isReversed: true },
    { id: 'p5', text: '気力が湧かず、だらだらと過ごしてしまう。', isReversed: true },
  ],
  mental: [
    { id: 'm1', text: '自分がやっていることには価値があると感じる。', isReversed: false },
    { id: 'm2', text: '自分の人生は、意義と目的に満ちていると思う。', isReversed: false },
    { id: 'm3', text: '自分の人生に、明確な方向性（こうありたいという姿）がある。', isReversed: false },
    { id: 'm4', text: '「何のためにこれをやっているのか」と無意味に感じることがある。', isReversed: true },
    { id: 'm5', text: '自分の将来に希望が持てない、あるいはぼんやりしている。', isReversed: true },
  ],
  emotional: [
    { id: 'e1', text: '陽気で、前向きな気分でいられる。', isReversed: false },
    { id: 'e2', text: 'ささいなことでイライラしたり、不機嫌になったりする。', isReversed: true },
    { id: 'e3', text: '漠然とした不安や、緊張感がある。', isReversed: true },
    { id: 'e4', text: 'やる気が出ず、憂鬱（ゆううつ）だと感じる。', isReversed: true },
    { id: 'e5', text: '他人とコミュニケーションをとるのが億劫だと感じる。', isReversed: true },
  ],
  intellectual: [
    { id: 'i1', text: '物事に没頭し、集中できている。', isReversed: false },
    { id: 'i2', text: '頭がスッキリと冴え、思考がクリアだと感じる。', isReversed: false },
    { id: 'i3', text: '頭が「ぼーっ」として、霧がかかったように感じる。（ブレインフォグ）', isReversed: true },
    { id: 'i4', text: '考えがまとまらず、混乱している。', isReversed: true },
    { id: 'i5', text: '物事を決められず、判断を先延ばしにしてしまう。', isReversed: true },
  ],
};

export const RATING_OPTIONS = [
  { value: 0, label: '全く当てはまらない' },
  { value: 1, label: '少し当てはまる' },
  { value: 2, label: 'どちらともいえない' },
  { value: 3, label: 'かなり当てはまる' },
  { value: 4, label: '非常に当てはまる' },
];

export const getEnergyLevel = (score: number) => {
  if (score >= 16) return { label: '充満 (ゾーン)', color: 'bg-green-100 text-green-800 border-green-400', emoji: '🟢' };
  if (score >= 10) return { label: '標準 (要注意)', color: 'bg-yellow-100 text-yellow-800 border-yellow-400', emoji: '🟡' };
  return { label: '枯渇 (緊急対策)', color: 'bg-red-100 text-red-800 border-red-400', emoji: '🔴' };
};

export const ADVICE_CONTENT: { [key in EnergyCategory]: Advice[] } = {
  physical: [
    {
      title: '即効性のあるクイック・リカバリー',
      points: [
        '水を飲む: 最も手軽で効果的です。脱水は即、疲労感に直結します。',
        'ストレッチ: デスクワークなら肩甲骨、背中、股関節を伸ばし、血流を動かします。',
        '深呼吸: 「4秒吸って、7秒止め、8秒で吐く」腹式呼吸でリラックスします。',
        '軽い運動: 散歩や階段の上り下りなど、座りっぱなしを防ぎます。',
      ],
    },
    {
      title: '睡眠の質を再点検する（最優先）',
      points: [
        '就寝1時間前からスマホやPCの光を避けます。',
        '寝室を「睡眠専用」の場所にし、心と体を睡眠モードに切り替えます。',
        '15〜20分のパワーナップ（昼寝）で午後のパフォーマンスを改善します。',
      ],
    },
    {
      title: '栄養を戦略的に摂取する',
      points: [
        '朝食にタンパク質（卵、ヨーグルト等）を加え、血糖値の安定を図ります。',
        'だるい時の間食は、血糖値を急上昇させないナッツやハイカカオチョコレートを選びます。',
      ],
    },
     {
      title: '血流を確保する',
      points: [
        '「25分集中＋5分休憩」でストレッチなどを挟む「ポモドーロ・テクニック」が有効です。',
        '座ったままかかとを上げ下げし、「第二の心臓」ふくらはぎを動かしましょう。',
      ],
    },
  ],
  mental: [
    {
      title: '「なぜ」を再確認する',
      points: [
        '「なぜ自分はこの仕事をしているのか？」その最終目的を1分間だけ思い出します。',
        'もし個人の信条や目標を書き出したものがあれば、それを見返します。',
        '「1年後、これをやり遂げた自分はどうなっているか？」を想像します。',
        '自分の仕事が「誰の役に立っているか」を具体的にイメージします。',
      ],
    },
  ],
  emotional: [
    {
      title: '感情の波を乗りこなす',
      points: [
        '「今、自分はイライラしているな」と自分の感情を客観的に認識（ラベリング）します。',
        '今感謝できることを3つ見つけ、強制的にポジティブな側面に意識を向けます。',
        '作り笑いでも脳は「楽しい」と錯覚し、ストレスホルモンを抑制します。',
        '信頼できる人と仕事と無関係な雑談を短時間行います。',
        '気分が上がる音楽やリラックスできる音楽を聴きます。',
        '「机の上を片付ける」など、すぐに完了できる「小さな成功体験」で自己効力感を回復させます。',
      ],
    },
  ],
  intellectual: [
    {
      title: '思考をリフレッシュし、集中力を取り戻す',
      points: [
        'PC画面から目を離し、窓の外の遠く（緑が望ましい）を2分間眺めます。',
        'やるべきことを全て書き出し、「今やるべきこと一つ」に絞ります（シングルタスク化）。',
        'スマホを機内モードにし、通知を遮断してデジタル・デトックスを行います。',
        '「25分集中＋5分休憩」のポモドーロ・テクニックを導入します。',
        '5分間、ただ自分の呼吸に意識を集中する瞑想で、思考をリセットします。',
        '会議室やカフェなど、物理的に場所を変えることで脳をリフレッシュします。',
      ],
    },
  ],
};