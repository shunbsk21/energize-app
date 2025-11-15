import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as webpush from 'web-push';

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

// helper: 現在時刻（サーバー側ローカル時刻）から "HH:MM" 形式取得。
// 必要ならタイムゾーン処理を追加してください。
function nowHHMM(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// 毎分実行（例）
// 注意: 実運用ではスケーリングやタイムゾーン、負荷対策（バッチ化）を検討してください。
export const sendScheduledNotifications = functions
  .pubsub
  .schedule('every 1 minutes')
  .onRun(async (context: functions.EventContext) => {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      console.log('Skipping push: no vapid keys');
      return null;
    }
    const targetTime = nowHHMM();
    console.log('Checking notifications for', targetTime);

    try {
      const usersSnap = await db.collection('users').get();
      const tasks: Promise<unknown>[] = [];

      usersSnap.forEach(userDoc => {
        tasks.push((async () => {
          try {
            const uid = userDoc.id;
            const habitsSnap = await db.collection('users').doc(uid).collection('habits').get();
            const matched: any[] = [];
            habitsSnap.forEach(hDoc => {
              const h = hDoc.data() as any;
              if (h?.notificationTime === targetTime) matched.push(h);
            });
            if (matched.length === 0) return;

            const subsSnap = await db.collection('users').doc(uid).collection('pushSubscriptions').get();
            const subs = subsSnap.docs.map(d => d.data()) as any[];
            if (subs.length === 0) return;

            const payload = {
              title: '習慣リマインダー',
              body: `「${matched[0].name || '習慣'}」の時間です。続けましょう！`,
              url: '/', // 必要なら deep link を設定
            };

            await Promise.all(subs.map(s => {
              const pushSubscription = {
                endpoint: s.endpoint,
                keys: s.keys
              };
              return webpush.sendNotification(pushSubscription, JSON.stringify(payload)).catch(err => {
                console.error('Push send error', err);
                // 無効なサブスクは必要に応じて削除する処理を追加
              });
            }));
          } catch (e) {
            console.error('per-user notification error', e);
          }
        })());
      });

      await Promise.all(tasks);
    } catch (e) {
      console.error('sendScheduledNotifications error', e);
    }

    return null;
  });