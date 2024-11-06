(function() {
  const ENDPOINT = 'https://your-domain.com/api/collect';
  const websiteId = document.currentScript.getAttribute('data-website-id');
  
  if (!websiteId) {
    console.error('Analytics: Missing website ID');
    return;
  }

  const generateId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const getVisitorId = () => {
    let visitorId = localStorage.getItem('_va_id');
    if (!visitorId) {
      visitorId = generateId();
      localStorage.setItem('_va_id', visitorId);
    }
    return visitorId;
  };

  const getSessionId = () => {
    let sessionId = sessionStorage.getItem('_va_sid');
    if (!sessionId) {
      sessionId = generateId();
      sessionStorage.setItem('_va_sid', sessionId);
    }
    return sessionId;
  };

  const sendEvent = async (eventData) => {
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...eventData,
          websiteId,
          visitorId: getVisitorId(),
          sessionId: getSessionId(),
          href: window.location.href,
          referrer: document.referrer,
          userAgent: navigator.userAgent,
        }),
      });
      return response.ok;
    } catch (error) {
      console.error('Analytics error:', error);
      return false;
    }
  };

  // Track pageview
  sendEvent({
    name: 'pageview',
    type: 'page',
    sessionStart: new Date().toISOString(),
  });

  // Track performance
  if (window.performance) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const performance = window.performance.timing;
        const performanceData = {
          loadTime: performance.loadEventEnd - performance.navigationStart,
          domContentLoaded: performance.domContentLoadedEventEnd - performance.navigationStart,
          firstPaint: performance.responseEnd - performance.requestStart,
        };

        sendEvent({
          name: 'performance',
          type: 'performance',
          customData: performanceData,
        });
      }, 0);
    });
  }

  // Track scroll depth
  let maxScroll = 0;
  document.addEventListener('scroll', () => {
    const percent = Math.round((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100);
    maxScroll = Math.max(maxScroll, percent);
  });

  // Track engagement time
  let startTime = Date.now();
  let engaged = true;
  
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      engaged = false;
      sendEvent({
        name: 'engagement',
        type: 'engagement',
        engagementTime: Math.round((Date.now() - startTime) / 1000),
        scrollDepth: maxScroll,
      });
    } else {
      engaged = true;
      startTime = Date.now();
    }
  });

  window.addEventListener('beforeunload', () => {
    if (engaged) {
      sendEvent({
        name: 'engagement',
        type: 'engagement',
        engagementTime: Math.round((Date.now() - startTime) / 1000),
        scrollDepth: maxScroll,
        exitType: 'normal',
      });
    }
  });

  // Expose tracking function
  window.va = {
    track: (eventName, customData = {}) => {
      return sendEvent({
        name: eventName,
        type: 'custom',
        customData,
      });
    },
  };
})();