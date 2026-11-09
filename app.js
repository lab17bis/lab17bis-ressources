/* Catalogue de ressources – Lab 17 bis
 * Widget personnalisé Grist, interface DSFR.
 * Hors Grist (ouverture directe de la page), un jeu de données de démonstration s'affiche.
 */
(function () {
  'use strict';

  var TITRE = 'Catalogue de ressources';
  var SOUS_TITRE = 'Lab 17 bis – laboratoire d’innovation publique de l’académie de Reims';

  // Colonnes à associer dans le panneau du créateur Grist
  var COLONNES = [
    { name: 'titre', title: 'Titre', type: 'Text', description: 'Nom de la ressource' },
    { name: 'type', title: 'Type', type: 'Choice,Text', optional: true, description: 'Fiche, assistant, livrable…' },
    { name: 'description', title: 'Description', type: 'Text', optional: true },
    { name: 'tags', title: 'Mots-clés', type: 'ChoiceList,Text', optional: true },
    { name: 'auteur', title: 'Auteur', type: 'Text,Choice', optional: true },
    { name: 'date', title: 'Date', type: 'Date,DateTime', optional: true },
    { name: 'fichier', title: 'Fichier(s) joint(s)', type: 'Attachments', optional: true },
    { name: 'image', title: 'Vignette (image jointe)', type: 'Attachments', optional: true },
    { name: 'lien', title: 'Lien externe', type: 'Text', optional: true },
    { name: 'resume', title: 'En bref', type: 'Text', optional: true, description: 'Présentation en 1 à 2 phrases' },
    { name: 'niveau', title: 'Niveau de difficulté', type: 'Choice,Text', optional: true, description: 'Facile / Intermédiaire / Avancé' },
    { name: 'duree', title: 'Durée', type: 'Choice,Text', optional: true, description: 'Ex. Moins de 30 min' },
    { name: 'participants', title: 'Taille du groupe', type: 'Choice,Text', optional: true, description: 'Ex. 5 à 12 personnes' },
    { name: 'phase', title: 'Quand l’utiliser', type: 'ChoiceList,Text', optional: true, description: 'Phase du projet' },
    { name: 'format', title: 'Format', type: 'Choice,Text', optional: true, description: 'Présentiel / Distanciel / Les deux' },
    { name: 'cadrage', title: 'Cadrage de la vignette', type: 'Choice,Text', optional: true, description: 'Remplir / Remplir (haut) ; vide = image entière' },
    { name: 'statut', title: 'Statut', type: 'Choice,Text', optional: true, description: 'Ex. Prototype' }
  ];

  var app = document.getElementById('app');
  var state = { rows: [], q: '', type: '', tags: {}, fac: {}, mapped: false, demo: false };
  var FACETTES = [['niveau', 'Niveau'], ['duree', 'Durée'], ['participants', 'Groupe'], ['phase', 'Étape'], ['format', 'Format']];
  var tokenCache = null;

  // ---------- utilitaires ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toList(v) {
    if (v == null || v === '') return [];
    if (Array.isArray(v)) return (v[0] === 'L' ? v.slice(1) : v).filter(function (x) { return x !== '' && x != null; });
    return String(v).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function toDate(v) {
    if (typeof v === 'number') return new Date(v * 1000);
    return null;
  }
  function fmtDate(d) {
    return d ? d.toLocaleDateString('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }) : '';
  }
  function safeUrl(u) {
    try {
      var x = new URL(String(u).trim());
      return /^https?:$/.test(x.protocol) ? x.href : null;
    } catch (e) { return null; }
  }
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  // Ordre des sections ; « Livrable » et « Atelier clé en main » s'affichent dès qu'une ressource de ce type existe
  var ORDRE = ['Outil', 'Méthode', 'Conseil', 'Assistant', 'Livrable', 'Atelier clé en main'];
  var PLURIEL = { 'Outil': 'Outils', 'Méthode': 'Méthodes', 'Conseil': 'Conseils', 'Assistant': 'Assistants', 'Livrable': 'Livrables', 'Atelier clé en main': 'Ateliers clés en main' };
  function absUrl(u) {
    if (!u) return null;
    try { return safeUrl(new URL(String(u).trim(), location.href).href); } catch (e) { return null; }
  }

  function normaliser(r) {
    return {
      id: r.id,
      titre: r.titre || '(sans titre)',
      type: r.type ? String(r.type) : '',
      description: r.description || '',
      tags: toList(r.tags),
      auteur: r.auteur ? String(r.auteur) : '',
      date: toDate(r.date),
      fichiers: toList(r.fichier),
      lien: r.lien ? absUrl(r.lien) : null,
      images: toList(r.image),
      statut: r.statut ? String(r.statut) : '',
      cadrage: r.cadrage ? String(r.cadrage) : '',
      resume: r.resume || '',
      niveau: r.niveau ? String(r.niveau) : '',
      duree: r.duree ? String(r.duree) : '',
      participants: r.participants ? String(r.participants) : '',
      phase: toList(r.phase).map(String),
      format: r.format ? String(r.format) : ''
    };
  }

  // ---------- jeu de démonstration (hors Grist) ----------
  var DEMO = [
    { id: 1, titre: 'Outil d’exemple : matrice à deux axes', type: 'Outil', description: 'Exemple fictif : aperçu de l’affichage d’un outil.', tags: ['L', 'Prioriser et décider'], auteur: 'Lab 17 bis', date: 1793491200, fichier: ['L', 1] },
    { id: 2, titre: 'Méthode d’exemple : atelier en petits groupes', type: 'Méthode', description: 'Exemple fictif : aperçu de l’affichage d’une méthode.', tags: ['L', 'Échanger autrement'], auteur: 'Lab 17 bis', date: 1793491200, fichier: ['L', 2] },
    { id: 3, titre: 'Conseil d’exemple : gérer un temps de silence', type: 'Conseil', description: 'Exemple fictif : aperçu de l’affichage d’un conseil.', tags: ['L', 'Réguler la dynamique de groupe'], auteur: 'Lab 17 bis', date: 1793491200, fichier: ['L', 3] },
    { id: 4, titre: 'Assistant d’exemple (prototype)', type: 'Assistant', description: 'Exemple fictif : aperçu de l’affichage d’un assistant.', tags: ['L', 'Préparer une séance'], auteur: 'Lab 17 bis', date: 1793491200, statut: 'Prototype', fichier: ['L', 4] }
  ];


  // ---------- accès aux pièces jointes ----------
  function getToken(force) {
    if (!force && tokenCache && tokenCache.exp > Date.now()) return Promise.resolve(tokenCache.t);
    var p;
    if (window.grist && grist.docApi && grist.docApi.getAccessToken) {
      p = grist.docApi.getAccessToken({ readOnly: true });
    } else if (window.grist && grist.getAccessToken) {
      p = grist.getAccessToken({ readOnly: true });
    } else {
      return Promise.reject(new Error('Jeton indisponible'));
    }
    return p.then(function (t) {
      tokenCache = { t: t, exp: Date.now() + Math.max(30000, (t.ttlMsecs || 120000) - 15000) };
      return t;
    });
  }
  function infoFichier(id) {
    if (state.demo) return Promise.resolve({ fileName: 'exemple-' + id + '.txt' });
    return getToken().then(function (t) {
      return fetch(t.baseUrl + '/attachments/' + encodeURIComponent(id) + '?auth=' + encodeURIComponent(t.token))
        .then(function (r) { return r.ok ? r.json() : { fileName: 'Fichier ' + id }; });
    }).catch(function () { return { fileName: 'Fichier ' + id }; });
  }
  function telecharger(id, nom) {
    if (state.demo) {
      var blob = new Blob(['Fichier de démonstration.\n'], { type: 'text/plain' });
      var u = URL.createObjectURL(blob);
      var a0 = document.createElement('a');
      a0.href = u; a0.download = nom; document.body.appendChild(a0); a0.click(); a0.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
      return;
    }
    getToken(true).then(function (t) {
      return fetch(t.baseUrl + '/attachments/' + encodeURIComponent(id) + '/download?auth=' + encodeURIComponent(t.token));
    }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.blob(); })
      .then(function (blob) {
        var u = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = u; a.download = nom; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(u); }, 2000);
      }).catch(function () {
        alert('Téléchargement impossible : accès au fichier refusé.');
      });
  }

  var imgCache = {};
  var PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  function blobDe(id) {
    if (imgCache[id]) return imgCache[id];
    imgCache[id] = getToken().then(function (t) {
      return fetch(t.baseUrl + '/attachments/' + encodeURIComponent(id) + '/download?auth=' + encodeURIComponent(t.token));
    }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.blob(); })
      .then(function (b) { return URL.createObjectURL(b); });
    imgCache[id].catch(function () { delete imgCache[id]; });
    return imgCache[id];
  }
  function chargerImages() {
    Array.prototype.forEach.call(app.querySelectorAll('img[data-att]'), function (img) {
      if (img.getAttribute('data-ok')) return;
      img.setAttribute('data-ok', '1');
      if (state.demo) { img.closest('.fr-card__header, p') && img.closest('.fr-card__header, p').remove(); return; }
      blobDe(img.getAttribute('data-att')).then(function (u) { img.src = u; }).catch(function (e) {
        try { console.warn('[l17] vignette', e && e.message); } catch (x) {}
        var h = img.closest('.fr-card__header'); if (h) h.remove();
      });
    });
  }

  // ---------- rendu : liste ----------
  function ensemble(champ) {
    var seen = {}, out = [];
    state.rows.forEach(function (r) {
      var vals = champ === 'tags' ? r.tags : (r.type ? [r.type] : []);
      vals.forEach(function (v) { if (!seen[v]) { seen[v] = 1; out.push(v); } });
    });
    if (champ === 'tags') return out.sort(function (a, b) { return a.localeCompare(b, 'fr'); });
    return out.sort(function (a, b) {
      var ia = ORDRE.indexOf(a), ib = ORDRE.indexOf(b);
      if (ia < 0) ia = 99;
      if (ib < 0) ib = 99;
      return ia - ib || a.localeCompare(b, 'fr');
    });
  }
  var ORDRE_FAC = { niveau: ['Facile', 'Intermédiaire', 'Avancé'], duree: ['Moins de 30 min', '30 min à 1 h 30', 'Demi-journée', 'Journée ou plus'], format: ['Présentiel', 'Distanciel', 'Les deux'] };
  function valeursFacette(k) {
    var seen = {}, out = [];
    state.rows.forEach(function (r) { (Array.isArray(r[k]) ? r[k] : (r[k] ? [r[k]] : [])).forEach(function (v) { if (!seen[v]) { seen[v] = 1; out.push(v); } }); });
    var o = ORDRE_FAC[k] || [];
    return out.sort(function (a, b) { var ia = o.indexOf(a), ib = o.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b, 'fr', { numeric: true }); });
  }
  function compteType(t) {
    return state.rows.filter(function (r) { return !t || r.type === t; }).length;
  }
  function filtrer() {
    var q = norm(state.q);
    var actifs = Object.keys(state.tags).filter(function (k) { return state.tags[k]; });
    return state.rows.filter(function (r) {
      if (state.type && r.type !== state.type) return false;
      for (var i = 0; i < actifs.length; i++) if (r.tags.indexOf(actifs[i]) < 0) return false;
      for (var f = 0; f < FACETTES.length; f++) {
        var k = FACETTES[f][0], sel = state.fac[k];
        if (sel && !(Array.isArray(r[k]) ? r[k].indexOf(sel) >= 0 : r[k] === sel)) return false;
      }
      if (!q) return true;
      return norm([r.titre, r.resume, r.description, r.auteur, r.type, r.tags.join(' ')].join(' ')).indexOf(q) >= 0;
    }).sort(function (a, b) {
      var da = a.date ? a.date.getTime() : 0, db = b.date ? b.date.getTime() : 0;
      var oa = ORDRE.indexOf(a.type), ob = ORDRE.indexOf(b.type);
      return db - da || (oa < 0 ? 99 : oa) - (ob < 0 ? 99 : ob) || a.titre.localeCompare(b.titre, 'fr');
    });
  }
  var ASSISTANT_SVG = '<svg viewBox="0 0 64 64" width="72" height="72" fill="none" stroke="#000091" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="14" width="44" height="30" rx="6"/><path d="M22 44l-6 10 14-10"/><circle cx="24" cy="29" r="2.5" fill="#000091"/><circle cx="40" cy="29" r="2.5" fill="#000091"/><path d="M26 36c3 2.5 9 2.5 12 0"/><path d="M32 14V8"/><circle cx="32" cy="6" r="2"/></svg>';
  function vignetteClasses(r) {
    var c = '';
    if (r.type === 'Conseil') c += ' l17-bg-gris';
    if (r.type === 'Méthode') c += ' l17-marge';
    if (r.cadrage === 'Remplir') c += ' l17-cover';
    else if (r.cadrage === 'Remplir (haut)') c += ' l17-cover-top';
    return c;
  }
  function carte(r) {
    var meta = [r.auteur, fmtDate(r.date)].filter(Boolean).join(' · ');
    var badges = (r.type ? '<li><p class="fr-badge fr-badge--sm fr-badge--blue-ecume">' + esc(r.type) + '</p></li>' : '') +
      (r.statut ? '<li><p class="fr-badge fr-badge--sm fr-badge--yellow-tournesol fr-badge--no-icon">' + esc(r.statut) + '</p></li>' : '') +
      (r.niveau ? '<li><p class="fr-badge fr-badge--sm fr-badge--no-icon">' + esc(r.niveau) + '</p></li>' : '') +
      (r.duree ? '<li><p class="fr-badge fr-badge--sm fr-badge--no-icon">' + esc(r.duree) + '</p></li>' : '');
    return '<div class="fr-col-12 fr-col-md-6 fr-col-lg-4"><div class="fr-card fr-enlarge-link"><div class="fr-card__body"><div class="fr-card__content">' +
      '<h3 class="fr-card__title"><a href="#r/' + esc(r.id) + '">' + esc(r.titre) + '</a></h3>' +
      ((r.resume || r.description) ? '<p class="fr-card__desc l17-clamp">' + esc(r.resume || r.description) + '</p>' : '') +
      '<div class="fr-card__start">' +
      (badges ? '<ul class="fr-badges-group">' + badges + '</ul>' : '') +
      (meta ? '<p class="fr-card__detail">' + esc(meta) + '</p>' : '') +
      '</div></div></div>' +
      (!r.images.length && r.type === 'Assistant' ? '<div class="fr-card__header"><div class="fr-card__img"><div class="l17-visuel-assistant" aria-hidden="true">' + ASSISTANT_SVG + '<span>Assistant interactif</span></div></div></div>' : '') +
      (r.images.length ? '<div class="fr-card__header"><div class="fr-card__img"><img class="fr-responsive-img l17-vignette' + vignetteClasses(r) + '" data-att="' + esc(r.images[0]) + '" alt="" src="' + PIXEL + '"></div></div>' : '') +
      '</div></div>';
  }
  function rendreListe() {
    var types = ensemble('type'), tags = ensemble('tags');
    var dispo = {};
    state.rows.forEach(function (r) {
      if (state.type && r.type !== state.type) return;
      for (var f = 0; f < FACETTES.length; f++) {
        var k = FACETTES[f][0], sel = state.fac[k];
        if (sel && !(Array.isArray(r[k]) ? r[k].indexOf(sel) >= 0 : r[k] === sel)) return;
      }
      r.tags.forEach(function (t) { dispo[t] = 1; });
    });
    tags = tags.filter(function (t) { return dispo[t] || state.tags[t]; });
    var res = filtrer();
    var h = '<h1 class="fr-h3">' + esc(TITRE) + '</h1>';
    if (state.demo) h += '<div class="fr-alert fr-alert--info fr-alert--sm fr-mt-2w"><p>Aperçu avec des données fictives. Les ressources s’affichent lorsque cette page est ouverte depuis le catalogue Grist du Lab 17 bis.</p></div>';
    h += '<div class="l17-filters">';
    if (types.length > 1) {
      h += '<div class="l17-sections" role="group" aria-label="Sections">' +
        '<button type="button" class="fr-btn ' + (state.type ? 'fr-btn--tertiary' : '') + ' fr-btn--sm" data-section="" aria-pressed="' + (!state.type) + '">Tout (' + compteType('') + ')</button>' +
        types.map(function (t) {
          return '<button type="button" class="fr-btn ' + (state.type === t ? '' : 'fr-btn--tertiary') + ' fr-btn--sm" data-section="' + esc(t) + '" aria-pressed="' + (state.type === t) + '">' + esc(PLURIEL[t] || t) + ' (' + compteType(t) + ')</button>';
        }).join('') + '</div>';
    }
    h += '<div class="fr-grid-row fr-grid-row--gutters">' +
      '<div class="fr-col-12"><div class="fr-search-bar" role="search"><label class="fr-label" for="l17-q">Rechercher une ressource</label>' +
      '<input class="fr-input" type="search" id="l17-q" placeholder="Rechercher une ressource" value="' + esc(state.q) + '">' +
      '<button class="fr-btn" type="button" id="l17-go" title="Rechercher">Rechercher</button></div></div>';
    h += '</div>';
    var HFAC = '';
    FACETTES.forEach(function (f) {
      var vals = valeursFacette(f[0]);
      if (!vals.length) return;
      HFAC += '<div class="l17-facette" role="group" aria-label="' + esc(f[1]) + '"><span class="fr-text--sm l17-facette-label">' + esc(f[1]) + '</span>' +
        '<button type="button" class="fr-tag" data-fac="' + f[0] + '" data-val="" aria-pressed="' + (!state.fac[f[0]]) + '">Tous</button>' +
        vals.map(function (v) { return '<button type="button" class="fr-tag" data-fac="' + f[0] + '" data-val="' + esc(v) + '" aria-pressed="' + (state.fac[f[0]] === v) + '">' + esc(v) + '</button>'; }).join('') + '</div>';
    });
    h += HFAC;
    if (tags.length) {
      h += '<div class="l17-tags" role="group" aria-label="Filtrer par sujet précis">' +
        tags.map(function (t) {
          return '<button type="button" class="fr-tag" data-tag="' + esc(t) + '" aria-pressed="' + (state.tags[t] ? 'true' : 'false') + '">' + esc(t) + '</button>';
        }).join('') + '</div>';
    }
    h += '</div><p class="fr-text--sm l17-count" id="l17-count">' + res.length + ' ressource' + (res.length > 1 ? 's' : '') + '</p>';
    if (res.length) h += '<div class="fr-grid-row fr-grid-row--gutters" id="l17-grid">' + res.map(carte).join('') + '</div>';
    else h += '<p id="l17-grid">Aucune ressource ne correspond à votre recherche.</p>';
    app.innerHTML = h;
    chargerImages();

    var q = document.getElementById('l17-q');
    q.addEventListener('input', function () {
      state.q = q.value;
      majResultats();
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-section]'), function (b) {
      b.addEventListener('click', function () { state.type = b.getAttribute('data-section'); rendreListe(); });
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-fac]'), function (b) {
      b.addEventListener('click', function () { state.fac[b.getAttribute('data-fac')] = b.getAttribute('data-val'); rendreListe(); });
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-tag]'), function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-tag');
        state.tags[k] = !state.tags[k];
        rendreListe();
      });
    });
  }
  // Met à jour seulement la grille pendant la saisie (garde le focus dans le champ)
  function majResultats() {
    var res = filtrer();
    var cnt = document.getElementById('l17-count');
    if (cnt) cnt.textContent = res.length + ' ressource' + (res.length > 1 ? 's' : '');
    var wrap = document.createElement('div');
    wrap.innerHTML = res.length
      ? '<div class="fr-grid-row fr-grid-row--gutters" id="l17-grid">' + res.map(carte).join('') + '</div>'
      : '<p id="l17-grid">Aucune ressource ne correspond à votre recherche.</p>';
    var old = document.getElementById('l17-grid');
    if (old) old.replaceWith(wrap.firstChild);
    chargerImages();
  }

  // ---------- rendu : fiche ----------
  function infos(r) {
    var l = [['Niveau', r.niveau], ['Durée', r.duree], ['Groupe', r.participants], ['Quand', r.phase.join(', ')], ['Format', r.format]].filter(function (x) { return x[1]; });
    if (!l.length) return '';
    return '<dl class="l17-infos">' + l.map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('') + '</dl>';
  }
  function rendreFiche(id) {
    var r = state.rows.filter(function (x) { return String(x.id) === String(id); })[0];
    if (!r) { location.hash = ''; return; }
    var meta = [r.auteur, fmtDate(r.date)].filter(Boolean).join(' · ');
    var h = '<p><a class="fr-link" href="#" id="l17-back"><span aria-hidden="true">← </span>Retour au catalogue</a></p>' +
      '<h1 class="fr-h2">' + esc(r.titre) + '</h1>' +
      ((r.type || r.statut) ? '<ul class="fr-badges-group">' + (r.type ? '<li><p class="fr-badge fr-badge--blue-ecume">' + esc(r.type) + '</p></li>' : '') + (r.statut ? '<li><p class="fr-badge fr-badge--yellow-tournesol fr-badge--no-icon">' + esc(r.statut) + '</p></li>' : '') + '</ul>' : '') +
      (r.statut === 'Prototype' ? '<div class="fr-alert fr-alert--info fr-alert--sm fr-mb-2w"><p>Prototype : contenu en cours de relecture. À utiliser avec discernement.</p></div>' : '') +
      (r.images.length ? '<p><img class="fr-responsive-img l17-vignette-detail" data-att="' + esc(r.images[0]) + '" alt="" src="' + PIXEL + '"></p>' : '') +
      (meta ? '<p class="fr-text--sm l17-meta">' + esc(meta) + '</p>' : '') +
      (r.resume ? '<p class="fr-text--lead">' + esc(r.resume) + '</p>' : '') +
      infos(r) +
      (r.description ? '<p class="l17-pre">' + esc(r.description) + '</p>' : '') +
      (r.tags.length ? '<ul class="fr-tags-group">' + r.tags.map(function (t) { return '<li><p class="fr-tag">' + esc(t) + '</p></li>'; }).join('') + '</ul>' : '');
    if (r.fichiers.length || r.lien) {
      h += '<h2 class="fr-h5 fr-mt-3w">Télécharger et consulter</h2><ul class="l17-files" id="l17-files">';
      r.fichiers.forEach(function (f) {
        h += '<li><button type="button" class="fr-btn fr-btn--secondary" data-file="' + esc(f) + '">Chargement du fichier…</button></li>';
      });
      if (r.lien) h += '<li><a class="fr-btn fr-btn--secondary" href="' + esc(r.lien) + '" target="_blank" rel="noopener noreferrer" title="Ouvrir le lien externe - nouvelle fenêtre">Ouvrir' + (r.type === 'Assistant' ? ' en ligne' : ' le lien externe') + '</a></li>';
      h += '</ul>';
    }
    app.innerHTML = h;
    document.getElementById('l17-back').addEventListener('click', function (e) { e.preventDefault(); location.hash = ''; });
    Array.prototype.forEach.call(app.querySelectorAll('[data-file]'), function (b) {
      var fid = b.getAttribute('data-file');
      infoFichier(fid).then(function (info) {
        var nom = info.fileName || ('Fichier ' + fid);
        b.textContent = 'Télécharger : ' + nom;
        b.addEventListener('click', function () { telecharger(fid, nom); });
      });
    });
    chargerImages();
    window.scrollTo(0, 0);
  }

  function rendre() {
    if (!state.mapped) {
      app.innerHTML = '<div class="fr-alert fr-alert--info"><h1 class="fr-alert__title">Associez les colonnes</h1>' +
        '<p>Dans le panneau du créateur à droite, associez au moins la colonne « Titre » de votre table de ressources.</p></div>';
      return;
    }
    var m = /^#r\/(.+)$/.exec(location.hash);
    if (m) rendreFiche(decodeURIComponent(m[1])); else rendreListe();
  }
  window.addEventListener('hashchange', rendre);
  var home = document.getElementById('l17-home');
  if (home) home.addEventListener('click', function (e) { e.preventDefault(); location.hash = ''; rendre(); });

  // ---------- démarrage ----------
  function demarrerDemo() {
    state.demo = true; state.mapped = true;
    state.rows = DEMO.map(normaliser);
    rendre();
  }
  function demarrerGrist() {
    grist.ready({ requiredAccess: 'read table', columns: COLONNES });
    grist.onRecords(function (recs) {
      var rows = grist.mapColumnNames(recs);
      if (!rows) { state.mapped = false; state.rows = []; rendre(); return; }
      state.mapped = true;
      state.rows = rows.map(normaliser);
      rendre();
    });
  }
  function init() {
    if (window.grist && window.self !== window.top) demarrerGrist();
    else demarrerDemo();
  }
  // Copie de secours de l'API chargée après coup : on bascule en mode Grist
  window.__gristReload = function () {
    if (window.grist && window.self !== window.top) demarrerGrist();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
