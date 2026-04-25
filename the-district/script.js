// The District Bites & Brew — minimal interactive layer

(() => {
  // Hero load-in
  const hero = document.querySelector('.hero');
  if (hero) {
    const heroImg = hero.querySelector('.hero__bg img');
    const onLoad = () => hero.classList.add('is-loaded');
    if (heroImg && heroImg.complete) onLoad();
    else if (heroImg) heroImg.addEventListener('load', onLoad, { once: true });
  }

  // Sticky-nav state on scroll
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle('is-scrolled', window.scrollY > 12);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile nav toggle
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navLinks.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Menu tabs
  const tabs = document.querySelectorAll('.menuTab');
  const panels = document.querySelectorAll('.menuPanel');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      panels.forEach(p => p.classList.toggle('is-active', p.dataset.panel === target));
    });
  });

  // Reveal-on-scroll
  const revealTargets = [
    ...document.querySelectorAll('.section__head, .about__media, .about__copy, .dish, .event__media, .event__copy, .review, .visit__info, .visit__map, .reserve__copy, .form')
  ];
  revealTargets.forEach((el, i) => {
    el.setAttribute('data-reveal', '');
    el.style.transitionDelay = `${Math.min(i * 40, 320)}ms`;
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealTargets.forEach(el => io.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add('is-in'));
  }

  // Form submit (Formspree)
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        status.textContent = 'Please fill in the required fields.';
        status.style.color = 'var(--accent)';
        return;
      }
      status.textContent = 'Sending…';
      status.style.color = 'var(--text-dim)';
      try {
        const data = new FormData(form);
        const res = await fetch(form.action, {
          method: 'POST',
          body: data,
          headers: { Accept: 'application/json' }
        });
        if (res.ok) {
          form.reset();
          status.textContent = 'Got it — we\'ll confirm your reservation within 24 hours.';
          status.style.color = 'var(--primary)';
        } else {
          throw new Error('Submission failed');
        }
      } catch (err) {
        status.textContent = 'Something went wrong. Please call us at (520) 710-9090.';
        status.style.color = 'var(--accent)';
      }
    });
  }

  // Footer year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
