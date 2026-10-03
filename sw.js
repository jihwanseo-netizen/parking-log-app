// 주차장 로깅 지도 — 오프라인 대비 서비스 워커
// 앱 화면(index.html)을 캐시해 두고, 인터넷이 없거나 느리면(3초 이상) 캐시된 화면을 연다.
// 인터넷이 되면 항상 최신 index.html을 받아서 캐시를 갱신한다(그래서 새로 배포하면 바로 반영됨).
var CACHE = 'parking-log-v1';
var SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      // 일부 파일(예: manifest.json)이 없어도 설치가 실패하지 않게 하나씩 담는다
      return Promise.all(SHELL.map(function(u){ return c.add(u).catch(function(){}); }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 카카오/파이어베이스 등 외부 요청은 건드리지 않음
  e.respondWith(
    new Promise(function(resolve){
      var settled = false;
      var timer = setTimeout(function(){
        caches.match(req, { ignoreSearch: true }).then(function(hit){ if (hit && !settled){ settled = true; resolve(hit); } });
      }, 3000);
      fetch(req).then(function(res){
        clearTimeout(timer);
        if (res && res.ok){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        if (!settled){ settled = true; resolve(res); }
      }).catch(function(){
        clearTimeout(timer);
        caches.match(req, { ignoreSearch: true }).then(function(hit){
          if (!settled){ settled = true; resolve(hit || caches.match('./index.html')); }
        });
      });
    })
  );
});
