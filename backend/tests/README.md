# Suite de tests — aniBet backend

34 tests couvrant l'intégralité de l'API migrée : auth, séries, events,
paris + résolution (le coeur transactionnel), bingo, ranking, transactions.

## Isolation

Les tests tournent contre une base **séparée** (`anibet_test`), jamais contre
ta base de dev (`anibet`). Elle est entièrement recréée (DROP + CREATE +
migrations rejouées) à chaque lancement de la suite — aucune trace ne
persiste d'un run à l'autre, et ta base de dev n'est jamais touchée.

## Lancer la suite

Avec `docker compose up` déjà en cours dans un autre terminal :

```bash
docker compose exec -e DATABASE_URL=postgresql://anibet:anibet_dev_only@db:5432/anibet_test \
  backend python -m pytest tests/ --html=tests/report.html --self-contained-html -v
```

Le `-e DATABASE_URL=...` est ce qui pointe la suite vers la base de test
plutôt que ta base de dev — la suite refuse même de démarrer si cette
variable ne contient pas `anibet_test`, exprès, pour qu'une erreur de
copier-coller ne puisse jamais écraser tes données de dev par accident.

## Consulter le rapport

Le fichier `tests/report.html` est généré directement sur ton système de
fichiers hôte (grâce au volume monté dans `docker-compose.yml`), donc :

```
http://<ton-adresse-tailscale>:8082/report.html
```

C'est un rapport HTML autonome (`--self-contained-html`) : résumé coloré
passed/failed en haut, tableau détaillé cliquable par test avec durée et
logs capturés en cas d'échec. Rien à installer côté navigateur.

## Relancer après une modification du code

Les tests utilisent le même volume `./app:/app/app` que le serveur de dev,
donc pas besoin de rebuild l'image pour relancer la suite après avoir changé
un fichier Python — juste relancer la commande `pytest` ci-dessus.
