import psycopg2
from pathlib import Path

def setup_db():
    conn = psycopg2.connect(dbname='postgres', user='postgres', password='root', host='localhost', port=5432)
    conn.autocommit = True
    cur = conn.cursor()
    
    cur.execute("SELECT 1 FROM pg_roles WHERE rolname='marcom_user';")
    if not cur.fetchone():
        cur.execute("CREATE USER marcom_user WITH PASSWORD 'marcom_secure_password' SUPERUSER;")
        print("User marcom_user created.")
    else:
        print("User marcom_user already exists.")
        
    cur.execute("SELECT 1 FROM pg_database WHERE datname='marcom_db';")
    if not cur.fetchone():
        cur.execute("CREATE DATABASE marcom_db OWNER marcom_user;")
        print("Database marcom_db created.")
    else:
        print("Database marcom_db already exists.")
        
    conn.close()

    # Now execute init.sql on marcom_db
    init_sql_path = Path(__file__).parent.parent / "database" / "init.sql"
    sql_text = init_sql_path.read_text(encoding="utf-8")

    db_conn = psycopg2.connect(dbname='marcom_db', user='marcom_user', password='marcom_secure_password', host='localhost', port=5432)
    db_conn.autocommit = True
    db_cur = db_conn.cursor()
    db_cur.execute(sql_text)
    print("Database init.sql executed successfully.")
    db_conn.close()

if __name__ == "__main__":
    setup_db()
