// Service Worker registration and management utilities

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

export function registerSW(config?: ServiceWorkerConfig) {
  if ('serviceWorker' in navigator) {
    // Only register in production or if explicitly enabled in development
    if (process.env.NODE_ENV === 'production' || localStorage.getItem('sw-dev') === 'true') {
      const publicUrl = new URL(window.location.href);
      if (publicUrl.origin !== window.location.origin) {
        return;
      }

      window.addEventListener('load', () => {
        const swUrl = `${process.env.PUBLIC_URL}/sw.js`;

        if (isLocalhost) {
          checkValidServiceWorker(swUrl, config);
          navigator.serviceWorker.ready.then(() => {
            console.log('Service worker is running in development mode.');
          });
        } else {
          registerValidSW(swUrl, config);
        }
      });
    }
  }
}

function registerValidSW(swUrl: string, config?: ServiceWorkerConfig) {
  navigator.serviceWorker
    .register(swUrl)
    .then(registration => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('New content is available; please refresh.');
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              console.log('Content is cached for offline use.');
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch(error => {
      console.error('Error during service worker registration:', error);
      if (config && config.onError) {
        config.onError(error);
      }
    });
}

function checkValidServiceWorker(swUrl: string, config?: ServiceWorkerConfig) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then(response => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then(registration => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log(
        'No internet connection found. App is running in offline mode.'
      );
    });
}

export function unregisterSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
      })
      .catch(error => {
        console.error(error.message);
      });
  }
}

// Push notification utilities
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      return existingSubscription;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.REACT_APP_VAPID_PUBLIC_KEY || '')
    });

    console.log('Push notification subscription successful');
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return null;
  }
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('Unsubscribed from push notifications');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    return false;
  }
}

// Background sync utilities
export async function registerBackgroundSync(tag: string): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Background sync is not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    // Type assertion for background sync support
    const syncRegistration = registration as any;
    if (syncRegistration.sync) {
      await syncRegistration.sync.register(tag);
      console.log(`Background sync registered for tag: ${tag}`);
    }
  } catch (error) {
    console.error('Background sync registration failed:', error);
  }
}

// Utility functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Cache management
export async function clearAppCache(): Promise<void> {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('App cache cleared');
    } catch (error) {
      console.error('Failed to clear app cache:', error);
    }
  }
}

// App update utilities
export async function checkForAppUpdate(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      return registration.waiting !== null;
    }
    return false;
  } catch (error) {
    console.error('Failed to check for app update:', error);
    return false;
  }
}

export async function skipWaitingAndReload(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  } catch (error) {
    console.error('Failed to skip waiting and reload:', error);
  }
}

// Installation prompt
let deferredPrompt: any = null;

export function handleInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('App can be installed');
    
    // Show custom install button or UI
    const installEvent = new CustomEvent('appCanInstall', { detail: { prompt: deferredPrompt } });
    window.dispatchEvent(installEvent);
  });

  window.addEventListener('appinstalled', () => {
    console.log('App was installed');
    deferredPrompt = null;
    
    // Analytics or other post-install actions
    const installedEvent = new CustomEvent('appInstalled');
    window.dispatchEvent(installedEvent);
  });
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    console.warn('No install prompt available');
    return false;
  }

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    
    console.log(`Install prompt outcome: ${outcome}`);
    return outcome === 'accepted';
  } catch (error) {
    console.error('Install prompt failed:', error);
    return false;
  }
}