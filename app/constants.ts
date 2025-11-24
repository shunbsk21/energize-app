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

// --- Recommended habits mapping for energy personalities (from provided CSV) ---
export const ENERGY_PERSONALITY_HABITS: Record<string, { energy: 'physical'|'mental'|'emotional'|'intellectual'; title: string; detail: string }[]> = {
  "P_High_M_High_E_High_I_High": [
    { energy: 'physical', title: '限界突破トレーニング', detail: '身体能力がピークにあるため、自己ベスト更新を狙うような高強度運動を行う。' },
    { energy: 'physical', title: 'プレミアム・リカバリー', detail: '高い出力を維持するため、整体やサウナなど最高級のメンテナンスを体に施す。' },
    { energy: 'mental', title: 'ビジョン・アッパー', detail: '10年後の目標をさらに上方修正し、より大きな挑戦を自分に課す。' },
    { energy: 'mental', title: '貢献の最大化', detail: '自分のエネルギーを社会や他者にどう還元できるか、利他的な計画を立てる。' },
    { energy: 'emotional', title: '感謝の循環', detail: '溢れるポジティブな感情を周囲に伝え、チーム全体の士気を引き上げる。' },
    { energy: 'emotional', title: 'メンター活動', detail: '誰かの相談に乗り、自身の安定した感情を分け与えることで充足感を得る。' },
    { energy: 'intellectual', title: 'ディープ・ワーク', detail: '最も難易度の高い課題や、創造的なプロジェクトに集中的に取り組む。' },
    { energy: 'intellectual', title: '新領域の学習', detail: '未知の分野の専門書を読むなど、知的好奇心をフルに満たすインプットを行う。' },
  ],
  "P_Low_M_High_E_High_I_High": [
    { energy: 'physical', title: '強制シャットダウン', detail: 'どんなにやる気があっても、22時にはベッドに入り物理的に体を横にする。' },
    { energy: 'physical', title: '栄養密度の高い食事', detail: '消化に良く栄養価の高い食事（スープやスムージー）で、内臓の負担を減らす。' },
    { energy: 'mental', title: '「休む勇気」の再定義', detail: '「休息こそが今の最重要ミッションである」と言い聞かせ、罪悪感を消す。' },
    { energy: 'mental', title: '静的なビジュアライズ', detail: '体を動かさず、目を閉じて理想の未来を鮮明にイメージするトレーニング。' },
    { energy: 'emotional', title: '身体への感謝', detail: '無理をしてきた自分の体に「ありがとう」と声をかけ、労る気持ちを持つ。' },
    { energy: 'emotional', title: '癒やしの音楽鑑賞', detail: 'ゆったりとしたテンポの音楽を聴き、高ぶる神経を鎮める。' },
    { energy: 'intellectual', title: 'オーディオブック', detail: '目と体を使わず、耳だけで良質な情報をインプットする。' },
    { energy: 'intellectual', title: '思考の断捨離', detail: 'やりたいことが多すぎる状態なので、タスクを減らすための取捨選択を行う。' },
  ],
  "P_High_M_Low_E_High_I_High": [
    { energy: 'physical', title: '場所の移動', detail: 'いつもと違う場所へ行き、物理的な視点を変えることで刺激を入れる。' },
    { energy: 'physical', title: 'リズム運動', detail: 'ダンスやランニングなど、一定のリズムを刻む運動で無心になる。' },
    { energy: 'mental', title: '価値観バリューカード', detail: '自分が人生で大切にしたい価値観を選び直す。' },
    { energy: 'mental', title: 'ロールモデル研究', detail: '憧れの人の自伝やインタビューを読み、「なぜその生き方なのか」を探る。' },
    { energy: 'emotional', title: '直感に従う', detail: '理由を考えず「楽しそう」と感じたことだけに手を出してみる。' },
    { energy: 'emotional', title: '旅の計画', detail: '目的のない旅や、行ったことのない場所への旅行を計画しワクワクする。' },
    { energy: 'intellectual', title: 'マインドマップ', detail: '頭の中にある雑多な興味関心を書き出し、繋がりを見つける。' },
    { energy: 'intellectual', title: '哲学的な問い', detail: '「何のために働くのか？」などの正解のない問いについて友人と語る。' },
  ],
  "P_High_M_High_E_Low_I_High": [
    { energy: 'physical', title: '五感への刺激', detail: 'アロマを嗅ぐ、裸足で土を踏むなど、感覚器官を直接刺激して感情を呼び戻す。' },
    { energy: 'physical', title: '太陽光を浴びる', detail: '朝、日光を15分浴びてセロトニン（幸せホルモン）の分泌を促す。' },
    { energy: 'mental', title: '原点回帰', detail: '「そもそもなぜこれを始めたのか」という初心を思い出す時間を設ける。' },
    { energy: 'mental', title: 'デジタル・デトックス', detail: 'スマホやPCから離れ、アナログな時間に身を置く。' },
    { energy: 'emotional', title: '感情ジャーナリング', detail: '「今、何を感じているか」を言語化し感情の蓋を開ける。' },
    { energy: 'emotional', title: 'アートセラピー', detail: '絵を描く、粘土を触るなど言葉以外で内面を表現する。' },
    { energy: 'intellectual', title: '感情分析', detail: 'なぜ冷めているのか、客観的に要因を分析してみる。' },
    { energy: 'intellectual', title: 'ノンフィクション読書', detail: '他人の人生やドキュメンタリーに触れ、共感脳を刺激する。' },
  ],
  "P_High_M_High_E_High_I_Low": [
    { energy: 'physical', title: '深呼吸・瞑想', detail: '浅くなっている呼吸を整え、脳への酸素供給量を増やす。' },
    { energy: 'physical', title: 'スロー・ストレッチ', detail: '意識的にゆっくり動くことで、逸る気持ちと体をブレーキさせる。' },
    { energy: 'mental', title: '優先順位の「1つ」化', detail: '「今日やることはこれ1つだけ」と決め、他のノイズを切り捨てる。' },
    { energy: 'mental', title: '完了の定義', detail: '「どこまでやればOKか」のゴールラインを明確に設定する。' },
    { energy: 'emotional', title: 'クールダウン・タイム', detail: '感情が高ぶったら6秒数えて鎮める。' },
    { energy: 'emotional', title: '不安の書き出し', detail: 'モヤモヤを紙に書き出し視覚化して落ち着かせる。' },
    { energy: 'intellectual', title: 'ToDoの細分化', detail: '大きなタスクを5分でできる単位まで分解する。' },
    { energy: 'intellectual', title: 'シングルタスク', detail: 'マルチタスクを禁止し、目の前の作業に集中する。' },
  ],
  "P_Low_M_High_E_Low_I_High": [
    { energy: 'physical', title: '15分のパワーナップ', detail: '昼寝を取り入れ、低下している身体のエネルギーを少しだけ回復させる。' },
    { energy: 'physical', title: 'ホットアイマスク', detail: '酷使している目を温め、副交感神経を優位にする。' },
    { energy: 'mental', title: '戦略的撤退', detail: '「今は引く時期である」と論理的に自分を納得させ、休息を正当化する。' },
    { energy: 'mental', title: '長期計画の見直し', detail: '現場（体）が動かないので、司令部で数年単位の計画を練り直す。' },
    { energy: 'emotional', title: '自分への労い', detail: '「よくやっている」と自分で自分を褒める。' },
    { energy: 'emotional', title: '期待値を下げる', detail: '今日の合格ラインを最低限まで下げ失望を防ぐ。' },
    { energy: 'intellectual', title: '情報収集モード', detail: 'アウトプットを諦め、動画や読書などインプットに徹する。' },
    { energy: 'intellectual', title: '仕組み化の考案', detail: '成果が出る自動化やシステムを考える。' },
  ],
  "P_Low_M_High_E_High_I_Low": [
    { energy: 'physical', title: '睡眠ファースト', detail: '何をおいても7時間以上の睡眠時間を確保する。' },
    { energy: 'physical', title: '消化の良い食事', detail: '胃腸に負担をかけない温かいスープやお粥を摂る。' },
    { energy: 'mental', title: '夢のコラージュ', detail: '理想のイメージ画像を集めて眺め、モチベーションを保つ。' },
    { energy: 'mental', title: 'アファメーション', detail: '「私は回復しつつある」と唱え、精神を保つ。' },
    { energy: 'emotional', title: '好きな動画を見る', detail: 'お笑いや動物の動画など、頭を使わず笑えるコンテンツを見る。' },
    { energy: 'emotional', title: '友人との通話', detail: '気の置けない友人と中身のない雑談をする。' },
    { energy: 'intellectual', title: '判断の保留', detail: '重要な決断は「元気になってから」とする。' },
    { energy: 'intellectual', title: '自然音BGM', detail: '川のせせらぎや雨音などで脳を休める。' },
  ],
  "P_Low_M_Low_E_High_I_High": [
    { energy: 'physical', title: '散歩・ウォーキング', detail: '10分だけで外に出て身体を動かす。' },
    { energy: 'physical', title: '姿勢を正す', detail: '背筋を伸ばして座り、呼吸を深くする。' },
    { energy: 'mental', title: '小さな目標設定', detail: '必ず達成できる小さな目標を立てる。' },
    { energy: 'mental', title: '誰かの応援', detail: '他人を応援して活力を得る。' },
    { energy: 'emotional', title: '若者との交流', detail: 'エネルギーのある人と接し熱量に触れる。' },
    { energy: 'emotional', title: 'ユーモアを探す', detail: '日常の些細な出来事を面白がる。' },
    { energy: 'intellectual', title: '知識の伝承', detail: '得た知識をブログ等で発信する。' },
    { energy: 'intellectual', title: '新しい技術の体験', detail: '最近のアプリやAIを触って知的刺激を得る。' },
  ],
  "P_High_M_High_E_Low_I_Low": [
    { energy: 'physical', title: '単純作業への没頭', detail: '掃除や皿洗いなど、頭を使わず体を動かす作業でリズムを作る。' },
    { energy: 'physical', title: '冷水での洗顔', detail: '冷たい刺激で頭と感情を冷やす。' },
    { energy: 'mental', title: '義務感の手放し', detail: '「〜ねばならない」を禁句にして肩の荷を降ろす。' },
    { energy: 'mental', title: '目的のシンプル化', detail: '今日はただこれをする、に目的を絞る。' },
    { energy: 'emotional', title: '怒りのゴミ箱', detail: '不満を紙に書き破って捨てる。' },
    { energy: 'emotional', title: '一人の時間', detail: '衝突を避け物理的に距離を置く。' },
    { energy: 'intellectual', title: 'リストの破棄', detail: '膨大なToDoを一旦白紙に戻す。' },
    { energy: 'intellectual', title: '3行日記', detail: '事実だけを淡々と3行で記録する。' },
  ],
  "P_High_M_Low_E_Low_I_High": [
    { energy: 'physical', title: 'アーシング', detail: '裸足で芝生や海辺を歩き自然と接続する。' },
    { energy: 'physical', title: '美食体験', detail: '本当に美味しい食事をゆっくり味わう。' },
    { energy: 'mental', title: '「Why」の深掘り', detail: '作業を止め「そもそも自分は何がしたかった？」と問う。' },
    { energy: 'mental', title: '芸術鑑賞', detail: '映画や美術館で効率とは無縁の「美」に触れる。' },
    { energy: 'emotional', title: '感情のラベリング', detail: '自分の感情に名前をつけて認める。' },
    { energy: 'emotional', title: '動物との触れ合い', detail: 'ペットカフェなどで理屈の通じない存在と過ごす。' },
    { energy: 'intellectual', title: '無駄な知識の探求', detail: '仕事に関係ない歴史や宇宙の話を楽しむ。' },
    { energy: 'intellectual', title: '手書きノート', detail: 'キーボードではなく手書きで脳の別部位を使う。' },
  ],
  "P_High_M_Low_E_High_I_Low": [
    { energy: 'physical', title: 'ヨガ・座禅', detail: '静止するポーズで動き回る身体を落ち着かせる。' },
    { energy: 'physical', title: '丁寧な深呼吸', detail: '4秒吸って8秒吐く呼吸法を行う。' },
    { energy: 'mental', title: '振り返りタイム', detail: '1日の終わりに「今日残ったものは何か」を振り返る。' },
    { energy: 'mental', title: '読書（静寂）', detail: '図書館や静かなカフェで静かに読む。' },
    { energy: 'emotional', title: '本音トーク', detail: '信頼できる人にだけ弱音や本音を話す。' },
    { energy: 'emotional', title: 'ソロ活', detail: '一人だけの映画や食事を楽しむ。' },
    { energy: 'intellectual', title: 'ニュース断ち', detail: '刺激的なSNSやニュースを見ない時間を作る。' },
    { energy: 'intellectual', title: '１分間瞑想', detail: '何も考えない時間を1分作る。' },
  ],
  "P_Low_M_Low_E_High_I_Low": [
    { energy: 'physical', title: '朝の散歩', detail: 'カーテンを開け日光を浴び少し動く。' },
    { energy: 'physical', title: '軽いストレッチ', detail: '寝転がったままでも良いので関節を伸ばす。' },
    { energy: 'mental', title: '幸せ日記', detail: '日常の小さな幸せを記録する。' },
    { energy: 'mental', title: '好きなことリスト', detail: '「やりたいこと」だけをリスト化する。' },
    { energy: 'emotional', title: '笑顔のキープ', detail: '鏡で笑顔を作り良好なメンタルを維持する。' },
    { energy: 'emotional', title: '感謝の手紙', detail: '余裕がある今こそ感謝を伝える。' },
    { energy: 'intellectual', title: '簡単なパズル', detail: '数独やクロスワードで脳を少し起こす。' },
    { energy: 'intellectual', title: '絵本や詩集', detail: '短い感性に訴える文章を読む。' },
  ],
  "P_Low_M_Low_E_Low_I_High": [
    { energy: 'physical', title: 'マインドフルネス', detail: '身体感覚に意識を向け思考を止める。' },
    { energy: 'physical', title: '温冷交代浴', detail: '温水と冷水を交互に浴び自律神経を刺激する。' },
    { energy: 'mental', title: '思考の棚上げ', detail: '悩みは明日考えると決める。' },
    { energy: 'mental', title: '「今ここ」への集中', detail: '目の前のお茶の味だけに集中する。' },
    { energy: 'emotional', title: 'ネガティブの受容', detail: '「辛くて当然だ」と受け入れる。' },
    { energy: 'emotional', title: '涙を流す', detail: '悲しい映画で意図的に泣きデトックスする。' },
    { energy: 'intellectual', title: '思考の書き出し', detail: 'ループする思考をノートに書き出す。' },
    { energy: 'intellectual', title: '単純な計算問題', detail: '答えが明確な問題で脳を切り替える。' },
  ],
  "P_High_M_Low_E_Low_I_Low": [
    { energy: 'physical', title: 'ハードワークアウト', detail: '筋トレやサンドバッグで有り余る体力を使い切る。' },
    { energy: 'physical', title: 'カラオケ熱唱', detail: '腹から声を出して歌いストレスを発散する。' },
    { energy: 'mental', title: 'ルーチン厳守', detail: '何も考えずに済む「いつもの手順」に従って動く。' },
    { energy: 'mental', title: '他人への貢献（肉体）', detail: '引っ越し等で体力を使うボランティアをする。' },
    { energy: 'emotional', title: '衝動のコントロール', detail: '買い物したくなったら15分待つルールを適用する。' },
    { energy: 'emotional', title: '映画で発散', detail: 'アクション映画で感情を消化する。' },
    { energy: 'intellectual', title: '思考停止の作業', detail: '草むしり等の単純作業に没頭する。' },
    { energy: 'intellectual', title: 'デジタル断食', detail: 'スマホ情報を遮断して入力をゼロにする。' },
  ],
  "P_Low_M_High_E_Low_I_Low": [
    { energy: 'physical', title: '完全休息', detail: '一切の活動を停止し泥のように眠る。' },
    { energy: 'physical', title: '栄養補助食品', detail: '元気がないときはゼリー飲料等で最低限の栄養補給をする。' },
    { energy: 'mental', title: '「諦める」決断', detail: '今は無理だと潔く認め、撤退・延期を決める。' },
    { energy: 'mental', title: '救難信号の発信', detail: '信頼できる人に助けを求める。' },
    { energy: 'emotional', title: '自己憐憫の許可', detail: '「かわいそうな自分」に浸る時間を許す。' },
    { energy: 'emotional', title: '孤独の確保', detail: '物理的に一人になる時間を作る。' },
    { energy: 'intellectual', title: 'スイッチ・オフ', detail: '仕事に関する思考を禁止する。' },
    { energy: 'intellectual', title: 'ぼーっとする', detail: '焚き火動画等で何も考えない時間を過ごす。' },
  ],
  "P_Low_M_Low_E_Low_I_Low": [
    { energy: 'physical', title: '生命維持', detail: 'とにかく寝る。起きたら水を飲む。' },
    { energy: 'physical', title: '深い呼吸', detail: 'ベッドの中でも深く息を吐ききることを意識する。' },
    { energy: 'mental', title: '自己受容', detail: '今は冬眠期間だから何もしなくていいと自分を許す。' },
    { energy: 'mental', title: '期待値ゼロ', detail: '自分に何の成果も期待しない。' },
    { energy: 'emotional', title: '安全基地の確保', detail: '布団や毛布にくるまり安心感を得る。' },
    { energy: 'emotional', title: '心地よい音', detail: 'オルゴールや自然音など優しい音を流す。' },
    { energy: 'intellectual', title: '情報遮断', detail: 'スマホの電源を切り外部情報をシャットアウトする。' },
    { energy: 'intellectual', title: '何もしない練習', detail: '焦燥感が湧いても「今は何もしないことが仕事」と言い聞かせる。' },
  ],
};

