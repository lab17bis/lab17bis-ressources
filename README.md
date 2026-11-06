# Catalogue de ressources – Lab 17 bis

Widget personnalisé pour [Grist](https://grist.numerique.gouv.fr) (La Suite numérique) qui affiche une table de ressources avec l'interface du Système de design de l'État (DSFR) : recherche, filtres par type et mots-clés, fiches détaillées, téléchargement des pièces jointes.

Le dépôt ne contient **que le code de la page** : aucune ressource, aucun fichier, aucune donnée. Tout (titres, descriptions, pièces jointes) vient de la table Grist à laquelle le widget est lié, et reste protégé par les règles d'accès Grist.

## Utilisation dans Grist

1. Dans un document Grist, ajouter un widget **Personnalisé** → **URL personnalisée**.
2. Saisir l'adresse de la page publiée (GitHub Pages) de ce dépôt.
3. Dans le panneau du créateur, associer les colonnes de la table :

| Rôle | Type de colonne conseillé | Obligatoire |
|---|---|---|
| Titre | Texte | oui |
| Type | Choix | non |
| Description | Texte | non |
| Mots-clés | Liste de choix | non |
| Auteur | Texte | non |
| Date | Date | non |
| Fichier(s) joint(s) | Pièces jointes | non |
| Lien externe | Texte (URL http/https) | non |

## Modération

Le widget affiche toutes les lignes qu'il reçoit. Pour ne publier que les ressources validées, **ne filtrez pas dans le widget** : posez une règle d'accès Grist (Permissions avancées) qui ne rend lisibles aux visiteurs que les lignes dont le statut est « validé ».

## Mode démonstration

Ouvert hors de Grist, `index.html` affiche des données fictives.

## Licences et mentions

- Le DSFR (`dsfr/`, version 1.15.4) et la police Marianne sont fournis par le Gouvernement et leur usage est réservé aux sites et services de la sphère publique. Voir <https://www.systeme-de-design.gouv.fr/>.
- Le code propre à ce dépôt (`index.html`, `app.js`, `style.css`) est la production du Lab 17 bis.
