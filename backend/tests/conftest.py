"""
Configuration pytest partagée par toute la suite.

ISOLATION DE LA BASE DE TEST
-----------------------------
Les tests tournent contre une base Postgres séparée (`anibet_test`), jamais
contre ta base de dev (`anibet`). C'est le rôle de la variable DATABASE_URL
passée sur la ligne de commande au moment de lancer pytest (voir le README
de ce dossier) — elle doit déjà pointer vers anibet_test AVANT que Python
importe quoi que ce soit de l'app, car app/db.py crée son pool de connexions
une seule fois, à l'import. C'est pour ça que ça se fait via la commande
shell (`docker compose exec -e DATABASE_URL=...`), pas depuis ce fichier.

Ce fixture recrée la base de test entièrement à chaque lancement de la
suite (DROP puis CREATE), puis rejoue les migrations avec psql — exactement
la même commande que tu as utilisée pour vérifier le schéma manuellement.
Aucune donnée de test ne persiste d'un run à l'autre.
"""

import os
import subprocess
from pathlib import Path

import psycopg
import pytest
from fastapi.testclient import TestClient
from psycopg.rows import dict_row

MIGRATIONS_DIR = Path(__file__).parent.parent / "migrations"


def _test_db_name_and_admin_dsn() -> tuple[str, str]:
    database_url = os.environ.get("DATABASE_URL", "")
    if "anibet_test" not in database_url:
        raise RuntimeError(
            "DATABASE_URL ne pointe pas vers anibet_test — la suite refuse "
            "de tourner pour ne jamais risquer d'écraser la base de dev. "
            "Relance avec : docker compose exec -e "
            "DATABASE_URL=postgresql://anibet:anibet_dev_only@db:5432/anibet_test "
            "backend python -m pytest ..."
        )
    db_name = database_url.rsplit("/", 1)[-1]
    admin_dsn = database_url.rsplit("/", 1)[0] + "/postgres"  # DB de maintenance
    return db_name, admin_dsn


@pytest.fixture(scope="session", autouse=True)
def _reset_test_database():
    db_name, admin_dsn = _test_db_name_and_admin_dsn()

    # CREATE/DROP DATABASE ne peuvent pas tourner dans une transaction —
    # autocommit=True est obligatoire ici.
    with psycopg.connect(admin_dsn, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(f"DROP DATABASE IF EXISTS {db_name}")
            cur.execute(f"CREATE DATABASE {db_name} OWNER anibet")

    for sql_file in sorted(MIGRATIONS_DIR.glob("*.sql")):
        result = subprocess.run(
            ["psql", os.environ["DATABASE_URL"], "-f", str(sql_file)],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            raise RuntimeError(f"Migration {sql_file.name} a échoué :\n{result.stderr}")

    yield  # les tests tournent ici, base fraîche garantie


@pytest.fixture(scope="session")
def client(_reset_test_database):
    from app.main import app
    with TestClient(app) as c:
        yield c


def _signup_and_login(client: TestClient, username: str, email: str, password: str) -> str:
    resp = client.post("/auth/signup", json={
        "username": username, "email": email,
        "password_hash": password, "role": "user",
    })
    assert resp.status_code == 200, f"Signup a échoué : {resp.text}"

    resp = client.post("/auth/token", data={"username": username, "password": password})
    assert resp.status_code == 200, f"Login a échoué : {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture(scope="session")
def admin_headers(client):
    token = _signup_and_login(client, "test_admin", "admin@test.local", "adminpass123")

    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        with conn.cursor() as cur:
            cur.execute('UPDATE "User" SET role = %s WHERE username = %s', ("admin", "test_admin"))
        conn.commit()

    # Re-login : le rôle a changé en base après l'émission du 1er token —
    # on prend un token frais par clarté, même si /get-user relirait le
    # rôle à jour de toute façon à chaque requête.
    resp = client.post("/auth/token", data={"username": "test_admin", "password": "adminpass123"})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture(scope="session")
def bettor_headers(client):
    token = _signup_and_login(client, "test_bettor", "bettor@test.local", "bettorpass123")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def second_bettor_headers(client):
    token = _signup_and_login(client, "test_bettor2", "bettor2@test.local", "bettorpass123")
    return {"Authorization": f"Bearer {token}"}


def _user_id_by_username(username: str) -> int:
    """
    Le modèle Pydantic User n'expose pas le champ `id` (voir models/user.py)
    — /auth/get-user ne le renvoie donc jamais dans son JSON. Pour les tests
    qui ont besoin d'un vrai user_id (ex: accorder un mod scope), on va le
    chercher directement en base plutôt que de parser une réponse API qui
    ne l'a jamais contenu.
    """
    with psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT id FROM "User" WHERE username = %s', (username,))
            return cur.fetchone()["id"]


@pytest.fixture(scope="session")
def bettor_id(bettor_headers) -> int:
    return _user_id_by_username("test_bettor")


@pytest.fixture(scope="session")
def second_bettor_id(second_bettor_headers) -> int:
    return _user_id_by_username("test_bettor2")