// パーソナリティ診断
export const PERSONALITY_QUESTIONS = [
  { id: 1, text: "疲れた週末は、家で一人で過ごすよりも、友人と出かけてパーッと発散したい。", dimension: "EI", direction: "positive" },
  { id: 2, text: "考え事をするときは、誰かに話しながら整理するほうが得意だ。", dimension: "EI", direction: "positive" },
  { id: 3, text: "大勢の人がいる交流会やパーティーに参加した後、ひどく疲れを感じて一人になりたくなる。", dimension: "EI", direction: "negative" },
  { id: 4, text: "ランチタイムは、同僚や友人と雑談しながら食べるほうがエネルギーが湧く。", dimension: "EI", direction: "positive" },
  { id: 5, text: "自分が注目の的になることは、プレッシャーというよりは快感だ。", dimension: "EI", direction: "positive" },

  { id: 6, text: "新しい家電やアプリを使うときは、まず説明書やチュートリアルを順に確認したい。", dimension: "SN", direction: "positive" },
  { id: 7, text: "話を聞くとき、具体的な事実よりも、背後の意味や可能性の方に興味がある。", dimension: "SN", direction: "negative" },
  { id: 8, text: "実現していない未来のアイデアを空想するより、目の前の現実的な課題を片付ける方が好きだ。", dimension: "SN", direction: "positive" },
  { id: 9, text: "道順を教えるときは、方角よりも目印で伝えることが多い。", dimension: "SN", direction: "positive" },
  { id: 10, text: "細かい詳細にこだわるあまり、全体の大きな流れを見落とすことがある。", dimension: "SN", direction: "positive" },

  { id: 11, text: "友人に悩みを相談されたら、共感よりも先に解決策を提案したくなる。", dimension: "TF", direction: "positive" },
  { id: 12, text: "重大な決断では、自分の気持ちよりも論理的な正しさを優先する。", dimension: "TF", direction: "positive" },
  { id: 13, text: "議論の場では、誰かの感情を害してでも真実をはっきりさせるべきだと思う。", dimension: "TF", direction: "positive" },
  { id: 14, text: "人を評価するときは、成果よりも努力や貢献心を重視したい。", dimension: "TF", direction: "negative" },
  { id: 15, text: "公平とは同じルールを適用することだと思う。", dimension: "TF", direction: "positive" },

  { id: 16, text: "仕事は余裕を持って前倒しで終わらせたい。", dimension: "JP", direction: "positive" },
  { id: 17, text: "旅行のプランはきっちり決めず、その日の気分で決めるのが好きだ。", dimension: "JP", direction: "negative" },
  { id: 18, text: "部屋やデスクが整理されていないと落ち着かない。", dimension: "JP", direction: "positive" },
  { id: 19, text: "予定が急に変更になってもむしろ楽しめる柔軟性がある。", dimension: "JP", direction: "negative" },
  { id: 20, text: "物事はなるべく早く結論を出してスッキリしたい。", dimension: "JP", direction: "positive" },
];

