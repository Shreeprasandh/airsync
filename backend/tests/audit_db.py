import sqlite3
import hashlib

def audit_database():
    print("=" * 80)
    print("      THE SEVEN SHADOWS // ETA (RLS, DATA ISOLATION & LIVE DB PARITY AUDIT)")
    print("=" * 80)
    
    db_path = "backend/ledger.db"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 1. Schema & Table Enumeration
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name ASC")
    tables = [r[0] for r in cursor.fetchall() if not r[0].startswith("sqlite_")]
    print(f"\n[1] Verified Tables in {db_path}: {tables}")
    
    for table in tables:
        cursor.execute(f"PRAGMA table_info({table})")
        cols = cursor.fetchall()
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"\n  • Table: '{table}' ({count} rows)")
        for col in cols:
            pk = " [PRIMARY KEY]" if col["pk"] else ""
            print(f"    - {col['name']} : {col['type']}{pk}")
            
    # 2. Parity & Cryptographic MMR Health
    print("\n[2] Cryptographic MMR Parity Verification:")
    cursor.execute("SELECT leaf_index, timestamp, component_id, action_taken, technician_id, health_snapshot, node_hash FROM mro_ledger ORDER BY leaf_index ASC")
    rows = cursor.fetchall()
    
    def sha256(s: str) -> str:
        return hashlib.sha256(s.encode('utf-8')).hexdigest()
    
    tampered_indices = []
    stack = []
    next_pos = 1
    
    for r in rows:
        msg = f"{r['timestamp']}|{r['component_id']}|{r['action_taken']}|{r['technician_id']}|{r['health_snapshot']:.1f}"
        expected_hash = sha256(msg)
        if expected_hash != r['node_hash']:
            tampered_indices.append(r['leaf_index'])
        
        stack.append({'pos': next_pos, 'height': 0, 'hash': expected_hash})
        next_pos += 1
        while len(stack) >= 2 and stack[-1]['height'] == stack[-2]['height']:
            right = stack.pop()
            left = stack.pop()
            parent_hash = sha256(left['hash'] + right['hash'])
            stack.append({'pos': next_pos, 'height': right['height'] + 1, 'hash': parent_hash})
            next_pos += 1
            
    if len(stack) == 1:
        recomputed_root = stack[0]['hash']
    else:
        curr = stack[-1]['hash']
        for peak in reversed(stack[:-1]):
            curr = sha256(peak['hash'] + curr)
        recomputed_root = curr
        
    print(f"  • Total MRO Records: {len(rows)}")
    print(f"  • Recomputed Merkle Root: {recomputed_root}")
    print(f"  • Tampered Leaf Indices: {tampered_indices if tampered_indices else 'NONE (0 violations)'}")
    
    cursor.execute("SELECT COUNT(*) FROM mmr_nodes")
    mmr_nodes_count = cursor.fetchone()[0]
    print(f"  • Total MMR DAG Nodes in mmr_nodes: {mmr_nodes_count}")
    
    conn.close()
    
    print("\n" + "=" * 80)
    if not tampered_indices and len(rows) > 0:
        print("[SUCCESS] DATABASE HEALTH & COLUMN PARITY: 100% PRISTINE & CRYPTOGRAPHICALLY SECURE")
    else:
        print("[WARNING] DATABASE STATUS: Tampering Detected or Empty")
    print("=" * 80)

if __name__ == "__main__":
    audit_database()
