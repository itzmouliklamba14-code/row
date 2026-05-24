(function () {
  'use strict';

  const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';

  async function registerServiceWorker() {
    if (!isHttp || !('serviceWorker' in navigator)) return null;
    try {
      return await navigator.serviceWorker.register('sw.js', { scope: './' });
    } catch (error) {
      console.warn('Service worker registration failed:', error);
      return null;
    }
  }

  async function showNotification(title, options) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    const payload = Object.assign({
      badge: 'icon-192.png',
      icon: 'icon-192.png',
      tag: 'private-dashboard',
      renotify: false
    }, options || {});

    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, payload);
        return true;
      } catch (error) {
        console.warn('Service worker notification failed:', error);
      }
    }

    try {
      new Notification(title, payload);
      return true;
    } catch (error) {
      console.warn('Notification failed:', error);
      return false;
    }
  }

  window.RowPWA = {
    registerServiceWorker,
    showNotification,
    isInstallableContext: isHttp
  };

  registerServiceWorker();
})();
