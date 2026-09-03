// 오프라인에서도 앱 화면 자체(로그, 체크리스트, UI)는 뜨도록 하는 최소한의 캐시.
// 새 지도 타일(OpenStreetMap)이나 위치 정보는 인터넷 연결이 있어야 동작합니다.
var CACHE = 'parking-log-v1';
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // 지도 타일 등 외부 요청은 그대로 네트워크로

  e.respondWith(
    caches.match(e.request).then(function(cached){
      var network = fetch(e.request).then(function(resp){
        if (resp && resp.ok) caches.open(CACHE).then(function(c){ c.put(e.request, resp.clone()); });
        return resp;
      }).catch(function(){ return cached; });
      return cached || network;
    })
  );
});
