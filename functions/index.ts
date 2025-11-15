const functions = require('firebase-functions');
const admin = require('firebase-admin');
const webpush = require('web-push');

admin.initializeApp();
const db = admin.firestore();

// VAPID: firebase functions config に設定してください
// firebase functions:config:set vapid.public_key="..." vapid.private_key="..."
const VAPID_PUBLIC = functions.config().vapid?.public_key;
const VAPID_PRIVATE = functions.config().vapid?.private_key;
if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.warn('VAPID keys not set in functions config. Set with: firebase functions:config:set vapid.public_key="..." vapid.private_key="..."');
} else {
  webpush.setVapidDetails('mailto:your-email@example.com', VAPID_PUBLIC, VAPID_PRIVATE);
}

// helper: 現在時刻（UTC）から "HH:MM" 形式取得。必要ならタイムゾーン変換を実装してください。
function nowHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// 毎分実行（例）。負荷軽減のため実運用では Cloud Scheduler + バッチ処理にすることを推奨。
exports.sendScheduledNotifications = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.log('Skipping push: no vapid keys');
    return null;
  }
  const targetTime = nowHHMM();
  console.log('Checking notifications for', targetTime);

  // クエリ: users を走査（注意: 大規模なら別設計）
  const usersSnap = await db.collection('users').get();
  const promises = [];
  usersSnap.forEach(userDoc => {
    const uid = userDoc.id;
    // ユーザー内 habits サブコレクション に notificationTimeフィールドを期待 ("HH:MM")
    promises.push((async () => {
      try {
        const habitsSnap = await db.collection('users').doc(uid).collection('habits').get();
        const matched = [];
        habitsSnap.forEach(hDoc => {
          const h = hDoc.data();
          if (h?.notificationTime === targetTime) matched.push(h);
        });
        if (matched.length === 0) return;
        // get subscriptions
        const subsSnap = await db.collection('users').doc(uid).collection('pushSubscriptions').get();
        const subs = subsSnap.docs.map(d => d.data());
        if (subs.length === 0) return;
        // send per subscription
        const payload = {
          title: '習慣リマインダー',
          body: `「${matched[0].name || '習慣'}」の時間です。続けましょう！`,
          url: '/', // deep link 可
        };
        await Promise.all(subs.map(s => {
          const pushSubscription = {
            endpoint: s.endpoint,
            keys: s.keys
          };
          return webpush.sendNotification(pushSubscription, JSON.stringify(payload)).catch(err => {
            console.error('Push send error', err);
            // optionally remove invalid subscription
          });
        }));
      } catch (e) {
        console.error('per-user notification error', e);
      }
    })());
  });
  await Promise.all(promises);
  return null;
});