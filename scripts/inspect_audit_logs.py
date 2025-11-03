from sqlalchemy import inspect
from app.db.session import engine

def inspect_audit_logs():
    inspector = inspect(engine)
    
    print("Table: audit_logs")
    columns = inspector.get_columns("audit_logs")
    for column in columns:
        print(f"- {column['name']}: {column['type']}")

if __name__ == "__main__":
    inspect_audit_logs()