export const PERSONALITY_RATING_OPTIONS = [
  { value: 1, label: "全く違う" },
  { value: 2, label: "ちょっと違う" },
  { value: 3, label: "どちらでもない" },
  { value: 4, label: "ややそう思う" },
  { value: 5, label: "強くそう思う" },
];

export const PERSONALITY_TYPE_MAP: Record<string, { name: string; description: string; habits?: string[] }> = {
  "INTJ": { name: "孤高の設計者 (INTJ)", description: "長期的視点でシステムを設計する戦略家。", habits: ["週次の戦略レビュー","静かな集中タイム"] },
  "INTP": { name: "理論を紡ぐ思索家 (INTP)", description: "概念や仕組みを深掘りする探究者。", habits: ["読書ログを残す","少しのメモ習慣"] },
  "ENTJ": { name: "戦略家の指導者 (ENTJ)", description: "ビジョンを描き、組織を動かすタイプ。", habits: ["目標を1週間単位で設定","週次レビュー"] },
  "ENTP": { name: "アイデアの発火者 (ENTP)", description: "発想豊かで議論を楽しむイノベーター。", habits: ["アイデアノートを持つ","小さな実験をする"] },
  "INFJ": { name: "洞察の導師 (INFJ)", description: "深い洞察と共感で価値ある導きをする。", habits: ["深掘りの時間を確保","ビジョンノートを作る"] },
  "INFP": { name: "価値を追う理想主義者 (INFP)", description: "内面の価値観に忠実な創造者。", habits: ["気持ちを言語化する習慣","価値リストを作る"] },
  "ENFJ": { name: "人を導く共感者 (ENFJ)", description: "人の成長を助けるカリスマタイプ。", habits: ["誰かの成長を記録する","感情を言語化する時間"] },
  "ENFP": { name: "熱量の伝道師 (ENFP)", description: "情熱的で可能性を追い求めるムードメーカー。", habits: ["新しい趣味を月1で試す","感情日記をつける"] },
  "ISTJ": { name: "堅実な守護者 (ISTJ)", description: "責任感が強く、信頼される実務家。", habits: ["ルーチンタスクを固定化","定期バックアップを習慣化"] },
  "ISTP": { name: "冷静な職人 (ISTP)", description: "問題解決に強く、柔軟に動く職人気質。", habits: ["手を動かす時間を作る","短期的な目標を立てる"] },
  "ISFJ": { name: "献身的な支援者 (ISFJ)", description: "周囲を支える安定の存在。", habits: ["身近な人へ小さな気遣いを","睡眠ルーチンを整える"] },
  "ISFP": { name: "静かな美の探求者 (ISFP)", description: "感性に従い心地よさを追求するタイプ。", habits: ["自然に触れる時間を持つ","クリエイティブな短時間習慣"] },
  "ESTJ": { name: "組織の指揮者 (ESTJ)", description: "現実的で秩序を重んじ、責任感が強いタイプ。", habits: ["予定表に必ず目を通す","小さなデッドラインを作る"] },
  "ESFJ": { name: "世話好きの世論家 (ESFJ)", description: "人の気持ちに敏感でチームで力を発揮する。", habits: ["感謝を伝える習慣","小さな褒めノート"] },
  "ESTP": { name: "行動の達人 (ESTP)", description: "即断即決で実行力のある冒険家タイプ。", habits: ["短時間の集中ワークを取り入れる","身体を動かす習慣を作る"] },
  "ESFP": { name: "場を盛り上げるパフォーマー (ESFP)", description: "陽気でライブ感を楽しむタイプ。", habits: ["週に1回は友人と会う","短い創作を試す"] },
};

