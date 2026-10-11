/* =========================================================================
   Star Electronics Ganga — site interactions
   Vanilla JS, no dependencies. Everything degrades gracefully without it.
   ========================================================================= */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} },
  };

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function lang() { return root.getAttribute('data-lang') === 'hi' ? 'hi' : 'en'; }
  function track(name, detail) {
    var payload = { event: name, detail: detail || null };
    if (window.dataLayer && window.dataLayer.push) window.dataLayer.push(payload);
    if (typeof window.gtag === 'function') window.gtag('event', name, detail || {});
  }

  /* ------------------------------------------------------------ language */
  function applyLanguage(l) {
    root.setAttribute('data-lang', l);
    root.setAttribute('lang', l === 'hi' ? 'hi' : 'en');
    store.set('seg-lang', l);
    $$('[data-lang-set]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang-set') === l));
    });
    // swap placeholders / alt text that carry both languages
    $$('[data-hi-placeholder]').forEach(function (el) {
      var en = el.getAttribute('data-en-placeholder') || '';
      var hi = el.getAttribute('data-hi-placeholder') || '';
      if (l === 'hi') { if (!en) el.setAttribute('data-en-placeholder', el.placeholder || ''); el.placeholder = hi; }
      else { if (en) el.placeholder = en; }
    });
    $$('[data-alt-hi]').forEach(function (el) {
      var en = el.getAttribute('data-en-alt') || el.alt || '';
      if (l === 'hi') { if (!en) el.setAttribute('data-en-alt', el.alt || ''); el.alt = el.getAttribute('data-alt-hi'); }
      else if (en) { el.alt = en; }
    });
    // <option> can't contain spans, so language text lives in data attributes
    $$('option[data-hi-text]').forEach(function (el) {
      var en = el.getAttribute('data-en-text') || '';
      if (!en) el.setAttribute('data-en-text', el.textContent || '');
      el.textContent = l === 'hi' ? (el.getAttribute('data-hi-text') || '') : (el.getAttribute('data-en-text') || '');
    });
    // titles / aria-labels that carry both languages (attributes can't hold spans)
    $$('[data-hi-title]').forEach(function (el) {
      var en = el.getAttribute('data-en-title') || '';
      if (!en) el.setAttribute('data-en-title', el.getAttribute('title') || '');
      el.setAttribute('title', l === 'hi' ? (el.getAttribute('data-hi-title') || '') : (el.getAttribute('data-en-title') || ''));
    });
    $$('[data-hi-aria]').forEach(function (el) {
      var en = el.getAttribute('data-en-aria') || '';
      if (!en) el.setAttribute('data-en-aria', el.getAttribute('aria-label') || '');
      el.setAttribute('aria-label', l === 'hi' ? (el.getAttribute('data-hi-aria') || '') : (el.getAttribute('data-en-aria') || ''));
    });
    doc.dispatchEvent(new CustomEvent('seg:lang', { detail: l }));
    updateResultCount();
  }

  $$('[data-lang-set]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var l = btn.getAttribute('data-lang-set');
      applyLanguage(l);
      track('language_toggle', { language: l });
    });
  });

  /* --------------------------------------------------------------- theme */
  $$('.theme-toggle').forEach(function (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      store.set('seg-theme', next);
      track('theme_toggle', { theme: next });
    });
  });

  /* -------------------------------------------------------------- header */
  var header = $('#siteHeader');
  function onScroll() {
    if (!header) return;
    header.classList.toggle('is-stuck', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* --------------------------------------------------------- mobile menu */
  var burger = $('#navBurger');
  var menu = $('#mobileMenu');
  var scrim = $('#navScrim');
  function setMenu(open) {
    if (!burger || !menu) return;
    var hi = root.getAttribute('data-lang') === 'hi';
    burger.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    if (scrim) scrim.hidden = !open;
    doc.body.style.overflow = open ? 'hidden' : '';
    // bilingual open/close label (attributes can't hold language spans)
    burger.setAttribute('aria-label', open
      ? (hi ? 'मेनू बंद करें' : 'Close menu')
      : (hi ? 'मेनू खोलें' : 'Open menu'));
  }
  if (burger) {
    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
  }
  if (scrim) scrim.addEventListener('click', function () { setMenu(false); });
  if (menu) $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setMenu(false);
  });
  // keep the burger's open/close label in the active language
  doc.addEventListener('seg:lang', function () {
    if (burger) setMenu(burger.getAttribute('aria-expanded') === 'true');
  });

  /* --------------------------------------------------- scroll reveals
     Rect-based (not IntersectionObserver-only) so content is never stuck
     invisible if observers are unavailable or throttled. */
  var revealEls = $$('[data-reveal]');
  var pending = revealEls.slice();
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduced) { el.textContent = target.toLocaleString('en-IN'); return; }
    // safety net: if animation frames are throttled (hidden tab), still land on the real value
    var done = function () { el.textContent = target.toLocaleString('en-IN'); };
    setTimeout(done, 1900);
    var start = null;
    var dur = 1500;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('en-IN');
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function startCount(el) {
    if (el.getAttribute('data-counted')) return;
    el.setAttribute('data-counted', '1');
    animateCount(el);
  }

  function revealEl(el) {
    el.classList.add('is-in');
    if (el.hasAttribute('data-count')) startCount(el);
    $$('[data-count]', el).forEach(startCount);
  }

  function checkReveal() {
    if (!pending.length) return;
    var vh = window.innerHeight || doc.documentElement.clientHeight;
    pending = pending.filter(function (el) {
      if (!el.isConnected) return false;
      var r = el.getBoundingClientRect();
      // reveal when it enters the viewport, or once it has been scrolled past
      // (a fast flick / Page Down / anchor jump can otherwise skip it for good)
      if (r.bottom <= 0 || (r.top < vh * 0.94 && r.bottom > -120)) { revealEl(el); return false; }
      return true;
    });
    if (!pending.length && revealTimer) { clearInterval(revealTimer); revealTimer = null; }
  }

  var revealTimer = null;
  if (pending.length) {
    window.addEventListener('scroll', checkReveal, { passive: true });
    window.addEventListener('resize', checkReveal);
    window.addEventListener('load', checkReveal);
    revealTimer = setInterval(checkReveal, 220);
    checkReveal();
    // safety net: if anything above the fold is still hidden after 2.5s, show it
    setTimeout(function () {
      pending.slice().forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) revealEl(el);
      });
      checkReveal();
    }, 2500);
  } else {
    revealEls.forEach(revealEl);
  }

  /* ------------------------------------------------------------ scrollers */
  $$('[data-scroll]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var wrap = btn.closest('.scroller-wrap');
      var sc = wrap ? $('[data-scroller]', wrap) : null;
      if (!sc) return;
      var dir = parseInt(btn.getAttribute('data-scroll'), 10);
      sc.scrollBy({ left: dir * Math.max(260, sc.clientWidth * 0.8), behavior: 'smooth' });
    });
  });

  /* ----------------------------------------------------------- catalogue */
  var grid = $('#productGrid');
  var cards = grid ? $$('[data-product-card]', grid) : [];
  var originalOrder = cards.slice();

  function updateResultCount() {
    var out = $('#resultCount');
    if (!out || !grid) return;
    var visible = cards.filter(function (c) { return !c.classList.contains('is-hidden'); }).length;
    out.textContent = lang() === 'hi'
      ? visible + ' में से ' + cards.length + ' प्रोडक्ट दिखाए जा रहे हैं'
      : 'Showing ' + visible + ' of ' + cards.length + ' products';
  }

  function applyFilters() {
    if (!grid) return;
    var q = (($('#productSearch') || {}).value || '').trim().toLowerCase();
    var brand = (($('#brandFilter') || {}).value || '').toLowerCase();
    var band = (($('#bandFilter') || {}).value || '');
    var activeSub = $('[data-sub-filter].is-active');
    var sub = activeSub ? activeSub.getAttribute('data-sub-filter') : '';

    cards.forEach(function (card) {
      var hay = (card.getAttribute('data-name') + ' ' + card.getAttribute('data-brand') + ' ' +
        card.getAttribute('data-sub') + ' ' + (card.getAttribute('data-specs') || '')).toLowerCase();
      var ok = true;
      if (q && hay.indexOf(q) === -1) ok = false;
      if (brand && card.getAttribute('data-brand').toLowerCase() !== brand) ok = false;
      if (band && card.getAttribute('data-band') !== band) ok = false;
      if (sub && card.getAttribute('data-sub') !== sub) ok = false;
      card.classList.toggle('is-hidden', !ok);
    });

    var empty = $('#emptyState');
    var visible = cards.filter(function (c) { return !c.classList.contains('is-hidden'); }).length;
    if (empty) empty.hidden = visible !== 0;
    updateResultCount();
    track('filter_use', { q: q, brand: brand, band: band, sub: sub });
  }

  function applySort(mode) {
    if (!grid) return;
    var sorted = originalOrder.slice();
    if (mode === 'price-asc' || mode === 'price-desc') {
      sorted.sort(function (a, b) {
        var pa = parseFloat(a.getAttribute('data-price')) || Infinity;
        var pb = parseFloat(b.getAttribute('data-price')) || Infinity;
        if (a.getAttribute('data-price') === '') pa = Infinity;
        if (b.getAttribute('data-price') === '') pb = Infinity;
        return mode === 'price-asc' ? pa - pb : pb - pa;
      });
    } else if (mode === 'name') {
      sorted.sort(function (a, b) {
        return a.getAttribute('data-name').localeCompare(b.getAttribute('data-name'));
      });
    }
    sorted.forEach(function (c) { grid.appendChild(c); });
  }

  ['productSearch', 'brandFilter', 'bandFilter'].forEach(function (id) {
    var el = doc.getElementById(id);
    if (el) el.addEventListener(id === 'productSearch' ? 'input' : 'change', applyFilters);
  });
  var sortEl = $('#sortFilter');
  if (sortEl) sortEl.addEventListener('change', function () { applySort(sortEl.value); track('sort_use', { mode: sortEl.value }); });

  $$('[data-sub-filter]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      $$('[data-sub-filter]').forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      applyFilters();
    });
  });

  var clearBtn = $('#clearFilters');
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      var s = $('#productSearch'); if (s) s.value = '';
      var b = $('#brandFilter'); if (b) b.value = '';
      var p = $('#bandFilter'); if (p) p.value = '';
      var o = $('#sortFilter'); if (o) o.value = 'popular';
      $$('[data-sub-filter]').forEach(function (b, i) { b.classList.toggle('is-active', i === 0); });
      applySort('popular');
      applyFilters();
      if (window.history && window.history.replaceState) window.history.replaceState({}, '', location.pathname);
    });
  }

  // deep links: ?brand=Samsung or ?q=note from other pages / 404 search
  if (grid) {
    var params = new URLSearchParams(location.search);
    var pq = params.get('q');
    var pb = params.get('brand');
    var ps = params.get('sub');
    if (pq) { var se = $('#productSearch'); if (se) se.value = pq; }
    if (pb) {
      var be = $('#brandFilter');
      if (be) {
        var match = Array.prototype.slice.call(be.options).filter(function (o) {
          return o.value.toLowerCase() === pb.toLowerCase();
        })[0];
        if (match) be.value = match.value;
      }
    }
    if (ps) {
      var target = $('[data-sub-filter="' + ps + '"]');
      if (target) { $$('[data-sub-filter]').forEach(function (b) { b.classList.remove('is-active'); }); target.classList.add('is-active'); }
    }
    if (pq || pb || ps) applyFilters();
    else updateResultCount();
  }

  /* ------------------------------------------------------- product dialog */
  var dialog = $('#productDialog');
  function openProduct(slug) {
    if (!dialog) return;
    var card = cards.filter(function (c) { return c.getAttribute('data-slug') === slug; })[0] ||
      $('[data-product-card][data-slug="' + slug + '"]');
    if (!card) return;
    var d = card.dataset;
    var media = $('#pdpMedia');
    var srcMedia = $('.pv', card);
    if (media && srcMedia) media.innerHTML = srcMedia.outerHTML;
    $('#pdpBrand').textContent = d.brand;
    $('#pdpTitle').textContent = d.name;
    $('#pdpDesc').textContent = lang() === 'hi' ? (d.descHi || d.descEn) : d.descEn;
    var priceBox = $('#pdpPrice');
    if (d.price) {
      priceBox.innerHTML = '<b>₹' + Number(d.price).toLocaleString('en-IN') + '</b><small>' +
        (lang() === 'hi' ? 'अनुमानित कीमत — बेस्ट प्राइस के लिए मैसेज करें' : 'Indicative price — message us for the best price') + '</small>';
    } else {
      priceBox.innerHTML = '<span class="ask">' +
        (lang() === 'hi' ? 'बेस्ट प्राइस पूछें' : 'Ask for best price') + '</span>';
    }
    var specList = $('#pdpSpecs');
    specList.innerHTML = (d.specs || '').split('||').filter(Boolean).map(function (s) {
      return '<li>' + s.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</li>';
    }).join('');
    $('#pdpWa').setAttribute('href', d.wa);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    track('product_view', { slug: slug, name: d.name, brand: d.brand });
  }

  doc.addEventListener('click', function (e) {
    var opener = e.target.closest ? e.target.closest('[data-product-open]') : null;
    if (opener) { e.preventDefault(); openProduct(opener.getAttribute('data-product-open')); return; }
    var closer = e.target.closest ? e.target.closest('[data-pdp-close]') : null;
    if (closer && dialog) { dialog.close ? dialog.close() : dialog.removeAttribute('open'); }
  });
  if (dialog) {
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
  }

  /* -------------------------------------------------------- video lightbox */
  var lb = $('#videoLightbox');
  var lbFrame = $('#lightboxFrame');
  doc.addEventListener('click', function (e) {
    var trigger = e.target.closest ? e.target.closest('[data-video]') : null;
    if (trigger && lb && lbFrame) {
      var id = trigger.getAttribute('data-video');
      lbFrame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) +
        '?autoplay=1&rel=0" title="Video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
      if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
      track('video_play', { id: id });
      return;
    }
    if (e.target.closest && e.target.closest('[data-lb-close]') && lb) closeLb();
    if (e.target === lb) closeLb();
  });
  function closeLb() {
    if (!lb) return;
    if (lbFrame) lbFrame.innerHTML = '';
    if (typeof lb.close === 'function') lb.close(); else lb.removeAttribute('open');
  }

  /* ----------------------------------------------------------- countdowns */
  function renderCountdown(el) {
    var until = new Date(el.getAttribute('data-countdown')).getTime();
    var diff = until - Date.now();
    if (isNaN(until)) return;
    if (diff <= 0) {
      el.classList.add('is-done');
      el.textContent = lang() === 'hi' ? 'यह ऑफर समाप्त हो गया है' : 'This offer has ended';
      return;
    }
    var s = Math.floor(diff / 1000);
    var days = Math.floor(s / 86400);
    var hours = Math.floor((s % 86400) / 3600);
    var mins = Math.floor((s % 3600) / 60);
    var secs = s % 60;
    var labels = lang() === 'hi'
      ? ['दिन', 'घंटे', 'मिनट', 'सेकंड']
      : ['Days', 'Hrs', 'Min', 'Sec'];
    var parts = [[days, labels[0]], [hours, labels[1]], [mins, labels[2]], [secs, labels[3]]];
    if (days === 0) parts = parts.slice(1);
    el.innerHTML = parts.map(function (p) {
      return '<span class="t-unit"><b>' + String(p[0]).padStart(2, '0') + '</b><small>' + p[1] + '</small></span>';
    }).join('');
  }
  var timers = $$('[data-countdown]');
  function tickAll() { timers.forEach(renderCountdown); }
  if (timers.length) { tickAll(); setInterval(tickAll, 1000); doc.addEventListener('seg:lang', tickAll); }

  /* --------------------------------------------------------------- share */
  $$('[data-share]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var url = btn.getAttribute('data-share');
      if (navigator.share) {
        navigator.share({ title: doc.title, url: url }).catch(function () { window.open(url, '_blank', 'noopener'); });
      } else {
        window.open(url, '_blank', 'noopener');
      }
      track('offer_share', { url: url });
    });
  });

  /* -------------------------------------------------------- enquiry form */
  var form = $('#enquiryForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = $('#formStatus');
      var name = form.name.value.trim();
      var phone = form.phone.value.replace(/\D/g, '');
      var interest = form.interest.value;
      var message = form.message.value.trim();
      var honeypot = form.company.value;

      $$('.field', form).forEach(function (f) { f.classList.remove('is-error'); });
      if (honeypot) return; // spam bot
      if (name.length < 2 || phone.length < 10) {
        status.className = 'form-status is-error';
        status.textContent = lang() === 'hi'
          ? 'कृपया अपना नाम और 10 अंकों का फोन नंबर भरें।'
          : 'Please enter your name and a 10-digit phone number.';
        if (name.length < 2) form.name.closest('.field').classList.add('is-error');
        if (phone.length < 10) form.phone.closest('.field').classList.add('is-error');
        return;
      }
      var text = 'Hello Star Electronics!\n' +
        'Name: ' + name + '\n' +
        'Phone: ' + phone + '\n' +
        'Interested in: ' + interest + '\n' +
        (message ? 'Message: ' + message + '\n' : '') +
        'Sent from your website.';
      var href = 'https://wa.me/917357393293?text=' + encodeURIComponent(text);
      window.open(href, '_blank', 'noopener');
      status.className = 'form-status is-ok';
      status.textContent = lang() === 'hi'
        ? 'व्हाट्सएप खोल रहे हैं — मैसेज भेज दीजिए। धन्यवाद!'
        : 'Opening WhatsApp with your message — just press send. Thank you!';
      track('form_submit', { interest: interest });
      form.reset();
    });
  }

  /* ----------------------------------------------------------- cookie bar */
  var cookieBar = $('#cookieBar');
  if (cookieBar && !store.get('seg-consent')) cookieBar.hidden = false;
  function closeCookie(value) {
    store.set('seg-consent', value);
    if (cookieBar) cookieBar.hidden = true;
    track('cookie_consent', { value: value });
  }
  var accept = $('#cookieAccept');
  var reject = $('#cookieReject');
  if (accept) accept.addEventListener('click', function () { closeCookie('accepted'); });
  if (reject) reject.addEventListener('click', function () { closeCookie('declined'); });

  /* ------------------------------------------------------- analytics taps */
  doc.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-track]') : null;
    if (el) track(el.getAttribute('data-track'), { href: el.getAttribute('href') || '' });
  });

  /* ---------------------------------------------------------------- year */
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* --------------------------------------------------------------- init */
  applyLanguage(store.get('seg-lang') === 'hi' ? 'hi' : 'en');
  applyFilters();
  updateResultCount();
})();
