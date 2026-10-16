(function () {
  const script = document.currentScript;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (script && !document.querySelector('link[data-scroll-effects-styles]')) {
    const styles = document.createElement('link');
    styles.rel = 'stylesheet';
    styles.href = new URL('../css/scroll-effects.css?v=20', script.src).href;
    styles.dataset.scrollEffectsStyles = '';
    document.head.appendChild(styles);
  }

  function initialiseEffects() {
    const backgroundHeroes = document.querySelectorAll('.hero, .about-hero');
    const revealSelector = [
      '.about-hero-copy',
      '.about-intro-grid > *',
      '.mission-card',
      '.principles-heading',
      '.principles-list article',
      '.about-cta .container',
      '.sector-intro-grid > *',
      '.sector-focus-card',
      '.sector-jobs-heading',
      '.sector-job',
      '.sector-cta .container',
      '#sectors .section-head',
      '#sectors .sector',
      '.page-hero .container',
      '.placeholder-card',
      '.footer-grid > div',
      '.copyright'
    ].join(',');

    backgroundHeroes.forEach(function (hero) {
      hero.classList.add('site-bg-reveal');
      if (reducedMotion || !('IntersectionObserver' in window)) {
        hero.classList.add('site-bg-visible');
        return;
      }

      const backgroundObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          const showBackground = function () {
            requestAnimationFrame(function () {
              requestAnimationFrame(function () {
                entry.target.classList.toggle('site-bg-visible', entry.intersectionRatio >= .12);
              });
            });
          };

          if (entry.intersectionRatio >= .12 && document.readyState !== 'complete') {
            window.addEventListener('load', showBackground, { once: true });
          } else {
            showBackground();
          }
        });
      }, { threshold: [.12] });

      backgroundObserver.observe(hero);
    });

    const revealItems = Array.from(document.querySelectorAll(revealSelector))
      .filter(function (item) { return !item.classList.contains('reveal'); });

    revealItems.forEach(function (item, index) {
      item.classList.add('site-reveal');
      item.style.setProperty('--reveal-delay', (index % 4) * 55 + 'ms');
    });

    if (reducedMotion || !('IntersectionObserver' in window)) {
      revealItems.forEach(function (item) { item.classList.add('site-reveal-visible'); });
      return;
    }

    const revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('site-reveal-visible', entry.isIntersecting);
      });
    }, { threshold: .12, rootMargin: '0px 0px -30px 0px' });

    revealItems.forEach(function (item) { revealObserver.observe(item); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialiseEffects);
  } else {
    initialiseEffects();
  }
})();
