/* THE STATIC GALLERY — page transition, lightbox, contact form */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Page transition (tan shutter) ---------- */
  var curtain = document.querySelector('.curtain');
  if (curtain && !reduce) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target && a.target !== '_self') return;
      if (a.hasAttribute('download') || a.hasAttribute('data-lightbox')) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.hash) return;   // in-page anchor
      if (url.pathname === location.pathname && url.search === location.search) return;
      e.preventDefault();
      curtain.classList.add('leaving');
      setTimeout(function () { location.href = a.href; }, 520);
    });
    // Back/forward cache: reopen the curtain when returning to a page
    window.addEventListener('pageshow', function (ev) {
      if (ev.persisted) {
        curtain.classList.remove('leaving');
        curtain.style.animation = 'none';
        curtain.style.transform = 'translateY(-101%)';
      }
    });
  }

  /* ---------- 2. Lightbox ---------- */
  var items = Array.prototype.slice.call(document.querySelectorAll('a[data-lightbox]'));
  if (items.length) {
    var lb = document.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Image viewer');
    lb.innerHTML =
      '<span class="lb-count" aria-live="polite"></span>' +
      '<button class="lb-close" type="button" aria-label="Close">&times;</button>' +
      '<button class="lb-prev" type="button" aria-label="Previous image">&#8249;</button>' +
      '<button class="lb-next" type="button" aria-label="Next image">&#8250;</button>' +
      '<figure><img alt=""></figure>';
    document.body.appendChild(lb);
    var img = lb.querySelector('img'),
        count = lb.querySelector('.lb-count'), idx = 0, opener = null;

    function show(i) {
      idx = (i + items.length) % items.length;
      var it = items[idx], thumb = it.querySelector('img');
      var alt = thumb ? thumb.alt : '';
      img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';
      img.src = it.getAttribute('href');
      img.alt = alt;
      count.textContent = (idx + 1) + ' / ' + items.length;
    }
    function open(i, from) {
      opener = from; show(i);
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
      lb.querySelector('.lb-close').focus();
    }
    function close() {
      lb.classList.remove('open');
      document.body.style.overflow = '';
      if (opener) opener.focus();
    }
    items.forEach(function (it, i) {
      it.addEventListener('click', function (e) { e.preventDefault(); open(i, it); });
    });
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.querySelector('.lb-prev').addEventListener('click', function () { show(idx - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.tagName === 'FIGURE') close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
      else if (e.key === 'Tab') {                       // keep focus inside the dialog
        var f = lb.querySelectorAll('button'), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    var sx = null;                                       // swipe on touch screens
    lb.addEventListener('touchstart', function (e) { sx = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
      sx = null;
    }, { passive: true });
  }

  /* ---------- 3. Contact form ---------- */
  var form = document.getElementById('contact-form');
  if (form) {
    var note = document.getElementById('form-note');
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    function check(input) {
      var v = input.value.trim(), ok = v.length > 0;
      if (ok && input.type === 'email') ok = emailRe.test(v);
      if (ok && input.name === 'portfolio') ok = /^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(v);
      input.classList.toggle('is-invalid', !ok);
      input.setAttribute('aria-invalid', String(!ok));
      return ok;
    }
    form.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('blur', function () { if (inp.value) check(inp); });
      inp.addEventListener('input', function () { if (inp.classList.contains('is-invalid')) check(inp); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var inputs = Array.prototype.slice.call(form.querySelectorAll('input')), bad = null;
      inputs.forEach(function (i) { if (!check(i) && !bad) bad = i; });
      if (bad) { bad.focus(); note.textContent = 'Please fix the highlighted fields.'; return; }

      var data = {};
      inputs.forEach(function (i) { data[i.name] = i.value.trim(); });
      var endpoint = form.getAttribute('data-endpoint');
      var btn = form.querySelector('button[type=submit]');

      function done() {
        form.innerHTML = '<div class="form-success" role="status"><strong>Inquiry sent.</strong>' +
          'Thank you, ' + escapeHtml(data.name) + '. We will reply to ' + escapeHtml(data.email) + ' within the studio hours listed below.</div>';
      }
      if (endpoint) {                                    // Formspree (or any form-endpoint) mode
        btn.disabled = true; note.textContent = 'Sending…';
        fetch(endpoint, { method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
          .then(function (r) { if (!r.ok) throw new Error(); done(); })
          .catch(function () { btn.disabled = false; note.textContent = 'Could not send. Please email us directly.'; });
      } else {                                           // No backend on GitHub Pages: open the visitor's mail app
        var to = form.getAttribute('data-mailto');
        var body = 'Name: ' + data.name + '\nEmail: ' + data.email + '\nPortfolio: ' + data.portfolio;
        window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent('Get featured: ' + data.name) + '&body=' + encodeURIComponent(body);
        done();
      }
    });
    function escapeHtml(s) { return s.replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  }

  /* ---------- 4. Get Involved / Submit application ---------- */
  var apply = document.getElementById('apply-form');
  if (apply) {
    var aNote = document.getElementById('apply-note'), drop = document.getElementById('dropzone'),
        fileInput = document.getElementById('a-files'), list = document.getElementById('file-list'),
        fileErr = document.getElementById('file-err'), files = [];
    var OK = ['image/jpeg', 'image/png', 'application/pdf'], MAX = 10 * 1024 * 1024;
    var mailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    function esc(s) { return s.replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

    function renderFiles() {
      list.innerHTML = '';
      files.forEach(function (f, i) {
        var li = document.createElement('li');
        li.innerHTML = '<span>' + esc(f.name) + '</span><button type="button" aria-label="Remove ' + esc(f.name) + '">&times;</button>';
        li.querySelector('button').addEventListener('click', function () { files.splice(i, 1); renderFiles(); });
        list.appendChild(li);
      });
    }
    function addFiles(fl) {
      var rejected = [];
      Array.prototype.forEach.call(fl, function (f) {
        var okType = OK.indexOf(f.type) > -1 || /\.(jpe?g|png|pdf)$/i.test(f.name);
        if (!okType) rejected.push(f.name + ' (use JPG, PNG or PDF)');
        else if (f.size > MAX) rejected.push(f.name + ' (over 10 MB)');
        else if (!files.some(function (x) { return x.name === f.name && x.size === f.size; })) files.push(f);
      });
      fileErr.textContent = rejected.length ? 'Not added: ' + rejected.join(', ') : '';
      renderFiles();
    }
    drop.addEventListener('click', function () { fileInput.click(); });
    drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
    fileInput.addEventListener('change', function () { addFiles(fileInput.files); fileInput.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('drag'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('drag'); }); });
    drop.addEventListener('drop', function (e) { addFiles(e.dataTransfer.files); });

    function chk(el) {
      var v = el.value.trim(), ok = v.length > 0;
      if (ok && el.type === 'email') ok = mailRe.test(v);
      if (ok && el.name === 'portfolio') ok = /^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(v);
      el.classList.toggle('is-invalid', !ok);
      el.setAttribute('aria-invalid', String(!ok));
      return ok;
    }
    var fields = Array.prototype.slice.call(apply.querySelectorAll('input[type=text],input[type=email],textarea'));
    fields.forEach(function (el) {
      el.addEventListener('blur', function () { if (el.value) chk(el); });
      el.addEventListener('input', function () { if (el.classList.contains('is-invalid')) chk(el); });
    });
    apply.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = null;
      fields.forEach(function (el) { if (!chk(el) && !bad) bad = el; });
      if (bad) { bad.focus(); aNote.textContent = 'Please fix the highlighted fields.'; return; }
      var d = {};
      fields.forEach(function (el) { d[el.name] = el.value.trim(); });
      var endpoint = apply.getAttribute('data-endpoint'), btn = apply.querySelector('button[type=submit]');
      function done(extra) {
        apply.innerHTML = '<div class="form-success" role="status"><strong>Application received.</strong>Thank you, ' + esc(d.name) +
          '. We will review your work and reply to ' + esc(d.email) + '.' + (extra || '') + '</div>';
      }
      if (endpoint) {
        var fd = new FormData();
        Object.keys(d).forEach(function (k) { fd.append(k, d[k]); });
        files.forEach(function (f) { fd.append('files', f); });
        btn.disabled = true; aNote.textContent = 'Sending…';
        fetch(endpoint, { method: 'POST', headers: { 'Accept': 'application/json' }, body: fd })
          .then(function (r) { if (!r.ok) throw new Error(); done(); })
          .catch(function () { btn.disabled = false; aNote.textContent = 'Could not send. Please email us directly.'; });
      } else {
        var body = 'Full name: ' + d.name + '\nEmail: ' + d.email + '\nPortfolio: ' + d.portfolio + '\n\nArtist bio:\n' + d.bio +
          '\n\nArtist statement:\n' + d.statement + '\n\nSample works to attach: ' + (files.map(function (f) { return f.name; }).join(', ') || 'none');
        window.location.href = 'mailto:' + apply.getAttribute('data-mailto') + '?subject=' + encodeURIComponent('Application: ' + d.name) + '&body=' + encodeURIComponent(body);
        done(files.length ? ' Your email app opened with your details. Attach your sample works to that email before sending.' : '');
      }
    });
  }
})();
