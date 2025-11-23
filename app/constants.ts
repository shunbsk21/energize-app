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
    { id: 'p2', text: '日中、体のだるさや重さを感じることが多い。', isReversed: true },
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

export const ENERGY_PERSONALITIES = {
  // 1. 全てHigh (P:高, M:高, E:高, I:高)
  "P_High_M_High_E_High_I_High": {
    name: "覚醒した勇者 (The Awakened Hero)",
    catchphrase: "今のあなたに不可能はない。世界を変えるのは今日だ。",
    description: "心技体すべてが最高レベルで噛み合っています。圧倒的なパフォーマンスを発揮できる「ゾーン」に入っている状態です。",
    advice: {
      title: "この状態を維持するために",
      habits: ["今日できたことを3つ記録する（成功体験の定着）", "誰かに感謝を伝える（ポジティブの循環）"]
    }
  },

  // 2. 体だけ疲れてる (P:低, M:高, E:高, I:高)
  "P_Low_M_High_E_High_I_High": {
    name: "傷だらけの賢者 (The Wounded Sage)",
    catchphrase: "精神は燃えているが、体が追いついていない。",
    description: "やる気も頭の回転も絶好調ですが、体だけが悲鳴を上げています。無理をすると強制シャットダウンする直前です。",
    advice: {
      title: "体をいたわる習慣を",
      habits: ["今すぐ15分の昼寝をする", "湯船にゆっくり浸かる", "激しい運動は避け、ストレッチのみにする"]
    }
  },

  // 3. 目的を見失っている (P:高, M:低, E:高, I:高)
  "P_High_M_Low_E_High_I_High": {
    name: "陽気な迷子 (The Happy Wanderer)",
    catchphrase: "スペックは高いのに、どこへ行けばいいか分からない。",
    description: "元気で頭も冴えていますが、「何のために？」という羅針盤を失っています。宝の持ち腐れ状態になりがちです。",
    advice: {
      title: "目的を再確認する習慣を",
      habits: ["「人生で大切にしたい価値観」を書き出す", "1年後の理想の自分を想像する", "尊敬する人の本を読む"]
    }
  },

  // 4. メンタルが落ちている (P:高, M:高, E:低, I:高)
  "P_High_M_High_E_Low_I_High": {
    name: "冷徹なマシン (The Cold Machine)",
    catchphrase: "成果は出る。しかし、そこに喜びはない。",
    description: "仕事は完璧にこなせますが、心は乾いています。効率を求めすぎて、感情を置き去りにしているかもしれません。",
    advice: {
      title: "心を潤す習慣を",
      habits: ["好きな音楽を聴いてリラックスする", "信頼できる友人と雑談する", "デジタルデトックス（スマホを置く）時間を設ける"]
    }
  },

  // 5. 頭が回らない (P:高, M:高, E:高, I:低)
  "P_High_M_High_E_High_I_Low": {
    name: "暴走する情熱家 (The Runaway Passion)",
    catchphrase: "アクセル全開だが、ハンドルが効かない。",
    description: "エネルギーとやる気は十分ですが、思考が整理されていません。勢いで動くと空回りする危険性があります。",
    advice: {
      title: "思考をクリアにする習慣を",
      habits: ["「今やるべきこと」を1つだけ紙に書く", "5分間の瞑想を行う", "部屋の換気をして深呼吸する"]
    }
  },

  // 6. 体と心が疲れている (P:低, M:高, E:低, I:高)
  "P_Low_M_High_E_Low_I_High": {
    name: "悲劇の軍師 (The Tragic Strategist)",
    catchphrase: "策はある。しかし動く兵士（体）と士気（心）がない。",
    description: "頭では正解が分かっているのに、体もしんどく、気分も乗らない辛い状態。自分を責めやすい時です。",
    advice: {
      title: "まずは休息を優先する",
      habits: ["今日は「何もしない」と決める", "温かい飲み物を飲む", "早めに就寝する"]
    }
  },

  // 7. 体と頭が疲れている (P:低, M:高, E:高, I:低)
  "P_Low_M_High_E_High_I_Low": {
    name: "夢見る病床の人 (The Dreaming Patient)",
    catchphrase: "やりたいことはあるのに、体が動かず頭も働かない。",
    description: "理想ややる気はあるものの、フィジカルと脳の疲れがピークです。焦らず回復を待つ必要があります。",
    advice: {
      title: "回復に専念する習慣を",
      habits: ["PCやスマホを見ない時間を30分作る", "良質なタンパク質を摂る", "7時間以上の睡眠時間を確保する"]
    }
  },

  // 8. 体と目的がない (P:低, M:低, E:高, I:高)
  "P_Low_M_Low_E_High_I_High": {
    name: "ご隠居アドバイザー (The Retired Advisor)",
    catchphrase: "口は出すが手は出さない。そして行く当てもない。",
    description: "気分は良く頭も回りますが、体力と人生の目的感が低下中。批評家になりがちな状態です。",
    advice: {
      title: "小さな一歩を踏み出す習慣を",
      habits: ["散歩をして体を動かす", "小さな目標（部屋の片付けなど）を立てて実行する"]
    }
  },

  // 9. 心と頭が疲れている (P:高, M:高, E:低, I:低)
  "P_High_M_High_E_Low_I_Low": {
    name: "空回りのソルジャー (The Blunt Soldier)",
    catchphrase: "体力と使命感だけで突き進む特攻隊長。",
    description: "体は元気でやる気もありますが、イライラしており判断力も鈍っています。ミスや衝突を起こしやすい危険な状態です。",
    advice: {
      title: "クールダウンする習慣を",
      habits: ["一度作業の手を止めて深呼吸", "冷たい水で顔を洗う", "感情をノートに書き殴って客観視する"]
    }
  },

  // 10. 心と目的がない (P:高, M:低, E:低, I:高)
  "P_High_M_Low_E_Low_I_High": {
    name: "優秀なロボット (The Efficient Robot)",
    catchphrase: "タスクはこなせる。しかし、色がない。",
    description: "体力と知力はあるので作業はできますが、心が死んでおり、何のためにやっているかも見失っています。",
    advice: {
      title: "感性を取り戻す習慣を",
      habits: ["自然の多い場所へ行く", "美味しいものを味わって食べる", "映画やアートに触れる"]
    }
  },

  // 11. 頭と目的がない (P:高, M:低, E:高, I:低)
  "P_High_M_Low_E_High_I_Low": {
    name: "お祭りピエロ (The Party Clown)",
    catchphrase: "楽しいけれど、後には何も残らない。",
    description: "元気で機嫌も良いですが、深く考えることができず、将来の展望もありません。衝動的な行動に注意。",
    advice: {
      title: "落ち着きを取り戻す習慣を",
      habits: ["静かな場所で読書をする", "今日やるべきことをリストアップする"]
    }
  },

  // 12. 感情以外すべて低い (P:低, M:低, E:高, I:低)
  "P_Low_M_Low_E_High_I_Low": {
    name: "穏やかなナマケモノ (The Peaceful Sloth)",
    catchphrase: "生産性ゼロ。でも、幸せならOK？",
    description: "何もできていませんが、なぜか気分だけは良い状態。休息日なら最高ですが、平日なら要注意です。",
    advice: {
      title: "少しだけスイッチを入れる習慣を",
      habits: ["起きてすぐに太陽の光を浴びる", "軽いストレッチから始める"]
    }
  },

  // 13. 知性以外すべて低い (P:低, M:低, E:低, I:高)
  "P_Low_M_Low_E_Low_I_High": {
    name: "憂鬱な哲学者 (The Melancholy Philosopher)",
    catchphrase: "世界の終わりについて、論理的に思考している。",
    description: "体も心も辛いのに、頭だけが冴えてネガティブな思考ループに陥っています。動けないため、考えすぎてしまいます。",
    advice: {
      title: "思考を止める習慣を",
      habits: ["マインドフルネス瞑想を行う", "単純作業（皿洗いなど）に没頭する"]
    }
  },

  // 14. 感情以外すべて高い (P:高, M:低, E:低, I:低) -> ※論理矛盾修正: 正しくは「体力以外すべて低い」
  // 14. 体力以外すべて低い (P:高, M:低, E:低, I:低) ...だとP_Highになるので、
  // ここは「体力だけ高い」タイプ (P:High, M:Low, E:Low, I:Low)
  "P_High_M_Low_E_Low_I_Low": {
    name: "さまよえる野獣 (The Wandering Beast)",
    catchphrase: "有り余るエネルギーを、どこにぶつければいい？",
    description: "体力だけがあり、精神・感情・知性がダウンしています。ムシャクシャして暴飲暴食や散財に走りやすい状態です。",
    advice: {
      title: "エネルギーを発散する習慣を",
      habits: ["筋トレやランニングで汗を流す", "カラオケで大声を出す"]
    }
  },

  // 15. 精神だけ高い (P:低, M:高, E:低, I:低)
  "P_Low_M_High_E_Low_I_Low": {
    name: "燃え尽き前のロウソク (The Fading Candle)",
    catchphrase: "執念だけで立っている。",
    description: "ボロボロの状態ですが、「これだけはやらねば」という使命感だけで動いています。最も倒れやすい危険な状態です。",
    advice: {
      title: "緊急停止と休息を",
      habits: ["すべての通知を切って寝る", "栄養ドリンクではなく、食事と睡眠をとる"]
    }
  },

  // 16. 全てLow (P:低, M:低, E:低, I:低)
  "P_Low_M_Low_E_Low_I_Low": {
    name: "冬眠中のクマ (The Hibernating Bear)",
    catchphrase: "今はただ、静かに眠らせてくれ。",
    description: "エネルギーが完全に枯渇しています。今は何かしようとせず、生命維持（食べて寝る）に専念すべき時です。",
    advice: {
      title: "完全休息の習慣を",
      habits: ["自分を許して休む", "温かいスープを飲む", "布団の中で好きな音楽を聴く"]
    }
  }
};

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