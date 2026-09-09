(function () {
  'use strict';

  const DEFAULT_LANG = 'en';
  const STORAGE_KEY = 'portfolio.lang';

  // ==========================================================
  // i18n
  // ==========================================================
  let translations = null;
  let currentLang = DEFAULT_LANG;

  const getStoredLang = () => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  };
  const storeLang = (lang) => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  };

  const applyTranslations = (lang) => {
    if (!translations || !translations[lang]) return;
    const dict = translations[lang];

    document.documentElement.setAttribute('lang', lang);

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key] !== undefined) el.textContent = dict[key];
    });

    document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      const spec = el.getAttribute('data-i18n-attr');
      spec.split(',').forEach((pair) => {
        const [attr, key] = pair.split(':').map((s) => s.trim());
        if (attr && key && dict[key] !== undefined) el.setAttribute(attr, dict[key]);
      });
    });

    document.querySelectorAll('[data-lang-btn]').forEach((el) => {
      el.classList.toggle('is-active', el.getAttribute('data-lang-btn') === lang);
    });

    document.querySelectorAll('[data-lang-content]').forEach((wrap) => {
      wrap.querySelectorAll('[data-lang]').forEach((child) => {
        child.style.display = (child.getAttribute('data-lang') === lang) ? '' : 'none';
      });
    });

    renderCases(lang);
    currentLang = lang;
    storeLang(lang);
  };

  const setupLangToggle = () => {
    const toggle = document.getElementById('langToggle');
    if (!toggle) return;
    toggle.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-lang-btn]');
      if (btn) {
        applyTranslations(btn.getAttribute('data-lang-btn'));
      } else {
        applyTranslations(currentLang === 'en' ? 'ru' : 'en');
      }
    });
  };

  const loadTranslations = async () => {
    const scriptEl = document.querySelector('script[data-base]');
    const base = scriptEl ? scriptEl.getAttribute('data-base') : '';
    try {
      const res = await fetch(base + 'data/translations.json', { cache: 'no-cache' });
      translations = await res.json();
      const initial = getStoredLang() || DEFAULT_LANG;
      applyTranslations(initial);
    } catch (err) {
      console.error('Failed to load translations:', err);
    }
  };

  // ==========================================================
  // Sticky header scroll effect
  // ==========================================================
  const setupHeader = () => {
    const header = document.getElementById('siteHeader');
    if (!header) return;
    const updateHeader = () => {
      if (window.scrollY > 4) header.classList.add('is-scrolled');
      else header.classList.remove('is-scrolled');
    };
    window.addEventListener('scroll', updateHeader, { passive: true });
    updateHeader();
  };

  // ==========================================================
  // Cases renderer
  // ==========================================================
  let cases = null;

  const escapeHtml = (str) => String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const renderCard = (item, lang) => {
    const name = item['name_' + lang] || item.name_en;
    const summary = item['summary_' + lang] || item.summary_en;
    const metric = item['metric_' + lang];
    const cta = item.protected
      ? (translations && translations[lang] ? translations[lang]['projects.protected'] : 'Protected — request access →')
      : (translations && translations[lang] ? translations[lang]['projects.view_project'] : 'View project →');

    const metricHtml = metric
      ? `<div class="card__metric"><span class="card__metric-mark">✦</span><span>${escapeHtml(metric)}</span></div>`
      : '';

    const lockHtml = item.protected
      ? `<span class="card__lock" aria-label="Protected">🔒</span>`
      : '';

    return `
      <a class="card" href="cases/${item.slug}.html" aria-label="${escapeHtml(name)}">
        <div class="card__cover">
          <img src="${item.cover}" alt="${escapeHtml(name)} cover" loading="lazy">
        </div>
        <div class="card__body">
          <div class="card__meta">
            <span class="mono">${[item.client, item.category].filter(Boolean).map(escapeHtml).join(' · ')}</span>
            ${lockHtml}
          </div>
          <h3 class="card__name">${escapeHtml(name)}</h3>
          <p class="card__summary">${escapeHtml(summary)}</p>
          ${metricHtml}
          <span class="card__cta">${escapeHtml(cta)}</span>
        </div>
      </a>
    `;
  };

  const renderCases = (lang) => {
    if (!cases) return;
    document.querySelectorAll('[data-render]').forEach((el) => {
      const key = el.getAttribute('data-render');
      const items = cases[key] || [];
      el.innerHTML = items.map((it) => renderCard(it, lang)).join('');
    });
  };

  const loadCases = async () => {
    const scriptEl = document.querySelector('script[data-base]');
    const base = scriptEl ? scriptEl.getAttribute('data-base') : '';
    try {
      const res = await fetch(base + 'data/cases.json', { cache: 'no-cache' });
      cases = await res.json();
      renderCases(currentLang);
      setupReveal();
    } catch (err) {
      console.error('Failed to load cases:', err);
    }
  };

  // ==========================================================
  // Scroll reveal (fade-in on entering viewport)
  // ==========================================================
  const setupReveal = () => {
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('[data-reveal]:not(.is-visible)').forEach((el) => io.observe(el));
  };

  // ==========================================================
  // Sliders (each .slider with .slider__track & N .slider__slide)
  // ==========================================================
  const setupSliders = () => {
    document.querySelectorAll('.slider').forEach((slider) => {
      const track = slider.querySelector('.slider__track');
      const slides = slider.querySelectorAll('.slider__slide');
      if (!track || slides.length < 2) return;

      let index = 0;

      // Build dots
      const dotsWrap = document.createElement('div');
      dotsWrap.className = 'slider__dots';
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'slider__dot' + (i === 0 ? ' is-active' : '');
        dot.setAttribute('aria-label', 'Slide ' + (i + 1));
        dot.addEventListener('click', () => goTo(i));
        dotsWrap.appendChild(dot);
      });
      slider.appendChild(dotsWrap);

      // Prev/next arrows
      const prev = document.createElement('button');
      prev.type = 'button';
      prev.className = 'slider__arrow slider__arrow--prev';
      prev.innerHTML = '←';
      prev.setAttribute('aria-label', 'Previous slide');
      prev.addEventListener('click', () => goTo(index - 1));
      slider.appendChild(prev);

      const next = document.createElement('button');
      next.type = 'button';
      next.className = 'slider__arrow slider__arrow--next';
      next.innerHTML = '→';
      next.setAttribute('aria-label', 'Next slide');
      next.addEventListener('click', () => goTo(index + 1));
      slider.appendChild(next);

      const dots = dotsWrap.querySelectorAll('.slider__dot');

      const goTo = (i) => {
        index = Math.max(0, Math.min(slides.length - 1, i));
        track.style.transform = 'translateX(' + (-index * 100) + '%)';
        dots.forEach((d, di) => d.classList.toggle('is-active', di === index));
        prev.toggleAttribute('disabled', index === 0);
        next.toggleAttribute('disabled', index === slides.length - 1);
      };

      goTo(0);
    });
  };

  // ==========================================================
  // Init
  // ==========================================================
  document.addEventListener('DOMContentLoaded', () => {
    setupHeader();
    setupLangToggle();
    loadTranslations();
    loadCases();
    setupReveal();
    setupSliders();
  });
})();
