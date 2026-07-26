/* ── 금융정보 관리 시스템 서비스 워커 ──
   앱 셸(HTML/아이콘/매니페스트)만 가볍게 캐싱합니다.
   실제 계좌 데이터는 Firebase에 저장되므로 이 캐시와는 무관합니다. */

const CACHE_NAME = 'fin-app-shell-v1';
const APP_SHELL = [
  './mybankinfo.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

/* 설치: 앱 셸 파일들을 미리 캐싱 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/* 활성화: 이전 버전 캐시 정리 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* 요청 처리:
   - Firebase / Google 인증 관련 요청은 절대 캐싱하지 않고 항상 네트워크로 보냄
     (로그인 상태와 계좌 데이터는 항상 최신이어야 하므로)
   - 그 외 앱 셸 파일은 네트워크 우선, 실패 시 캐시로 대체 (오프라인 대비) */
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  const isFirebaseOrAuth =
    url.includes('firebaseio.com') ||
    url.includes('firestore.googleapis.com') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com/firebasejs') ||
    url.includes('accounts.google.com') ||
    url.includes('identitytoolkit.googleapis.com');

  if (isFirebaseOrAuth || event.request.method !== 'GET') {
    return; // 서비스 워커가 가로채지 않고 그대로 네트워크로 통과시킴
  }

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
