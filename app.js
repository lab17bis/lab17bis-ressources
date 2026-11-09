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
    { name: 'etapes', title: 'Étapes (une par ligne)', type: 'Text', optional: true },
    { name: 'vigilance', title: 'Point de vigilance', type: 'Text', optional: true },
    { name: 'usages', title: 'Aussi utile pour', type: 'Text', optional: true },
    { name: 'apport', title: 'Ce que ça apporte', type: 'Text', optional: true },
    { name: 'situation', title: 'La situation (conseils)', type: 'Text', optional: true },
    { name: 'principe', title: 'Le principe à suivre (conseils)', type: 'Text', optional: true },
    { name: 'posture', title: 'La posture (conseils)', type: 'Text', optional: true },
    { name: 'materiel', title: 'Matériel et conditions (une par ligne)', type: 'Text', optional: true },
    { name: 'resultat', title: 'Ce que vous obtenez / à retenir', type: 'Text', optional: true },
    { name: 'cadrage', title: 'Cadrage de la vignette', type: 'Choice,Text', optional: true, description: 'Remplir / Remplir (haut) ; vide = image entière' },
    { name: 'valide', title: 'Publié (case à cocher)', type: 'Bool', optional: true, description: 'Décochée : la fiche n’apparaît pas dans le catalogue' },
    { name: 'statut', title: 'Statut', type: 'Choice,Text', optional: true, description: 'Ex. Prototype' }
  ];

  var PAGE_PUBLIQUE = 'https://lab17bis.github.io/lab17bis-ressources/plein-ecran.html';
  var CONTACT = ''; // adresse e-mail du Lab pour le bouton « Contribuer » (masqué tant qu'elle est vide)
  var BESOINS = [
    { id: 'comprendre', titre: 'Comprendre une situation', tags: ['Comprendre les usagers', 'Diagnostiquer', 'Voir plus clair', 'Comprendre une situation'] },
    { id: 'cadrer', titre: 'Cadrer et décider', tags: ['Cadrer', 'Prioriser et décider', 'Sens et alignement'] },
    { id: 'imaginer', titre: 'Imaginer et concevoir', tags: ['Améliorer et imaginer', 'Imaginer et concevoir', 'Concevoir et animer'] },
    { id: 'echanger', titre: 'Faire échanger un groupe', tags: ['Échanger autrement', 'S’exprimer autrement', 'Se réunir autrement', 'Inviter à l’expression', 'Poser un cadre', 'Piloter la séance', 'Réguler la dynamique de groupe', 'Stimuler et structurer les échanges'] },
    { id: 'piloter', titre: 'Formaliser et piloter le changement', tags: ['Formaliser et planifier', 'Écrire et formaliser', 'Piloter le changement'] }
  ];
  var app = document.getElementById('app');
  var state = { rows: [], q: '', type: '', tags: {}, fac: {}, besoin: '', tri: 'melange', mapped: false, demo: false };
  var FACETTES = [];
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
  var ORDRE = ['Outil', 'Méthode', 'Assistant', 'Conseil', 'Livrable', 'Atelier clé en main'];
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
      etapes: r.etapes ? String(r.etapes).split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean) : [],
      vigilance: r.vigilance ? String(r.vigilance).split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean) : [],
      situation: r.situation ? String(r.situation) : '',
      principe: r.principe ? String(r.principe) : '',
      posture: r.posture ? String(r.posture) : '',
      materiel: r.materiel ? String(r.materiel).split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean) : [],
      resultat: r.resultat ? String(r.resultat) : '',
      usages: r.usages ? String(r.usages) : '',
      apport: r.apport ? String(r.apport) : '',
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
  function dansBesoin(r, id) {
    var b = BESOINS.filter(function (x) { return x.id === id; })[0];
    if (!b) return true;
    var set = b.tags.map(norm);
    return r.tags.some(function (t) { return set.indexOf(norm(t)) >= 0; });
  }
  function parTitre(a, b) { return a.titre.localeCompare(b.titre, 'fr'); }
  function trier(lst) {
    var l = lst.slice();
    if (state.tri === 'nouveautes') {
      return l.sort(function (a, b) { return (b.date ? b.date.getTime() : 0) - (a.date ? a.date.getTime() : 0) || parTitre(a, b); });
    }
    l.sort(parTitre);
    if (state.tri === 'az' || state.type) return l;
    // Mélange : on alterne les types (outil, méthode, assistant, conseil…) en gardant l'ordre alphabétique dans chaque type
    var groupes = {}, ordre = [];
    l.forEach(function (r) { var k = r.type || ''; if (!groupes[k]) { groupes[k] = []; ordre.push(k); } groupes[k].push(r); });
    ordre.sort(function (x, y) { var ix = ORDRE.indexOf(x), iy = ORDRE.indexOf(y); return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy); });
    var out = [], i = 0, reste = true;
    while (reste) {
      reste = false;
      ordre.forEach(function (k) { if (groupes[k][i]) { out.push(groupes[k][i]); reste = true; } });
      i++;
    }
    return out;
  }
  // « Nouveau » : publiée après le lancement du catalogue et depuis moins de 60 jours
  function estNouveau(r) {
    if (!r.date) return false;
    var min = Infinity;
    state.rows.forEach(function (x) { if (x.date && x.date.getTime() < min) min = x.date.getTime(); });
    var t = r.date.getTime();
    return t > min + 86400000 && Date.now() - t < 60 * 86400000;
  }
  function filtrer() {
    var q = norm(state.q);
    var actifs = Object.keys(state.tags).filter(function (k) { return state.tags[k]; });
    var lst = state.rows.filter(function (r) {
      if (state.type && r.type !== state.type) return false;
      if (state.besoin && !dansBesoin(r, state.besoin)) return false;
      for (var i = 0; i < actifs.length; i++) if (r.tags.indexOf(actifs[i]) < 0) return false;
      for (var f = 0; f < FACETTES.length; f++) {
        var k = FACETTES[f][0], sel = state.fac[k];
        if (sel && !(Array.isArray(r[k]) ? r[k].indexOf(sel) >= 0 : r[k] === sel)) return false;
      }
      if (!q) return true;
      return norm([r.titre, r.resume, r.description, r.auteur, r.type, r.tags.join(' ')].join(' ')).indexOf(q) >= 0;
    });
    return trier(lst);
  }
  var SVG_O = '<svg viewBox="0 0 64 64" width="72" height="72" fill="none" stroke="#000091" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">';
  var ICONES = {
    defaut: '<rect x="10" y="14" width="44" height="30" rx="6"/><path d="M22 44l-6 10 14-10"/><circle cx="24" cy="29" r="2.5" fill="#000091"/><circle cx="40" cy="29" r="2.5" fill="#000091"/><path d="M26 36c3 2.5 9 2.5 12 0"/>',
    indicateurs: '<path d="M10 54h44"/><rect x="14" y="34" width="8" height="20"/><rect x="28" y="22" width="8" height="32"/><rect x="42" y="10" width="8" height="44"/>',
    problem: '<circle cx="32" cy="32" r="22"/><path d="M25 26c0-5 4-8 8-8s8 3 8 7c0 6-9 6-9 13"/><circle cx="32" cy="46" r="1.5" fill="#000091"/>',
    irritant: '<circle cx="28" cy="28" r="16"/><path d="M40 40l14 14"/><path d="M22 28h12M28 22v12"/>',
    processus: '<rect x="6" y="24" width="14" height="16" rx="2"/><rect x="25" y="24" width="14" height="16" rx="2"/><rect x="44" y="24" width="14" height="16" rx="2"/><path d="M20 32h5M39 32h5"/>',
    immersion: '<path d="M4 32C12 18 22 12 32 12s20 6 28 20c-8 14-18 20-28 20S12 46 4 32z"/><circle cx="32" cy="32" r="9"/>',
    reunion: '<rect x="8" y="14" width="48" height="42" rx="4"/><path d="M8 26h48M20 8v12M44 8v12"/><path d="M20 38h10M20 46h18"/>',
    changement: '<path d="M8 48c10 0 8-16 20-16s8-16 20-16"/><path d="M42 10l6 6-6 6"/><circle cx="8" cy="48" r="3" fill="#000091"/>',
    ecrit: '<path d="M16 8h24l10 10v38H16z"/><path d="M40 8v10h10M24 28h18M24 36h18M24 44h12"/>',
    conception: '<path d="M10 54l4-14L44 10l10 10L24 50z"/><path d="M38 16l10 10"/>'
  };
  function iconeAssistant(titre) {
    var t = norm(titre || '');
    var k = /indicateur|pilotage/.test(t) ? 'indicateurs' : /problemati/.test(t) ? 'problem' : /irritant|repera/.test(t) ? 'irritant' :
      /processus|procedure|formalis/.test(t) ? 'processus' : /immersion/.test(t) ? 'immersion' : /reunion|cadrage/.test(t) ? 'reunion' :
      /changement|accompagnement/.test(t) ? 'changement' : /ecrit|clarif/.test(t) ? 'ecrit' : /conception/.test(t) ? 'conception' : 'defaut';
    return SVG_O + ICONES[k] + '</svg>';
  }
  function vignetteClasses(r) {
    var c = '';
    if (r.type === 'Conseil') c += ' l17-bg-gris';
    if (r.type === 'Méthode') c += ' l17-marge';
    if (r.cadrage === 'Remplir') c += ' l17-cover';
    else if (r.cadrage === 'Remplir (haut)') c += ' l17-cover-top';
    else if (r.cadrage === 'Zoom') c += ' l17-zoom';
    return c;
  }
  function carte(r) {
    var meta = [r.participants, r.duree].filter(Boolean).join(' · ');
    var badges = (r.type ? '<li><p class="fr-badge fr-badge--sm l17-badge-type fr-badge--no-icon">' + esc(r.type) + '</p></li>' : '') +
      (r.tags.length === 1 ? '<li><p class="fr-badge fr-badge--sm l17-badge-famille fr-badge--no-icon">' + esc(r.tags[0]) + '</p></li>' : '') +
      (r.statut ? '<li><p class="fr-badge fr-badge--sm fr-badge--yellow-tournesol fr-badge--no-icon">' + esc(r.statut) + '</p></li>' : '') +
      (estNouveau(r) ? '<li><p class="fr-badge fr-badge--sm fr-badge--green-emeraude">Nouveau</p></li>' : '');
    return '<div class="fr-col-12 fr-col-md-6 fr-col-lg-4"><div class="fr-card fr-enlarge-link"><div class="fr-card__body"><div class="fr-card__content">' +
      '<h3 class="fr-card__title"><a href="#r/' + esc(r.id) + '">' + esc(r.titre) + '</a></h3>' +
      ((r.resume || r.description) ? '<p class="fr-card__desc l17-clamp">' + esc(r.resume || r.description) + '</p>' : '') +
      '<div class="fr-card__start">' +
      (badges ? '<ul class="fr-badges-group">' + badges + '</ul>' : '') +
      (meta ? '<p class="fr-card__detail">' + esc(meta) + '</p>' : '') +
      '</div></div></div>' +
      (!r.images.length && r.type === 'Assistant' && vuesAssistant(r.titre).length ? '<div class="fr-card__header"><div class="fr-card__img"><img class="fr-responsive-img l17-vignette" src="' + esc(vuesAssistant(r.titre)[0]) + '" alt=""></div></div>' : '') +
      (!r.images.length && r.type === 'Assistant' && !vuesAssistant(r.titre).length ? '<div class="fr-card__header"><div class="fr-card__img"><div class="l17-visuel-assistant" aria-hidden="true">' + iconeAssistant(r.titre) + '<span>Assistant interactif</span></div></div></div>' : '') +
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
    h += '<div class="l17-besoins" role="group" aria-label="Je veux…"><p class="fr-text--sm l17-besoins-titre"><strong>Je veux…</strong></p><div class="l17-tags">' +
      BESOINS.map(function (b) { return '<button type="button" class="fr-tag" data-besoin="' + b.id + '" aria-pressed="' + (state.besoin === b.id) + '">' + esc(b.titre) + '</button>'; }).join('') + '</div></div>';
    if (types.length > 1) {
      h += '<div class="l17-sections" role="group" aria-label="Sections">' +
        '<button type="button" class="fr-btn ' + (state.type ? 'fr-btn--tertiary' : '') + ' fr-btn--sm" data-section="" aria-pressed="' + (!state.type) + '">Tout (' + compteType('') + ')</button>' +
        types.map(function (t) {
          return '<button type="button" class="fr-btn ' + (state.type === t ? '' : 'fr-btn--tertiary') + ' fr-btn--sm" data-section="' + esc(t) + '" aria-pressed="' + (state.type === t) + '">' + esc(PLURIEL[t] || t) + ' (' + compteType(t) + ')</button>';
        }).join('') + '</div>';
    }
    if (!state.type && types.length > 1) h += '<p class="fr-hint-text fr-mb-2w l17-astuce">Chaque section a ses propres filtres : choisissez Outils, Méthodes ou Conseils pour affiner par famille.</p>';
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
    if (state.type && tags.length > 1) {
      h += '<div class="l17-tags" role="group" aria-label="Filtrer par famille">' +
        tags.map(function (t) {
          return '<button type="button" class="fr-tag" data-tag="' + esc(t) + '" aria-pressed="' + (state.tags[t] ? 'true' : 'false') + '">' + esc(t) + '</button>';
        }).join('') + '</div>';
    }
    h += '</div><div class="l17-barre"><p class="fr-text--sm l17-count" id="l17-count" role="status">' + res.length + ' ressource' + (res.length > 1 ? 's' : '') + '</p>' +
      '<div class="fr-select-group l17-tri"><label class="fr-label" for="l17-tri">Trier par</label><select class="fr-select" id="l17-tri">' +
      [['melange', 'Mélange'], ['nouveautes', 'Plus récentes'], ['az', 'Ordre alphabétique']].map(function (o) { return '<option value="' + o[0] + '"' + (state.tri === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div></div>';
    if (res.length) h += '<div class="fr-grid-row fr-grid-row--gutters" id="l17-grid">' + res.map(carte).join('') + '</div>';
    else h += '<p id="l17-grid">Aucune ressource ne correspond à votre recherche.</p>';
    app.innerHTML = h;
    chargerImages();

    var q = document.getElementById('l17-q');
    q.addEventListener('input', function () {
      state.q = q.value;
      majResultats();
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-besoin]'), function (b) {
      b.addEventListener('click', function () { var k = b.getAttribute('data-besoin'); state.besoin = state.besoin === k ? '' : k; state.tags = {}; rendreListe(); });
    });
    var tri = document.getElementById('l17-tri');
    if (tri) tri.addEventListener('change', function () { state.tri = tri.value; majResultats(); });
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
    var l = [['Participants', r.participants], ['Durée', r.duree], ['Difficulté', r.niveau]].filter(function (x) { return x[1]; });
    if (!l.length) return '';
    return '<dl class="l17-infos">' + l.map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('') + '</dl>';
  }
  function bloc(titre, html) {
    return html ? '<h2 class="fr-h5 fr-mt-3w l17-bloc-titre">' + esc(titre) + '</h2>' + html : '';
  }
  function liste(items, cls) {
    return items && items.length ? '<ul class="' + cls + '">' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '';
  }
  function etapesHtml(r) {
    if (!r.etapes.length) return '';
    if (r.type === 'Conseil') {
      return bloc('Comment agir', '<ul class="l17-liste l17-agir">' + r.etapes.map(function (x) {
        var i = x.indexOf(' : ');
        return '<li>' + (i > 0 ? '<strong>' + esc(x.slice(0, i)) + '</strong><br>' + esc(x.slice(i + 3)) : esc(x)) + '</li>';
      }).join('') + '</ul>');
    }
    var prep = '', et = r.etapes;
    if (/^Avant\s*:/.test(et[0])) { prep = '<p class="l17-avant"><strong>Avant de commencer :</strong> ' + esc(et[0].replace(/^Avant\s*:\s*/, '')) + '</p>'; et = et.slice(1); }
    return bloc(r.type === 'Assistant' ? 'Le parcours' : 'Comment faire', prep + '<ol class="l17-etapes">' + et.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>');
  }
  var VUES = { 'problematisation': ['problematisation', 2], 'indicateurs': ['indicateurs-pilotage', 2], 'irritants': ['reperage-des-irritants', 2], 'formalisation': ['formalisation-processus-et-procedures', 2], 'immersion': ['immersion', 2], 'cadrage': ['cadrage-reunion', 2], 'accompagnement': ['accompagnement-au-changement', 2], 'clarification': ['clarification-un-ecrit', 2], 'conception': ['conception', 1] };
  function vuesAssistant(titre) {
    var t = String(titre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    for (var k in VUES) if (t.indexOf(k) >= 0) {
      var out = []; for (var i = 1; i <= VUES[k][1]; i++) out.push('assets/assistants/' + VUES[k][0] + '-' + i + '.jpg');
      return out;
    }
    return [];
  }
  function carrousel(titre) {
    var v = vuesAssistant(titre);
    if (!v.length) return '';
    var libelles = ['Écran d’accueil', 'Première étape'];
    return '<div class="l17-carrousel" role="group" aria-roledescription="carrousel" aria-label="Aperçu de l’assistant" data-n="' + v.length + '">' +
      v.map(function (u, i) { return '<figure class="l17-vue" data-i="' + i + '"' + (i ? ' hidden' : '') + '><img class="fr-responsive-img" src="' + esc(u) + '" alt="Aperçu de l’assistant : ' + libelles[i] + '"><figcaption class="fr-text--xs">' + libelles[i] + '</figcaption></figure>'; }).join('') +
      (v.length > 1 ? '<div class="l17-car-nav"><button type="button" class="fr-btn fr-btn--tertiary fr-btn--sm" data-dir="-1" title="Vue précédente">‹ Précédent</button><span class="fr-text--sm l17-car-pos">1 / ' + v.length + '</span><button type="button" class="fr-btn fr-btn--tertiary fr-btn--sm" data-dir="1" title="Vue suivante">Suivant ›</button></div>' : '') + '</div>';
  }
  function brancherCarrousel() {
    var c = app.querySelector('.l17-carrousel'); if (!c) return;
    var n = +c.getAttribute('data-n'), cur = 0;
    Array.prototype.forEach.call(c.querySelectorAll('[data-dir]'), function (b) {
      b.addEventListener('click', function () {
        cur = (cur + (+b.getAttribute('data-dir')) + n) % n;
        Array.prototype.forEach.call(c.querySelectorAll('.l17-vue'), function (f) { f.hidden = (+f.getAttribute('data-i') !== cur); });
        c.querySelector('.l17-car-pos').textContent = (cur + 1) + ' / ' + n;
      });
    });
  }
  var pdfjsPret = null;
  function chargerPdfjs() {
    if (pdfjsPret) return pdfjsPret;
    pdfjsPret = new Promise(function (ok, ko) {
      if (window.pdfjsLib) return ok(window.pdfjsLib);
      var sc = document.createElement('script');
      sc.src = 'assets/pdfjs/pdf.min.js';
      sc.onload = function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/pdfjs/pdf.worker.min.js'; ok(window.pdfjsLib); };
      sc.onerror = function () { ko(new Error('pdfjs')); };
      document.head.appendChild(sc);
    });
    pdfjsPret.catch(function () { pdfjsPret = null; });
    return pdfjsPret;
  }
  function afficherFiche(r) {
    var zone = document.getElementById('l17-visuel-fiche');
    if (!zone) return;
    var suite = Promise.resolve(null);
    r.fichiers.forEach(function (id) {
      suite = suite.then(function (trouve) {
        if (trouve) return trouve;
        return infoFichier(id).then(function (info) { return /\.pdf$/i.test(info.fileName || '') ? id : null; });
      });
    });
    suite.then(function (id) {
      if (!id) return;
      return Promise.all([chargerPdfjs(), blobDe(id)]).then(function (x) {
        return x[0].getDocument(x[1]).promise;
      }).then(function (pdf) {
        var cvs = [], p = Promise.resolve();
        for (var n = 1; n <= pdf.numPages; n++) (function (n) {
          p = p.then(function () { return pdf.getPage(n); }).then(function (page) {
            var vp = page.getViewport({ scale: 2 });
            var cv = document.createElement('canvas');
            cv.width = vp.width; cv.height = vp.height;
            cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Fiche, ' + (n === 1 ? 'recto' : 'verso'));
            cvs.push(cv);
            return page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
          });
        })(n);
        return p.then(function () { return cvs; });
      }).then(function (cvs) {
        var noms = ['Recto', 'Verso'];
        var c = document.createElement('div');
        c.className = 'l17-carrousel'; c.setAttribute('role', 'group'); c.setAttribute('aria-roledescription', 'carrousel'); c.setAttribute('aria-label', 'Fiche recto et verso'); c.setAttribute('data-n', cvs.length);
        cvs.forEach(function (cv, i) {
          var f = document.createElement('figure'); f.className = 'l17-vue'; f.setAttribute('data-i', i); if (i) f.hidden = true;
          f.appendChild(cv);
          var cap = document.createElement('figcaption'); cap.className = 'fr-text--xs'; cap.textContent = noms[i] || ('Page ' + (i + 1)); f.appendChild(cap);
          c.appendChild(f);
        });
        if (cvs.length > 1) {
          var nav = document.createElement('div'); nav.className = 'l17-car-nav';
          nav.innerHTML = '<button type="button" class="fr-btn fr-btn--tertiary fr-btn--sm" data-dir="-1">‹ Précédent</button><span class="fr-text--sm l17-car-pos">1 / ' + cvs.length + '</span><button type="button" class="fr-btn fr-btn--tertiary fr-btn--sm" data-dir="1">Suivant ›</button>';
          c.appendChild(nav);
        }
        zone.innerHTML = ''; zone.appendChild(c);
        brancherCarrousel();
      });
    }).catch(function (e) { try { console.warn('[l17] fiche', e && e.message); } catch (x) {} });
  }
  function rendreFiche(id) {
    var r = state.rows.filter(function (x) { return String(x.id) === String(id); })[0];
    if (!r) { location.hash = ''; return; }
    var meta = [r.auteur && r.auteur !== 'Lab 17 bis' ? r.auteur : '', r.auteur && r.auteur !== 'Lab 17 bis' ? fmtDate(r.date) : ''].filter(Boolean).join(' · ');
    var famille = r.tags.length === 1 ? r.tags[0] : '';
    var fichePdf = (r.type === 'Méthode' || r.type === 'Outil') && r.fichiers.length;
    var visuel = r.images.length
      ? '<img class="fr-responsive-img l17-vignette-detail' + (r.type === 'Conseil' ? ' l17-bg-gris' : '') + '" data-att="' + esc(r.images[0]) + '" alt="" src="' + PIXEL + '">'
      : (r.type === 'Assistant' ? (carrousel(r.titre) || '<div class="l17-visuel-assistant" aria-hidden="true">' + iconeAssistant(r.titre) + '<span>Assistant interactif</span></div>') : '');
    if (fichePdf && visuel) visuel = '<div id="l17-visuel-fiche">' + visuel + '</div>';
    var h = '<div class="l17-hautfiche"><a class="fr-link" href="#" id="l17-back"><span aria-hidden="true">← </span>Retour au catalogue</a>' +
      '<button type="button" class="fr-btn fr-btn--tertiary fr-btn--sm" id="l17-copier">Copier le lien de cette fiche</button></div>' +
      '<p class="fr-text--sm l17-lien-manuel" id="l17-lien-manuel" hidden><label for="l17-lien-champ">Copiez ce lien :</label> <input class="fr-input" id="l17-lien-champ" readonly></p>' +
      '<p class="fr-sr-only" role="status" id="l17-statut-copie"></p>' +
      '<h1 class="fr-h2">' + esc(r.titre) + '</h1>' +
      '<ul class="fr-badges-group">' + (r.type ? '<li><p class="fr-badge l17-badge-type fr-badge--no-icon">' + esc(r.type) + '</p></li>' : '') +
        (famille ? '<li><p class="fr-badge l17-badge-famille fr-badge--no-icon">' + esc(famille) + '</p></li>' : '') +
        (r.statut ? '<li><p class="fr-badge fr-badge--yellow-tournesol fr-badge--no-icon">' + esc(r.statut) + '</p></li>' : '') + '</ul>' +
      (r.statut === 'Prototype' ? '<div class="fr-alert fr-alert--info fr-alert--sm fr-mb-2w"><p>Prototype : contenu en cours de relecture. À utiliser avec discernement.</p></div>' : '') +
      '<div class="fr-grid-row fr-grid-row--gutters">' +
      (visuel ? '<div class="fr-col-12 fr-col-lg-5">' + visuel + '</div>' : '') +
      '<div class="fr-col-12 ' + (visuel ? 'fr-col-lg-7' : '') + '">' +
      (meta ? '<p class="fr-text--sm l17-meta">' + esc(meta) + '</p>' : '') +
      (r.resume ? '<p class="fr-text--lead l17-resume">' + esc(r.resume) + '</p>' : '') +
      infos(r) +
      (r.apport ? '<div class="fr-callout l17-apport-bloc"><h2 class="fr-callout__title fr-h6">Ce que ça apporte</h2><p class="fr-callout__text">' + esc(r.apport) + '</p></div>' : '') +
      bloc('La situation', r.situation ? '<p>' + esc(r.situation) + '</p>' : '') +
      bloc('Le principe à suivre', r.principe ? '<p>' + esc(r.principe) + '</p>' : '') +
      bloc('Présentation', !r.situation && r.description && r.description !== r.resume ? '<p class="l17-pre">' + esc(r.description) + '</p>' : '') +
      bloc(r.type === 'Assistant' ? 'Pour l\'utiliser' : 'Matériel et conditions de réussite', liste(r.materiel, 'l17-liste')) +
      etapesHtml(r) +
      bloc('La posture', r.posture ? '<p>' + esc(r.posture) + '</p>' : '') +
      (r.vigilance.length ? '<div class="fr-callout fr-callout--yellow-tournesol l17-vigilance"><h3 class="fr-callout__title">' + (r.vigilance.length > 1 ? 'Points de vigilance' : 'Point de vigilance') + '</h3>' +
        (r.vigilance.length > 1 ? liste(r.vigilance, 'l17-liste') : '<p class="fr-callout__text">' + esc(r.vigilance[0]) + '</p>') + '</div>' : '') +
      bloc(r.type === 'Conseil' ? 'À retenir' : 'Ce que vous obtenez', r.resultat ? '<p>' + esc(r.resultat) + '</p>' : '') +
      (r.usages ? '<p class="l17-usages"><strong>Aussi utile pour :</strong> ' + esc(r.usages) + '</p>' : '') +
      '</div></div>';
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
    document.getElementById('l17-copier').addEventListener('click', function () { copierLien(lienFiche(r.id)); });
    Array.prototype.forEach.call(app.querySelectorAll('[data-file]'), function (b) {
      var fid = b.getAttribute('data-file');
      infoFichier(fid).then(function (info) {
        var nom = info.fileName || ('Fichier ' + fid);
        b.textContent = 'Télécharger : ' + nom;
        b.addEventListener('click', function () { telecharger(fid, nom); });
      });
    });
    brancherCarrousel();
    if (r.type === 'Méthode' || r.type === 'Outil') afficherFiche(r);
    chargerImages();
    window.scrollTo(0, 0);
  }

  // ---------- lien partageable + échange avec la page d'accueil plein écran ----------
  function lienFiche(id) { return PAGE_PUBLIQUE + '#r/' + encodeURIComponent(id); }
  function copierLien(url) {
    var ok = false;
    try {
      var t = document.createElement('textarea');
      t.value = url; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select(); ok = document.execCommand('copy'); t.remove();
    } catch (e) { ok = false; }
    var st = document.getElementById('l17-statut-copie'), man = document.getElementById('l17-lien-manuel'), ch = document.getElementById('l17-lien-champ'), b = document.getElementById('l17-copier');
    if (ok) {
      if (st) st.textContent = 'Lien copié dans le presse-papiers';
      if (b) { b.textContent = 'Lien copié ✓'; setTimeout(function () { b.textContent = 'Copier le lien de cette fiche'; }, 2500); }
    } else if (man && ch) {
      ch.value = url; man.hidden = false; ch.focus(); ch.select();
    }
  }
  function versParent(msg) { try { if (window.top && window.top !== window) window.top.postMessage(msg, '*'); } catch (e) {} }
  window.addEventListener('message', function (ev) {
    var d = ev.data;
    if (d && ev.source === window.top && d.l17 === 'goto' && typeof d.hash === 'string' && /^#r\/[^\s]+$/.test(d.hash) && !location.hash) location.hash = d.hash;
  });
  function mailContribution(titre) {
    var sujet = '[Ressources du Lab 17 bis] ' + (titre ? 'À propos de « ' + titre + ' »' : 'Contribution');
    var corps = 'Je souhaite (supprimer les mentions inutiles) :\n- signaler un problème ou une coquille\n- proposer une amélioration\n- proposer une ressource\n- contacter le Lab 17 bis\n\nMon message :\n';
    return 'mailto:' + CONTACT + '?subject=' + encodeURIComponent(sujet) + '&body=' + encodeURIComponent(corps);
  }
  function majContribuer(titre) {
    var a = document.getElementById('l17-contrib');
    if (!a) return;
    if (!CONTACT) { a.hidden = true; return; }
    a.hidden = false; a.href = mailContribution(titre);
  }

  var dernierMode = '';
  function rendre() {
    if (!state.mapped) {
      app.innerHTML = '<div class="fr-alert fr-alert--info"><h1 class="fr-alert__title">Associez les colonnes</h1>' +
        '<p>Dans le panneau du créateur à droite, associez au moins la colonne « Titre » de votre table de ressources.</p></div>';
      return;
    }
    var m = /^#r\/(.+)$/.exec(location.hash);
    var mode = m ? 'fiche' : 'liste';
    if (m) rendreFiche(decodeURIComponent(m[1])); else rendreListe();
    var courant = m ? state.rows.filter(function (x) { return String(x.id) === decodeURIComponent(m[1]); })[0] : null;
    majContribuer(courant ? courant.titre : '');
    versParent({ l17: 'route', hash: courant ? '#r/' + encodeURIComponent(courant.id) : '' });
    if (mode !== dernierMode) {
      var premier = !dernierMode;
      dernierMode = mode;
      if (premier) return;
      var t = app.querySelector('h1'); if (t) { t.setAttribute('tabindex', '-1'); try { t.focus({ preventScroll: true }); } catch (e) {} }
    }
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
      state.rows = rows.filter(function (x) { return !('valide' in x) || x.valide === true || x.valide === undefined; }).map(normaliser);
      rendre();
    });
  }
  function init() {
    versParent({ l17: 'ready' });
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
