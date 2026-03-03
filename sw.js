const CACHE_NAME = 'hakka-quick-talk-v2';
const ASSETS = [
    './',
    './index.html',
    './manifest.json'
];

// 安裝 Service Worker 並快取核心資源
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS);
        })
    );
});

// 啟動 Service Worker 並清除舊版快取
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys.map(key => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
});

// 攔截網路請求以支援離線存取
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            // 若有快取則回傳快取，否則發送真實請求
            return response || fetch(event.request);
        }).catch(() => {
            // 離線且找不到快取時的 fallback (可選)
            if (event.request.mode === 'navigate') {
                return caches.match('./index.html');
            }
        })
    );
});
