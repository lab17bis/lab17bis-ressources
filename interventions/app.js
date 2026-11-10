/* Catalogue des interventions – Lab 17 bis
 * Widget personnalisé Grist, interface DSFR (même socle que le catalogue de ressources).
 * Hors Grist (ouverture directe de la page), un jeu de données fictif s'affiche.
 */
(function () {
  'use strict';

  var TITRE = 'Interventions du Lab 17 bis';
  var PAGE_PUBLIQUE = 'https://lab17bis.github.io/lab17bis-ressources/interventions/plein-ecran.html';
  var CONTACT = 'lab17bis@ac-reims.fr';

  // Colonnes à associer dans le panneau du créateur Grist (les noms reprennent ceux du CSV d'import)
  var COLONNES = [
    { name: 'titre', title: 'Titre', type: 'Text', description: 'Nom de l’intervention' },
    { name: 'type', title: 'Type', type: 'Choice,Text', optional: true, description: 'Animation, formation, facilitation…' },
    { name: 'description', title: 'Description', type: 'Text', optional: true, description: 'Résumé en 1 à 2 phrases' },
    { name: 'mots_cles', title: 'Mots-clés', type: 'ChoiceList,Text', optional: true },
    { name: 'statut', title: 'Statut', type: 'Choice,Text', optional: true, description: 'En cours / À venir / Réalisée' },
    { name: 'mise_en_avant', title: 'À la une (case à cocher)', type: 'Bool', optional: true },
    { name: 'origine', title: 'Origine', type: 'Choice,Text', optional: true, description: 'Sollicitation / Initiative du Lab' },
    { name: 'rythme', title: 'Rythme', type: 'Choice,Text', optional: true, description: 'Ponctuelle / Sur l’année / Récurrente / Permanente' },
    { name: 'annee_scolaire', title: 'Année scolaire', type: 'Choice,Text', optional: true },
    { name: 'date', title: 'Date', type: 'Date,DateTime', optional: true },
    { name: 'duree', title: 'Durée', type: 'Text', optional: true },
    { name: 'commanditaire', title: 'Commanditaire', type: 'Text', optional: true },
    { name: 'public', title: 'Public', type: 'Text', optional: true },
    { name: 'participants', title: 'Participants', type: 'Text', optional: true },
    { name: 'besoin', title: 'Le besoin', type: 'Text', optional: true },
    { name: 'demarche', title: 'La démarche', type: 'Text', optional: true },
    { name: 'livrables', title: 'Livrables', type: 'Text', optional: true, description: 'Séparés par des points-virgules' },
    { name: 'effets', title: 'Effets', type: 'Text', optional: true },
    { name: 'ressources_mobilisees', title: 'Ressources mobilisées', type: 'Text', optional: true, description: 'Séparées par des points-virgules' },
    { name: 'citation', title: 'Citation', type: 'Text', optional: true },
    { name: 'fichiers', title: 'Fichier(s) joint(s)', type: 'Attachments', optional: true },
    { name: 'lien', title: 'Lien externe', type: 'Text', optional: true },
    { name: 'valide', title: 'Publié (case à cocher)', type: 'Bool', optional: true, description: 'Décochée : la fiche n’apparaît pas dans le catalogue' }
  ];

  var ORDRE_TYPES = ['Animation', 'Formation et acculturation', 'Session de facilitation', 'Accompagnement de projet', 'Demande de conseil'];
  var PLURIEL = { 'Animation': 'Animations', 'Formation et acculturation': 'Formations et acculturations', 'Session de facilitation': 'Sessions de facilitation', 'Accompagnement de projet': 'Accompagnements de projet', 'Demande de conseil': 'Demandes de conseil' };
  var STATUTS_PUBLICS = ['En cours', 'À venir', 'Réalisée'];
  var LIBELLE_ORIGINE = { 'Sollicitation': 'Sur sollicitation', 'Initiative du Lab': 'À l’initiative du Lab' };

  var app = document.getElementById('app');
  var state = { rows: [], q: '', type: '', statut: '', annee: '', origine: '', tri: 'pertinence', mapped: false, manque: '', demo: false };
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
  function splitLignes(v, sep) {
    return v ? String(v).split(sep).map(function (x) { return x.trim(); }).filter(Boolean) : [];
  }
  function toBool(v) { return v === true || v === 'true' || v === 1 || v === 'TRUE'; }
  function toDate(v) {
    if (typeof v === 'number') return new Date(v * 1000);
    return null;
  }
  function fmtDate(d) {
    return d ? d.toLocaleDateString('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }) : '';
  }
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function safeUrl(u) {
    try {
      var x = new URL(String(u).trim());
      return /^https?:$/.test(x.protocol) ? x.href : null;
    } catch (e) { return null; }
  }
  // Année scolaire de départ (« 2025-2026 » -> 2025) pour trier quand la date manque
  function anneeDebut(r) {
    var m = /(\d{4})/.exec(r.annees[0] || '');
    return m ? new Date(Date.UTC(+m[1], 8, 1)).getTime() : 0;
  }
  function cleTemps(r) { return r.date ? r.date.getTime() : anneeDebut(r); }

  function normaliser(r) {
    return {
      id: r.id,
      titre: r.titre || '(sans titre)',
      type: r.type ? String(r.type) : '',
      description: r.description || '',
      tags: toList(r.mots_cles).map(String),
      statut: r.statut ? String(r.statut) : '',
      une: toBool(r.mise_en_avant),
      origine: r.origine ? String(r.origine) : '',
      rythme: r.rythme ? String(r.rythme) : '',
      annees: splitLignes(r.annee_scolaire, '/'),
      date: toDate(r.date),
      duree: r.duree ? String(r.duree) : '',
      commanditaire: r.commanditaire ? String(r.commanditaire) : '',
      public: r.public ? String(r.public) : '',
      participants: r.participants ? String(r.participants) : '',
      besoin: r.besoin ? String(r.besoin) : '',
      demarche: r.demarche ? String(r.demarche) : '',
      livrables: splitLignes(r.livrables, ';'),
      effets: r.effets ? String(r.effets) : '',
      ressources: splitLignes(r.ressources_mobilisees, ';'),
      citation: r.citation ? String(r.citation) : '',
      fichiers: toList(r.fichiers),
      lien: r.lien ? safeUrl(r.lien) : null
    };
  }

  // ---------- jeu de démonstration (hors Grist) ----------
  var DEMO = [
    { id: 1, titre: 'Séminaire d’exemple : l’engagement des jeunes', type: 'Session de facilitation', description: 'Exemple fictif : une journée de world café avec des élèves pour imaginer des actions concrètes.', mots_cles: ['L', 'élèves', 'world café'], statut: 'Réalisée', mise_en_avant: true, origine: 'Sollicitation', rythme: 'Ponctuelle', annee_scolaire: '2024-2025', date: 1745971200, duree: 'Une journée', commanditaire: 'Un service partenaire (exemple)', public: 'Élèves engagés', besoin: 'Exemple fictif de besoin exprimé par le commanditaire.', demarche: 'Exemple fictif de démarche : trois ateliers en tablées avec référent fixe.', livrables: 'Synthèse des contributions ; supports d’atelier ; flyer', effets: 'Exemple fictif d’effets observés.', citation: 'Exemple fictif de citation d’un participant.' },
    { id: 2, titre: 'Atelier d’exemple : qualité de vie au travail', type: 'Accompagnement de projet', description: 'Exemple fictif : une démarche en deux temps sur plusieurs sites.', mots_cles: ['L', 'démarche participative'], statut: 'En cours', mise_en_avant: false, origine: 'Sollicitation', rythme: 'Sur l’année', annee_scolaire: '2025-2026', date: 1765000000, duree: 'Deux temps', commanditaire: 'Rectorat (exemple)', besoin: 'Exemple fictif.', demarche: 'Exemple fictif.' },
    { id: 3, titre: 'Formation d’exemple : langage clair', type: 'Formation et acculturation', description: 'Exemple fictif : une journée pour réviser ses écrits administratifs.', mots_cles: ['L', 'langage clair'], statut: 'À venir', mise_en_avant: false, origine: 'Initiative du Lab', rythme: 'Récurrente', annee_scolaire: '2026-2027', date: 1794000000 },
    { id: 4, titre: 'Accueil d’exemple : délégation en visite', type: 'Animation', description: 'Exemple fictif : présentation du Lab et temps de travail collectif.', mots_cles: ['L', 'accueil'], statut: 'Réalisée', mise_en_avant: false, origine: 'Sollicitation', rythme: 'Récurrente', annee_scolaire: '2025-2026', date: 1764288000 },
    { id: 5, titre: 'Note de conseil d’exemple : faire vivre un réseau', type: 'Demande de conseil', description: 'Exemple fictif : une note pour la suite d’un réseau de professionnels.', mots_cles: ['L', 'réseau'], statut: 'Réalisée', mise_en_avant: false, origine: 'Sollicitation', rythme: 'Ponctuelle', annee_scolaire: '2026-2027', date: 1790000000 },
    { id: 6, titre: 'Assistant d’exemple : un outil construit par le Lab', type: 'Accompagnement de projet', description: 'Exemple fictif : un projet mené à l’initiative du Lab, en cours de développement.', mots_cles: ['L', 'outils'], statut: 'En cours', mise_en_avant: false, origine: 'Initiative du Lab', rythme: 'Permanente', annee_scolaire: '2026-2027' }
  ];

  // ---------- pièces jointes ----------
  function getToken(force) {
    if (!force && tokenCache && tokenCache.exp > Date.now()) return Promise.resolve(tokenCache.t);
    var p;
    if (window.grist && grist.docApi && grist.docApi.getAccessToken) p = grist.docApi.getAccessToken({ readOnly: true });
    else if (window.grist && grist.getAccessToken) p = grist.getAccessToken({ readOnly: true });
    else return Promise.reject(new Error('Jeton indisponible'));
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
    getToken(true).then(function (t) {
      return fetch(t.baseUrl + '/attachments/' + encodeURIComponent(id) + '/download?auth=' + encodeURIComponent(t.token));
    }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.blob(); })
      .then(function (blob) {
        var u = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = u; a.download = nom; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(u); }, 2000);
      }).catch(function () { alert('Téléchargement impossible : accès au fichier refusé.'); });
  }

  // ---------- filtres et tri ----------
  function valeurs(champ) {
    var seen = {}, out = [];
    state.rows.forEach(function (r) {
      var v = champ === 'annee' ? r.annees : champ === 'tags' ? r.tags : (r[champ] ? [r[champ]] : []);
      v.forEach(function (x) { if (!seen[x]) { seen[x] = 1; out.push(x); } });
    });
    return out;
  }
  function types() {
    return valeurs('type').sort(function (a, b) {
      var ia = ORDRE_TYPES.indexOf(a), ib = ORDRE_TYPES.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b, 'fr');
    });
  }
  function compteStatut(s) { return state.rows.filter(function (r) { return !s || r.statut === s; }).length; }
  function filtreActif() { return !!(state.q || state.type || state.statut || state.annee || state.origine); }
  function correspond(r) {
    if (state.type && r.type !== state.type) return false;
    if (state.statut && r.statut !== state.statut) return false;
    if (state.annee && r.annees.indexOf(state.annee) < 0) return false;
    if (state.origine && r.origine !== state.origine) return false;
    var q = norm(state.q);
    if (!q) return true;
    return norm([r.titre, r.description, r.type, r.commanditaire, r.public, r.tags.join(' ')].join(' ')).indexOf(q) >= 0;
  }
  var POIDS_STATUT = { 'En cours': 0, 'À venir': 1 };
  function trier(lst) {
    var l = lst.slice();
    function parTitre(a, b) { return a.titre.localeCompare(b.titre, 'fr'); }
    if (state.tri === 'az') return l.sort(parTitre);
    if (state.tri === 'recentes') return l.sort(function (a, b) { return cleTemps(b) - cleTemps(a) || parTitre(a, b); });
    return l.sort(function (a, b) {
      var pa = POIDS_STATUT[a.statut] == null ? 2 : POIDS_STATUT[a.statut];
      var pb = POIDS_STATUT[b.statut] == null ? 2 : POIDS_STATUT[b.statut];
      return pa - pb || cleTemps(b) - cleTemps(a) || parTitre(a, b);
    });
  }

  // ---------- rendu : liste ----------
  function badgesDe(r, detail) {
    var b = '';
    if (r.une) b += '<li><p class="fr-badge fr-badge--sm l17-badge-une fr-badge--no-icon">À la une</p></li>';
    if (r.statut === 'En cours') b += '<li><p class="fr-badge fr-badge--sm l17-badge-cours fr-badge--no-icon">En cours</p></li>';
    else if (r.statut === 'À venir') b += '<li><p class="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">À venir</p></li>';
    if (r.type) b += '<li><p class="fr-badge fr-badge--sm l17-badge-type fr-badge--no-icon">' + esc(r.type) + '</p></li>';
    if (r.origine === 'Initiative du Lab') b += '<li><p class="fr-badge fr-badge--sm l17-badge-init fr-badge--no-icon">Initiative du Lab</p></li>';
    if (detail && r.rythme === 'Permanente') b += '<li><p class="fr-badge fr-badge--sm fr-badge--no-icon">Projet permanent</p></li>';
    return b ? '<ul class="fr-badges-group">' + b + '</ul>' : '';
  }
  function repere(r) {
    return r.date ? fmtDate(r.date) : r.annees.join(' · ');
  }
  function carte(r) {
    var meta = [r.commanditaire, repere(r)].filter(Boolean).join(' · ');
    return '<div class="fr-col-12 fr-col-md-6 fr-col-lg-4"><div class="fr-card fr-enlarge-link"><div class="fr-card__body"><div class="fr-card__content">' +
      '<h3 class="fr-card__title"><a href="#r/' + esc(r.id) + '">' + esc(r.titre) + '</a></h3>' +
      (r.description ? '<p class="fr-card__desc l17-clamp">' + esc(r.description) + '</p>' : '') +
      '<div class="fr-card__start">' + badgesDe(r, false) + (meta ? '<p class="fr-card__detail">' + esc(meta) + '</p>' : '') + '</div>' +
      '</div></div></div></div>';
  }
  function grille(lst) {
    return '<div class="fr-grid-row fr-grid-row--gutters">' + lst.map(carte).join('') + '</div>';
  }
  function boutonsFacette(cle, vals, libelle) {
    if (!vals.length) return '';
    return '<div class="l17-facette" role="group" aria-label="' + esc(libelle) + '"><span class="fr-text--sm l17-facette-label">' + esc(libelle) + '</span>' +
      '<button type="button" class="fr-tag" data-fac="' + cle + '" data-val="" aria-pressed="' + (!state[cle]) + '">Tous</button>' +
      vals.map(function (v) {
        return '<button type="button" class="fr-tag" data-fac="' + cle + '" data-val="' + esc(v) + '" aria-pressed="' + (state[cle] === v) + '">' + esc(cle === 'origine' ? (LIBELLE_ORIGINE[v] || v) : v) + '</button>';
      }).join('') + '</div>';
  }
  function rendreListe() {
    var h = '<h1 class="fr-h3">' + esc(TITRE) + '</h1>';
    if (state.demo) h += '<div class="fr-alert fr-alert--info fr-alert--sm fr-mt-2w"><p>Aperçu avec des données fictives. Les interventions s’affichent lorsque cette page est ouverte depuis le catalogue Grist du Lab 17 bis.</p></div>';

    var nbCours = compteStatut('En cours');
    h += '<div class="l17-statuts" role="group" aria-label="Période">' +
      '<button type="button" class="fr-btn fr-btn--sm ' + (state.statut ? 'fr-btn--tertiary' : '') + '" data-statut="" aria-pressed="' + (!state.statut) + '">Tout (' + compteStatut('') + ')</button>' +
      STATUTS_PUBLICS.map(function (s) {
        var libelle = s === 'En cours' ? 'En ce moment' : s === 'À venir' ? 'À venir' : 'Réalisées';
        var n = compteStatut(s);
        if (!n && state.statut !== s) return '';
        return '<button type="button" class="fr-btn fr-btn--sm ' + (state.statut === s ? '' : 'fr-btn--tertiary') + '" data-statut="' + esc(s) + '" aria-pressed="' + (state.statut === s) + '">' + libelle + ' (' + n + ')</button>';
      }).join('') + '</div>';
    if (nbCours && !state.statut) h += '<p class="fr-hint-text fr-mb-2w">« En ce moment » : les sujets sur lesquels le Lab travaille actuellement.</p>';

    var tps = types();
    if (tps.length > 1) {
      h += '<div class="l17-sections" role="group" aria-label="Types d’intervention">' +
        '<button type="button" class="fr-tag" data-section="" aria-pressed="' + (!state.type) + '">Tous les types</button>' +
        tps.map(function (t) { return '<button type="button" class="fr-tag" data-section="' + esc(t) + '" aria-pressed="' + (state.type === t) + '">' + esc(PLURIEL[t] || t) + '</button>'; }).join('') + '</div>';
    }
    h += '<div class="fr-search-bar fr-mt-2w" role="search"><label class="fr-label" for="l17-q">Rechercher une intervention</label>' +
      '<input class="fr-input" type="search" id="l17-q" placeholder="Rechercher une intervention" value="' + esc(state.q) + '">' +
      '<button class="fr-btn" type="button" id="l17-go" title="Rechercher">Rechercher</button></div>';
    var annees = valeurs('annee').sort().reverse();
    h += boutonsFacette('annee', annees.length > 1 ? annees : [], 'Année scolaire');
    h += boutonsFacette('origine', valeurs('origine').length > 1 ? valeurs('origine') : [], 'Origine');
    var res = trier(state.rows.filter(correspond));
    h += '<div class="l17-barre"><p class="fr-text--sm l17-count" id="l17-count" role="status">' + res.length + ' intervention' + (res.length > 1 ? 's' : '') + '</p>' +
      '<div class="fr-select-group l17-tri"><label class="fr-label" for="l17-tri">Trier par</label><select class="fr-select" id="l17-tri">' +
      [['pertinence', 'En cours d’abord'], ['recentes', 'Plus récentes'], ['az', 'Ordre alphabétique']].map(function (o) { return '<option value="' + o[0] + '"' + (state.tri === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div></div>';

    var une = !filtreActif() ? res.filter(function (r) { return r.une; }) : [];
    if (une.length) {
      h += '<section class="l17-une" aria-labelledby="l17-une-t"><h2 class="fr-h5" id="l17-une-t">À la une</h2>' + grille(une) + '</section>';
      res = res.filter(function (r) { return !r.une; });
      if (res.length) h += '<h2 class="fr-h5 l17-section-titre">Toutes les interventions</h2>';
    }
    h += '<div id="l17-grid">' + (res.length ? grille(res) : (une.length ? '' : '<p>Aucune intervention ne correspond à votre recherche.</p>')) + '</div>';
    app.innerHTML = h;

    var q = document.getElementById('l17-q');
    q.addEventListener('input', function () { state.q = q.value; rendreListe(); var n = document.getElementById('l17-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });
    var tri = document.getElementById('l17-tri');
    if (tri) tri.addEventListener('change', function () { state.tri = tri.value; rendreListe(); });
    Array.prototype.forEach.call(app.querySelectorAll('[data-statut]'), function (b) { b.addEventListener('click', function () { state.statut = b.getAttribute('data-statut'); rendreListe(); }); });
    Array.prototype.forEach.call(app.querySelectorAll('[data-section]'), function (b) { b.addEventListener('click', function () { state.type = b.getAttribute('data-section'); rendreListe(); }); });
    Array.prototype.forEach.call(app.querySelectorAll('[data-fac]'), function (b) { b.addEventListener('click', function () { state[b.getAttribute('data-fac')] = b.getAttribute('data-val'); rendreListe(); }); });
  }

  // ---------- rendu : fiche ----------
  function bloc(titre, html) {
    return html ? '<h2 class="fr-h5 fr-mt-3w l17-bloc-titre">' + esc(titre) + '</h2>' + html : '';
  }
  function para(t) {
    return t ? String(t).split(/\r?\n/).filter(Boolean).map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('') : '';
  }
  function liste(items) {
    return items.length ? '<ul class="l17-liste">' + items.map(function (x) { return '<li>' + esc(x.charAt(0).toUpperCase() + x.slice(1)) + '</li>'; }).join('') + '</ul>' : '';
  }
  function infos(r) {
    var l = [['Date', r.date ? fmtDate(r.date) : ''], ['Année scolaire', r.annees.join(' · ')], ['Durée', r.duree], ['Commanditaire', r.commanditaire], ['Public', r.public], ['Participants', r.participants]]
      .filter(function (x) { return x[1]; });
    if (!l.length) return '';
    return '<dl class="l17-infos">' + l.map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('') + '</dl>';
  }
  function rendreFiche(id) {
    var r = state.rows.filter(function (x) { return String(x.id) === String(id); })[0];
    if (!r) { location.hash = ''; return; }
    var h = '<div class="l17-hautfiche"><a class="fr-link" href="#" id="l17-back"><span aria-hidden="true">← </span>Retour aux interventions</a>' +
      '<button type="button" class="fr-btn fr-btn--tertiary fr-btn--sm" id="l17-copier">Copier le lien de cette fiche</button></div>' +
      '<p class="fr-text--sm l17-lien-manuel" id="l17-lien-manuel" hidden><label for="l17-lien-champ">Copiez ce lien :</label> <input class="fr-input" id="l17-lien-champ" readonly></p>' +
      '<p class="fr-sr-only" role="status" id="l17-statut-copie"></p>' +
      '<h1 class="fr-h2">' + esc(r.titre) + '</h1>' + badgesDe(r, true) +
      (r.description ? '<p class="fr-text--lead l17-resume">' + esc(r.description) + '</p>' : '') +
      infos(r) +
      bloc('Le besoin', para(r.besoin)) +
      bloc('La démarche', para(r.demarche)) +
      bloc('Livrables', liste(r.livrables)) +
      bloc('Ce que cela a produit', para(r.effets)) +
      (r.citation ? '<figure class="fr-quote l17-citation"><blockquote><p>' + esc(r.citation) + '</p></blockquote></figure>' : '') +
      bloc('Ressources mobilisées', liste(r.ressources)) +
      (r.tags.length ? '<ul class="fr-tags-group fr-mt-3w">' + r.tags.map(function (t) { return '<li><p class="fr-tag">' + esc(t) + '</p></li>'; }).join('') + '</ul>' : '');
    if (r.fichiers.length || r.lien) {
      h += '<h2 class="fr-h5 fr-mt-3w">Télécharger et consulter</h2><ul class="l17-files">';
      r.fichiers.forEach(function (f) { h += '<li><button type="button" class="fr-btn fr-btn--secondary" data-file="' + esc(f) + '">Chargement du fichier…</button></li>'; });
      if (r.lien) h += '<li><a class="fr-btn fr-btn--secondary" href="' + esc(r.lien) + '" target="_blank" rel="noopener noreferrer" title="Ouvrir le lien externe - nouvelle fenêtre">Ouvrir le lien externe</a></li>';
      h += '</ul>';
    }
    app.innerHTML = h;
    document.getElementById('l17-back').addEventListener('click', function (e) { e.preventDefault(); location.hash = ''; });
    document.getElementById('l17-copier').addEventListener('click', function () { copierLien(PAGE_PUBLIQUE + '#r/' + encodeURIComponent(r.id)); });
    Array.prototype.forEach.call(app.querySelectorAll('[data-file]'), function (b) {
      var fid = b.getAttribute('data-file');
      infoFichier(fid).then(function (info) {
        var nom = info.fileName || ('Fichier ' + fid);
        b.textContent = 'Télécharger : ' + nom;
        b.addEventListener('click', function () { telecharger(fid, nom); });
      });
    });
    window.scrollTo(0, 0);
  }

  // ---------- lien partageable + échange avec la page plein écran ----------
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
    } else if (man && ch) { ch.value = url; man.hidden = false; ch.focus(); ch.select(); }
  }
  function versParent(msg) { try { if (window.top && window.top !== window) window.top.postMessage(msg, '*'); } catch (e) {} }
  window.addEventListener('message', function (ev) {
    var d = ev.data;
    if (d && ev.source === window.top && d.l17 === 'goto' && typeof d.hash === 'string' && /^#r\/[^\s]+$/.test(d.hash) && !location.hash) location.hash = d.hash;
  });
  function majContact(titre) {
    var a = document.getElementById('l17-contrib');
    if (!a) return;
    if (!CONTACT) { a.hidden = true; return; }
    var sujet = '[Interventions du Lab 17 bis] ' + (titre ? 'À propos de « ' + titre + ' »' : 'Demande d’intervention');
    var corps = 'Je souhaite (supprimer les mentions inutiles) :\n- solliciter le Lab 17 bis\n- signaler un problème ou une coquille\n- proposer une amélioration\n\nMon message :\n';
    a.hidden = false;
    a.href = 'mailto:' + CONTACT + '?subject=' + encodeURIComponent(sujet) + '&body=' + encodeURIComponent(corps);
  }

  var dernierMode = '';
  function rendre() {
    if (!state.mapped) {
      app.innerHTML = '<div class="fr-alert fr-alert--info"><h1 class="fr-alert__title">Associez les colonnes</h1>' +
        '<p>' + (state.manque ? 'Associez la colonne « ' + esc(state.manque) + ' » : sans elle, aucune intervention n’est affichée, par sécurité.' : 'Dans le panneau du créateur à droite, associez au moins la colonne « Titre » de votre table d’interventions.') + '</p></div>';
      return;
    }
    var m = /^#r\/(.+)$/.exec(location.hash);
    var mode = m ? 'fiche' : 'liste';
    if (m) rendreFiche(decodeURIComponent(m[1])); else rendreListe();
    var courant = m ? state.rows.filter(function (x) { return String(x.id) === decodeURIComponent(m[1]); })[0] : null;
    majContact(courant ? courant.titre : '');
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
      if (rows.length && !('valide' in rows[0])) { state.mapped = false; state.manque = 'Publié (case à cocher)'; state.rows = []; rendre(); return; }
      state.mapped = true;
      // Seules les lignes publiées (case « valide » cochée) sont affichées ; les règles d'accès Grist doublent ce filtre
      state.rows = rows.filter(function (x) { return toBool(x.valide); }).map(normaliser);
      rendre();
    });
  }
  function init() {
    versParent({ l17: 'ready' });
    if (window.grist && window.self !== window.top) demarrerGrist();
    else demarrerDemo();
  }
  window.__gristReload = function () { if (window.grist && window.self !== window.top) demarrerGrist(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