export const PERSONALITY_IMAGE_MAP: Record<string, string> = {
  INTJ: '1_INTJ.png',
  INTP: '2_INTP.png',
  ENTJ: '3_ENTJ.png',
  ENTP: '4_ENTP.png',
  INFJ: '5_INFJ.png',
  INFP: '6_INFP.png',
  ENFJ: '7_ENFJ.png',
  ENFP: '8_ENFP.png',
  ISTJ: '9_ISTJ.png',
  ISFJ: '10_ISFJ.png',
  ESTJ: '11_ESTJ.png',
  ESFJ: '12_ESFJ.png',
  ISTP: '13_ISTP.png',
  ISFP: '14_ISFP.png',
  ESTP: '15_ESTP.png',
  ESFP: '16_ESFP.png',
};

export const PERSONALITY_HABITS: Record<string, { energy: 'physical' | 'mental' | 'emotional' | 'intellectual'; title: string; detail: string }[]> = {
  INTJ: [
    { energy: 'physical', title: '1. 視覚情報の遮断', detail: 'アイマスクや耳栓を使い、五感からの入力を完全に断つ時間を10分作る。' },
    { energy: 'physical', title: '2. ソロ・ウォーキング', detail: '誰もいないルートを選び、歩行のリズムだけで思考を整理する。' },
    { energy: 'mental', title: '3. ビジョン・スクリプティング', detail: '5年後、10年後の理想の状態をノートに書き出し、現在地とのズレを確認する。' },
    { energy: 'mental', title: '4. 完全なる孤独タイム', detail: '家族や連絡から離れ、「誰の期待にも応えなくていい時間」を確保する。' },
    { energy: 'emotional', title: '5. 感情のロジック分析', detail: 'モヤモヤする感情に対し「なぜそう感じるか」を分析し、名前をつける。' },
    { energy: 'emotional', title: '6. 高品質な芸術鑑賞', detail: '複雑なクラシック音楽や映画を一人で鑑賞し、内的な感性を潤す。' },
    { energy: 'intellectual', title: '7. 戦略シミュレーション', detail: 'チェスや戦略ゲーム、または事業計画など、正解のない複雑なパズルを解く。' },
    { energy: 'intellectual', title: '8. 専門書の多読', detail: '興味のある分野の専門書を読み込み、知識の体系をアップデートする。' },
  ],
  INTP: [
    { energy: 'physical', title: '1. パワーナップ（仮眠）', detail: '脳のオーバーヒートを防ぐため、15〜20分の短い仮眠をとって再起動する。' },
    { energy: 'physical', title: '2. 糖分と水分の補給', detail: '没頭しすぎて忘れがちな水分とブドウ糖を、タイマーをかけて摂取する。' },
    { energy: 'mental', title: '3. 「Why」の探求', detail: '世の中の常識に対し「なぜ？」と問いかけ、独自の仮説を立てて楽しむ。' },
    { energy: 'mental', title: '4. デジタル・デトックス', detail: '情報の洪水を遮断し、自分の脳内にある思考だけで遊ぶ時間を持つ。' },
    { energy: 'emotional', title: '5. 感情の数値化', detail: '今のストレス度や幸福度を0-100で数値化し、客観的に自分を観察する。' },
    { energy: 'emotional', title: '6. 皮肉やユーモアの記録', detail: '面白いと感じた皮肉やジョークをメモし、自分だけの面白がり方をする。' },
    { energy: 'intellectual', title: '7. Wikipediaサーフィン', detail: '目的なく次々とリンクを飛び、無関係な知識同士を繋げる遊びをする。' },
    { energy: 'intellectual', title: '8. プロトタイピング', detail: '完璧を目指さず、思いついたアイデアの骨子だけを書き出してみる。' },
  ],
  ENTJ: [
    { energy: 'physical', title: '1. 高強度インターバルトレーニング', detail: '短時間で限界まで追い込むHIITなどで、闘争心と身体機能を高める。' },
    { energy: 'physical', title: '2. 睡眠の質計測', detail: '睡眠アプリでスコアを管理し、休息さえも「攻略すべきタスク」にする。' },
    { energy: 'mental', title: '3. 目標達成リストの消し込み', detail: 'その日完了したタスクを眺め、「今日も前進した」という達成感を味わう。' },
    { energy: 'mental', title: '4. 勝利のイメージトレーニング', detail: 'プレゼンや交渉で成功している自分の姿を、鮮明に脳内でリハーサルする。' },
    { energy: 'emotional', title: '5. 信頼できる参謀との対話', detail: '弱みを見せられる数少ない相手と話し、張り詰めた気を緩める。' },
    { energy: 'emotional', title: '6. 怒りのエネルギー変換', detail: 'イライラを「行動の燃料」と捉え直し、課題解決のパワーに変える。' },
    { energy: 'intellectual', title: '7. 効率化ハックの導入', detail: 'ショートカットキーや自動化ツールを学び、作業時間を1秒でも短縮する。' },
    { energy: 'intellectual', title: '8. ディベート（議論）', detail: 'ニュースや課題について誰かと議論し、自分の論理の鋭さを確認する。' },
  ],
  ENTP: [
    { energy: 'physical', title: '1. 新しいルートの開拓', detail: '通勤や散歩でいつもと違う道を通り、視覚的な刺激を脳に入れる。' },
    { energy: 'physical', title: '2. アドラブ・エクササイズ', detail: 'ダンスやボルダリングなど、即興的な動きが求められる運動をする。' },
    { energy: 'mental', title: '3. 「もしも」の妄想', detail: '「もし自分が大統領なら」など、非現実的な思考実験をしてワクワクする。' },
    { energy: 'mental', title: '4. 逆張り思考', detail: '世の中の流行の逆を行くアイデアを考え、自分のユニークさを確認する。' },
    { energy: 'emotional', title: '5. 友人とのブレスト', detail: '否定せずにアイデアを広げ合う会話を楽しみ、高揚感をチャージする。' },
    { energy: 'emotional', title: '6. ユーモアのシェア', detail: '面白い動画やネタをSNSでシェアし、反応をもらって承認欲求を満たす。' },
    { energy: 'intellectual', title: '7. マルチタスク・ジャグリング', detail: 'あえて複数のプロジェクトを並行して進め、脳をフル回転させる。' },
    { energy: 'intellectual', title: '8. 新技術のつまみ食い', detail: '流行りのAIやガジェットを触り、深く学ぶ前に「何ができるか」だけ把握する。' },
  ],
  INFJ: [
    { energy: 'physical', title: '1. 聖域（自室）の整頓', detail: '自分の部屋を完璧に美しく整え、視覚的なノイズを消して安心感を得る。' },
    { energy: 'physical', title: '2. ヨガ・ストレッチ', detail: '深い呼吸と共に身体を動かし、内側に溜まった他人の感情を排出する。' },
    { energy: 'mental', title: '3. 内省ジャーナリング', detail: '誰にも見せないノートに、ドロドロした感情も含めて全て書き出す。' },
    { energy: 'mental', title: '4. シンボルの探索', detail: '夢占いやタロット、象徴的な画像などから、人生のヒントを読み解く。' },
    { energy: 'emotional', title: '5. ワン・オン・ワンの深い会話', detail: '大勢ではなく、一人の友人と人生観について深く語り合う。' },
    { energy: 'emotional', title: '6. 境界線（バウンダリー）の確認', detail: '「ここまではやる、これ以上はやらない」と心の境界線を再設定する。' },
    { energy: 'intellectual', title: '7. 人間心理の学習', detail: '心理学や哲学の本を読み、なぜ人はそう動くのかを体系的に理解する。' },
    { energy: 'intellectual', title: '8. メタファー思考', detail: '複雑な事象を「まるで〇〇のようだ」と比喩を使って捉え直す。' },
  ],
  INFP: [
    { energy: 'physical', title: '1. 自然の中での散策', detail: '公園や森など、自然の音や空気に触れて、消耗したエネルギーを補給する。' },
    { energy: 'physical', title: '2. 心地よい素材に包まれる', detail: '肌触りの良いブランケットや衣服を選び、触覚から安心感を得る。' },
    { energy: 'mental', title: '3. 物語への没入', detail: 'ファンタジー小説や映画の世界に入り込み、現実の重力から解放される。' },
    { energy: 'mental', title: '4. 美的コレクション', detail: '気に入った石、ポストカード、画像などを集め、自分だけの世界観を作る。' },
    { energy: 'emotional', title: '5. 創作活動（アート・執筆）', detail: '上手下手に関わらず、内なる感情を絵や詩、文章にして外に出す。' },
    { energy: 'emotional', title: '6. 涙活（るいかつ）', detail: '泣ける映画や音楽をあえて選び、涙を流して感情をデトックスする。' },
    { energy: 'intellectual', title: '7. 語学・文化の学習', detail: '遠い異国の言葉や文化を学び、世界には多様な価値観があることを知る。' },
    { energy: 'intellectual', title: '8. 独自の価値観リスト作成', detail: '「自分が大切にしたいこと」をリストアップし、自分軸を再確認する。' },
  ],
  ENFJ: [
    { energy: 'physical', title: '1. グループスポーツ', detail: 'チームで協力するスポーツや活動に参加し、一体感を感じながら汗を流す。' },
    { energy: 'physical', title: '2. リラクゼーションスパ', detail: 'マッサージやサウナに行き、常に他人に使いすぎている神経を緩める。' },
    { energy: 'mental', title: '3. 感謝の手紙を書く', detail: 'お世話になった人に感謝のメッセージを送り、ポジティブな循環を作る。' },
    { energy: 'mental', title: '4. メンター活動', detail: '誰かの相談に乗ったり、後輩を指導したりして、人の成長に関わる。' },
    { energy: 'emotional', title: '5. 共感サークルへの参加', detail: '否定のないコミュニティで、自分の悩みも受け止めてもらう体験をする。' },
    { energy: 'emotional', title: '6. ネガティブ感情の許可', detail: '「リーダーとして振る舞わなくていい」と自分に言い聞かせ、弱音を吐く。' },
    { energy: 'intellectual', title: '7. 組織マネジメントの学習', detail: '人を動かす心理学や、チームビルディングの理論を学ぶ。' },
    { energy: 'intellectual', title: '8. 未来のイベント企画', detail: 'みんなが喜ぶパーティーや旅行の計画を立て、詳細を詰めてワクワクする。' },
  ],
  ENFP: [
    { energy: 'physical', title: '1. ダンス・リズム運動', detail: '音楽に合わせて自由に体を動かし、身体的な拘束感を解き放つ。' },
    { energy: 'physical', title: '2. 未体験の食事', detail: '食べたことのないエスニック料理などを試し、味覚から冒険する。' },
    { energy: 'mental', title: '3. ドリームマップ作成', detail: 'やりたいこと、行きたい場所の写真をコラージュし、夢を可視化する。' },
    { energy: 'mental', title: '4. 自由な放浪', detail: '行き先を決めずに電車に乗ったり、街を歩いたりして、偶然の出会いを楽しむ。' },
    { energy: 'emotional', title: '5. 「好き」の表明', detail: '好きな人やモノに対し、情熱的に愛や感謝を伝えてエネルギーを回す。' },
    { energy: 'emotional', title: '6. 感情のシェアリング', detail: '嬉しいことも悲しいことも、友人に実況中継のように話してスッキリする。' },
    { energy: 'intellectual', title: '7. アイデア・ブレスト', detail: '実現可能性を無視して「こんなのがあったら最高」というアイデアを出し切る。' },
    { energy: 'intellectual', title: '8. 新しい趣味の着手', detail: '飽きてもいい前提で、全く新しいジャンルの習い事や勉強を始めてみる。' },
  ],
  ISTJ: [
    { energy: 'physical', title: '1. ルーチン・ワークアウト', detail: '毎日同じ時間に同じメニューの筋トレを行い、身体のリズムを整える。' },
    { energy: 'physical', title: '2. 整理整頓と清掃', detail: '身の回りの埃を払い、物を定位置に戻す作業で精神を安定させる。' },
    { energy: 'mental', title: '3. 実績の振り返り', detail: '過去に積み上げてきた成果やデータを眺め、自分の確実な歩みを確認する。' },
    { energy: 'mental', title: '4. 静寂な一人時間', detail: '誰にも邪魔されない静かな部屋で、趣味や作業に没頭し充電する。' },
    { energy: 'emotional', title: '5. 伝統や季節行事の実践', detail: '季節のイベントやお祝い事を手順通りに行い、安心感と繋がりを感じる。' },
    { energy: 'emotional', title: '6. 信頼できる人との定例会', detail: '長い付き合いの友人と、いつもと同じ店で穏やかに食事をする。' },
    { energy: 'intellectual', title: '7. スケジュール最適化', detail: '手帳やアプリで翌週の計画を綿密に立て、不確定要素を排除する。' },
    { energy: 'intellectual', title: '8. データの整理と分類', detail: 'PC内のファイル整理や家計簿の集計など、情報を体系化してスッキリする。' },
  ],
  ISFJ: [
    { energy: 'physical', title: '1. 温かい飲み物と休息', detail: 'ハーブティーなどをゆっくり飲み、身体を芯から温めて緊張をほぐす。' },
    { energy: 'physical', title: '2. 丁寧な料理', detail: 'レシピ通りに丁寧に料理を作り、五感を使いながら秩序ある作業を楽しむ。' },
    { energy: 'mental', title: '3. 思い出のアルバム整理', detail: '過去の楽しい写真や手紙を見返し、愛されている実感に浸る。' },
    { energy: 'mental', title: '4. 日記をつける', detail: '日々の出来事や感じたことを記録し、自分だけの歴史を大切にする。' },
    { energy: 'emotional', title: '5. ギフト選び', detail: '大切な人の喜ぶ顔を想像しながら、プレゼントや手紙を用意する。' },
    { energy: 'emotional', title: '6. 「No」と言う練習', detail: '自分のキャパシティを守るため、小さな頼み事を断るシミュレーションをする。' },
    { energy: 'intellectual', title: '7. 手順書の作成', detail: '自分がやっている作業の完璧なマニュアルを作り、誰かの役に立つ準備をする。' },
    { energy: 'intellectual', title: '8. 実用的な知識の習得', detail: '健康法や節約術など、今の生活ですぐに役立つ確実な知識を学ぶ。' },
  ],
  ESTJ: [
    { energy: 'physical', title: '1. 規律ある早起き', detail: '毎朝決まった時間に起き、朝日を浴びて体内時計をセットする。' },
    { energy: 'physical', title: '2. 競争的なスポーツ', detail: 'ゴルフやテニスなど、スコアや勝敗が明確に出るスポーツで発散する。' },
    { energy: 'mental', title: '3. ToDoリストの完全消化', detail: 'リストアップしたタスクを全て線で消し込み、完了の快感を味わう。' },
    { energy: 'mental', title: '4. 社会的役割の確認', detail: '所属するコミュニティでの自分の役職・責任を再認識する。' },
    { energy: 'emotional', title: '5. チームへの労い', detail: '共に働く仲間や家族に具体的に感謝や称賛を伝える。' },
    { energy: 'emotional', title: '6. 伝統的な社交', detail: '冠婚葬祭や地域の行事にしっかりと参加し、社会的な絆を確認する。' },
    { energy: 'intellectual', title: '7. プロセス改善の立案', detail: '無駄な会議や作業を見つけ出し、より効率的なフロー図を作成する。' },
    { energy: 'intellectual', title: '8. ルールや法律の学習', detail: '組織の規定や法律を学び、正当な根拠を持って判断できるようにする。' },
  ],
  ESFJ: [
    { energy: 'physical', title: '1. 友人とのお茶・食事', detail: '誰かと食事を共にすることでエネルギーを摂取する。' },
    { energy: 'physical', title: '2. お揃いのファッション', detail: '仲間や家族とドレスコードを合わせ、一体感を楽しむ。' },
    { energy: 'mental', title: '3. おもてなしの計画', detail: 'ホームパーティーやイベントを企画し、みんなが喜ぶ顔を想像して準備する。' },
    { energy: 'mental', title: '4. 感謝される体験', detail: 'ボランティアや手伝いで直接「ありがとう」と言われる行動をする。' },
    { energy: 'emotional', title: '5. グループチャットでの交流', detail: 'SNSやチャットでスタンプを送り合い、常に誰かと繋がっている安心感を得る。' },
    { energy: 'emotional', title: '6. 悩み相談に乗る', detail: '人の話を聞き、共感して励ますことで自分の有用感も高める。' },
    { energy: 'intellectual', title: '7. 人脈マップの整理', detail: '知り合いの誕生日や好みをリスト化し、気配りの漏れがないようにする。' },
    { energy: 'intellectual', title: '8. トレンド情報の収集', detail: '話題の店やニュースをチェックし、会話のネタとしてストックする。' },
  ],
  ISTP: [
    { energy: 'physical', title: '1. アドレナリン系スポーツ', detail: 'サーフィンやバイクなど、瞬時の判断と身体操作が必要な活動。' },
    { energy: 'physical', title: '2. 工具・道具の手入れ', detail: '愛用の道具やガジェットを分解・清掃・メンテナンスする。' },
    { energy: 'mental', title: '3. ソロ・キャンプ/活動', detail: '誰にも指図されない環境で自分のサバイバル能力だけで過ごす。' },
    { energy: 'mental', title: '4. 効率化の追求', detail: '日常の動作や作業において「いかに楽をして最大効果を出すか」を極める。' },
    { energy: 'emotional', title: '5. 動物との触れ合い', detail: '言葉不要の動物と過ごし、無条件の受容を感じる。' },
    { energy: 'emotional', title: '6. 怒りの物理的発散', detail: 'サンドバッグを叩くなど物理的な衝撃でストレスを解消する。' },
    { energy: 'intellectual', title: '7. 仕組みの分解・解析', detail: '機械やコードの動作を分解して構造を理解する。' },
    { energy: 'intellectual', title: '8. トラブルシューティング', detail: '壊れたものを修理したり、バグを直したりする問題解決を楽しむ。' },
  ],
  ISFP: [
    { energy: 'physical', title: '1. アロマ・入浴', detail: '香りの良い入浴剤やキャンドルで嗅覚と触覚を甘やかす。' },
    { energy: 'physical', title: '2. クラフト・手作業', detail: '陶芸や手芸など、自分の手で何かを作り出す時間を持つ。' },
    { energy: 'mental', title: '3. 美しい景色の鑑賞', detail: '夕焼けや星空など、二度と同じ瞬間がない風景を静かに眺める。' },
    { energy: 'mental', title: '4. 「今」に集中する', detail: 'コーヒーの味や風の音だけを感じ、「今ここ」に集中する練習をする。' },
    { energy: 'emotional', title: '5. 言葉にしない自己表現', detail: 'ファッションやインテリアを変えて、今の自分の気分を表現する。' },
    { energy: 'emotional', title: '6. 批判からの退避', detail: '批判的な人や競争的な場から離れ、自分が肯定される世界に逃げる。' },
    { energy: 'intellectual', title: '7. アートの模写・観察', detail: '好きな絵やデザインを細部まで観察し、なぜ美しいのかを理解する。' },
    { energy: 'intellectual', title: '8. 自由な時間割', detail: '何時に何をするか決めず、その瞬間の直感に従って動く。' },
  ],
  ESTP: [
    { energy: 'physical', title: '1. 筋トレ・格闘技', detail: '自分の肉体の限界に挑み、強くなっていくプロセスを感じる。' },
    { energy: 'physical', title: '2. ドライブ・ツーリング', detail: 'スピード感を感じながら移動し、次々と変わる景色を脳に送り込む。' },
    { energy: 'mental', title: '3. リスクテイク', detail: 'あえて難易度の高い仕事や勝負事に挑み、緊張感を楽しむ。' },
    { energy: 'mental', title: '4. 即断即決', detail: '迷ったら「やる」と決め、行動しながら考えるスタイルを貫く。' },
    { energy: 'emotional', title: '5. 仲間とのバカ騒ぎ', detail: '気を使わない仲間と飲みに行き、豪快に笑う。' },
    { energy: 'emotional', title: '6. ストレートな感情表現', detail: '思ったことはその場で率直に伝え、溜め込まずにスッキリさせる。' },
    { energy: 'intellectual', title: '7. 交渉・駆け引き', detail: '相手の反応を見て条件を変える生きた交渉ゲームを行う。' },
    { energy: 'intellectual', title: '8. 実践的スキルの習得', detail: '実際に手を動かしながら新しい技術やコツを体得する。' },
  ],
  ESFP: [
    { energy: 'physical', title: '1. ダンス・カラオケ', detail: '人前で歌ったり踊ったりして、身体全体でエネルギーを放射する。' },
    { energy: 'physical', title: '2. ファッションショー', detail: 'クローゼットの服を着回し、鏡の前で一番輝く自分を確認してテンションを上げる。' },
    { energy: 'mental', title: '3. サプライズの計画', detail: '誰かを驚かせる計画を立て、その瞬間のリアクションを想像して楽しむ。' },
    { energy: 'mental', title: '4. 楽しい予定を入れる', detail: 'カレンダーに遊びの予定を詰め込み、「楽しみ」で埋め尽くす。' },
    { energy: 'emotional', title: '5. 「いいね」の収集', detail: 'SNSに自撮りや楽しい写真をアップし、反応をもらって愛されていると実感する。' },
    { energy: 'emotional', title: '6. 共感的な愚痴大会', detail: '友人と集まって「わかる〜！」と言い合い、ネガティブな感情を笑い飛ばす。' },
    { energy: 'intellectual', title: '7. ライブ配信・実況', detail: '体験や考えをリアルタイムで言葉にし、即興で観客を楽しませる。' },
    { energy: 'intellectual', title: '8. 体験型ワークショップ', detail: '料理教室やアート体験など、理屈抜きで「楽しい」と思える場に参加する。' },
  ],
};

