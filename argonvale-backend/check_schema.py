import sqlite3
import os

DB_PATH = "argonvale.db"

def check_schema():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    def print_table_info(table_name):
        print(f"\n--- Table: {table_name} ---")
        try:
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            if not columns:
                print("Table does not exist.")
            else:
                for col in columns:
                    print(col)
        except Exception as e:
            print(f"Error checking {table_name}: {e}")

    print_table_info("items")
    print_table_info("trade_lots")
    print_table_info("trade_offers")

    conn.close()

if __name__ == "__main__":
    check_schema()
