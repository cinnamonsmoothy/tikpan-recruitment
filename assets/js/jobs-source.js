(function () {
  let prefetchedRequest = null;

  function loadPrivateFeed(config) {
    return new Promise(function (resolve, reject) {
      const apiUrl = String(config.apiUrl || '').trim();
      if (!apiUrl || (apiUrl.indexOf('https://') !== 0 && apiUrl.indexOf('http://localhost:') !== 0)) {
        reject(new Error('The private jobs feed has not been configured.'));
        return;
      }

      const callbackName = '__jobsBoardFeed' + Date.now() + Math.floor(Math.random() * 100000);
      const script = document.createElement('script');
      const timeout = window.setTimeout(function () {
        cleanup();
        reject(new Error('The private jobs feed timed out.'));
      }, 15000);

      function cleanup() {
        window.clearTimeout(timeout);
        script.remove();
        try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
      }

      window[callbackName] = function (data) {
        cleanup();
        if (!data || data.ok === false || !Array.isArray(data.jobs)) {
          reject(new Error((data && data.error) || 'The private jobs feed returned invalid data.'));
          return;
        }
        resolve(data);
      };

      script.onerror = function () {
        cleanup();
        reject(new Error('The private jobs feed could not be loaded.'));
      };

      const separator = apiUrl.indexOf('?') === -1 ? '?' : '&';
      script.src = apiUrl + separator + 'callback=' + encodeURIComponent(callbackName) + '&_=' + Date.now();
      document.head.appendChild(script);
    });
  }

  window.JobsBoardSource = {
    load: function () {
      const config = window.JOBS_BOARD_CONFIG || {};
      if (prefetchedRequest) {
        const request = prefetchedRequest;
        prefetchedRequest = null;
        return request;
      }
      return loadPrivateFeed(config);
    },
    refreshMs: function () {
      const configured = Number((window.JOBS_BOARD_CONFIG || {}).refreshMs);
      return Number.isFinite(configured) && configured >= 1000 ? configured : 5000;
    }
  };

  prefetchedRequest = loadPrivateFeed(window.JOBS_BOARD_CONFIG || {});
})();