// purelife診断
export const PURELIFE_CATEGORIES = [
  { key: 'status', label: '状態 (Energy Status)' },
  { key: 'self', label: '自己理解 (Core Compass)' },
  { key: 'vision', label: '行く先 (Future Vision)' },
  { key: 'action', label: '行動 (Daily Action)' },
];

export const PURELIFE_QUESTIONS: { id: string; category: string; text: string }[] = [
  // 状態 1-5
  { id: 'q1', category: 'status', text: '自分にやさしい気持ちで過ごせている' },
  { id: 'q2', category: 'status', text: 'ありのままの自分を受け止められている' },
  { id: 'q3', category: 'status', text: '「ありがとう」の気持ちで日々を過ごせている' },
  { id: 'q4', category: 'status', text: '「まあ、なんとかなるな」と思えている' },
  { id: 'q5', category: 'status', text: '心身が活力に満ちている' },
  // 自己理解 6-10
  { id: 'q6', category: 'self', text: '自分の人生にとって大切な価値観を理解している' },
  { id: 'q7', category: 'self', text: '自分の人生にとって幸せが何かを理解している' },
  { id: 'q8', category: 'self', text: '自分のやりたいことが明確になっている' },
  { id: 'q9', category: 'self', text: '自分の強みを理解している' },
  { id: 'q10', category: 'self', text: '自分の強みを使えている' },
  // 行く先 11-15
  { id: 'q11', category: 'vision', text: '近い未来の自分にとって、ありたい・なりたい方向が明確になっている' },
  { id: 'q12', category: 'vision', text: '自分にとって最高のありたい・なりたい方向が明確になっている' },
  { id: 'q13', category: 'vision', text: '大事でない「手放すこと」が見えている' },
  { id: 'q14', category: 'vision', text: '手放すことを決められている' },
  { id: 'q15', category: 'vision', text: '感性を磨くテーマを見つけられている' },
  // 行動 16-20
  { id: 'q16', category: 'action', text: 'ありたい方向に日々意識を向けられている' },
  { id: 'q17', category: 'action', text: 'ありたい方向に日々時間を使っている' },
  { id: 'q18', category: 'action', text: '大事でないことを手放している' },
  { id: 'q19', category: 'action', text: '感性を磨くことを日常に取り入れられている' },
  { id: 'q20', category: 'action', text: '日々振り返りができている' },
];

