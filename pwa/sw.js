const CACHE_NAME = 'bell-schedule-v1.0.0';
const BASE_PATH = '/pwa';

// Файлы для кэширования
const urlsToCache = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`,
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Установка Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] All files cached');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Error caching files:', err);
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Перехват запросов
self.addEventListener('fetch', event => {
  // Игнорируем запросы не к нашему домену
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Возвращаем из кэша, если есть
        if (response) {
          console.log('[SW] Serving from cache:', event.request.url);
          return response;
        }

        // Иначе загружаем из сети
        console.log('[SW] Fetching from network:', event.request.url);
        return fetch(event.request)
          .then(response => {
            // Проверяем валидность ответа
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Клонируем ответ для кэширования
            const responseToCache = response.clone();

            // Кэшируем только наши файлы
            if (event.request.url.includes(BASE_PATH)) {
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }

            return response;
          })
          .catch(err => {
            console.error('[SW] Fetch failed:', err);
            
            // Возвращаем офлайн страницу для HTML запросов
            if (event.request.destination === 'document') {
              return caches.match(`${BASE_PATH}/index.html`);
            }
            
            throw err;
          });
      })
  );
});

// Обработка сообщений от клиента
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Уведомления (если нужно в будущем)
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click received.');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(`${self.location.origin}${BASE_PATH}/`)
  );
});