export const PURELIFE_ADVICE: Record<string, string[]> = {
  status: [
    "ポジティブ・チェックアウト：寝る前に「今日あった良かったこと」3つを書く",
    "セルフハグの儀式：鏡の前で自分を抱きしめて労う",
    "デジタル・デトックス：就寝1時間前はスマホを触らない",
    "6分間仮眠：短時間で脳をリフレッシュする仮眠を取り入れる",
    "五感のヒーリング：香り・音・触感でリラックスを作る",
    "「No」と言う練習：無理な誘いを断り自分時間を確保する",
    "太陽光チャージ：朝カーテンを開け1分間光を浴びる",
    "感情の書き出し：不安や怒りを紙に書いて外に出す",
    "ホットドリンク習慣：白湯やハーブティーを味わう時間を作る",
    "何もしない5分間：ぼーっとする空白を意図的に作る"
  ],
  self: [
    "価値観の宝探し：過去の経験から大事にしている価値を抽出する",
    "強みログ：褒められたことや成功体験を記録する",
    "最高の休日妄想：理想の1日を細かく書いて可視化する",
    "嫉妬分析：嫉妬の対象から自分の願望を見つける",
    "子供時代リマインド：熱中していたことを思い出す",
    "褒められノート：他人の評価を定期的に読み返す",
    "嫌いリスト作成：やりたくないことを明確化する",
    "感情ラベリング：モヤモヤに名前をつけ言語化する",
    "推し分析：惹かれる人の特徴から価値観を逆算する",
    "自分へのインタビュー：親友にするように自分へ問いかける"
  ],
  vision: [
    "理想の自分スクラップ：画像で視覚化してボードを作る",
    "断捨離リスト：不要なものを3つ手放す候補にする",
    "感性アンテナ：本屋やPinterestで直感的に気になるものを収集する",
    "ロールモデル研究：憧れの人の思考や行動を学ぶ",
    "10年後の手紙：理想の自分から今の自分へ手紙を書く",
    "バケットリスト作成：実現したいことを数多く書き出す",
    "アンチ・ビジョン作成：避けたい未来を書いて逆算する",
    "普段行かない場所へ行く：新しい刺激で視野を広げる",
    "直感トレーニング：即決で選ぶ練習を日常に取り入れる",
    "会いたい人に会う：理想の空気感に触れる機会を作る"
  ],
  action: [
    "10分間アクション：1日10分だけ行動を習慣化する",
    "やらないこと宣言：目的に無関係な活動を1つやめる",
    "プチ振り返り：今日の行動を〇△×で記録する",
    "2分ルール実行：2分で終わるタスクは即処理する",
    "ベビーステップ化：着手しやすい最小アクションに分解する",
    "環境デザイン：行動を起こしやすい配置にする",
    "If-Thenプラン：既存習慣に紐づけて実行率を上げる",
    "公開コミット：人前で宣言してやる気を高める",
    "小さなご褒美設定：完了の報酬を用意する",
    "完了主義：完璧でなく終わらせることを優先する"
  ],
};