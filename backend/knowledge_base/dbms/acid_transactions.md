# DBMS: ACID Properties and Transactions

## What is a Transaction?
A transaction is a **sequence of one or more SQL operations** executed as a single logical unit of work. Either all operations succeed (commit) or all fail and are rolled back.

Example: Transferring ₹5,000 from Account A to Account B requires:
1. Debit ₹5,000 from A
2. Credit ₹5,000 to B
Both must succeed or neither should apply.

---

## ACID Properties

### A — Atomicity
"All or nothing."
- A transaction either **fully completes** or is **fully aborted**.
- If a crash occurs mid-transaction, the database rolls back to the state before the transaction started.
- Implemented via **undo logs** (rollback segments).

### C — Consistency
- A transaction brings the database from one **valid state** to another valid state.
- All data integrity rules (constraints, triggers, cascades) must be satisfied before and after the transaction.
- Example: Total balance across all accounts must remain constant after a transfer.

### I — Isolation
- Concurrent transactions execute as if they were **serialized** (run one after another).
- Intermediate states of a transaction are **not visible** to other transactions.
- Implemented via **locking** or **MVCC** (Multi-Version Concurrency Control).

### D — Durability
- Once a transaction is **committed**, changes are permanent — even in the event of system failure.
- Implemented via **write-ahead logs (WAL)**: changes written to log before being applied to the database.

---

## Transaction Control Commands
```sql
BEGIN;              -- Start transaction
SAVEPOINT sp1;      -- Create a savepoint
UPDATE accounts SET balance = balance - 5000 WHERE id = 'A';
UPDATE accounts SET balance = balance + 5000 WHERE id = 'B';
COMMIT;             -- Permanently save changes
-- OR
ROLLBACK;           -- Undo all changes since BEGIN
ROLLBACK TO sp1;    -- Undo back to savepoint
```

---

## Concurrency Issues (without proper isolation)

### Dirty Read
Reading **uncommitted data** from another transaction. If that transaction rolls back, you read data that never "existed."

### Non-Repeatable Read
Reading the **same row twice** in a transaction and getting different values because another transaction **updated** it in between.

### Phantom Read
Re-executing a query returns **different rows** because another transaction **inserted or deleted** rows matching the query condition.

### Lost Update
Two transactions read the same value, modify it, and both write back — one **overwrites the other's update**.

---

## Isolation Levels (SQL Standard)

Isolation levels trade off between data consistency and performance/concurrency:

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read |
|---|---|---|---|
| **READ UNCOMMITTED** | Possible | Possible | Possible |
| **READ COMMITTED** | Prevented | Possible | Possible |
| **REPEATABLE READ** | Prevented | Prevented | Possible |
| **SERIALIZABLE** | Prevented | Prevented | Prevented |

- **READ COMMITTED** is the default in PostgreSQL, Oracle.
- **REPEATABLE READ** is the default in MySQL InnoDB.
- **SERIALIZABLE** is the most strict — lowest concurrency.

---

## Concurrency Control Mechanisms

### Two-Phase Locking (2PL)
Transactions acquire all locks before releasing any:
1. **Growing Phase**: Transaction acquires locks (no releasing).
2. **Shrinking Phase**: Transaction releases locks (no acquiring).
**Guarantees serializability** but can lead to deadlocks.

**Variants**:
- **Strict 2PL**: All exclusive locks held until commit/abort — prevents cascading rollbacks.
- **Rigorous 2PL**: All locks held until commit/abort.

### Multi-Version Concurrency Control (MVCC)
- Each write creates a **new version** of the data; readers see a consistent snapshot.
- Readers don't block writers; writers don't block readers.
- Used by PostgreSQL, MySQL InnoDB, Oracle.
- Solves dirty reads and non-repeatable reads with minimal blocking.

### Timestamp-Based Concurrency Control
- Each transaction gets a timestamp on start.
- Conflicts resolved based on timestamp ordering — no locks needed.
- Older transactions take priority.

---

## Recovery Techniques

### Log-Based Recovery (Write-Ahead Log — WAL)
- Every modification is logged **before** being applied to the database.
- Log entry: `[transaction_id, data_item, old_value, new_value]`
- **Undo**: Roll back uncommitted transactions using old values.
- **Redo**: Reapply committed transactions using new values.

### Checkpoint
- Periodic point where the DBMS writes all in-memory (dirty) pages to disk and records a checkpoint in the log.
- On recovery, only process transactions after the last checkpoint — reduces recovery time.

## Key Interview Questions
1. Explain the ACID properties with real-world examples.
2. What is the difference between dirty read, non-repeatable read, and phantom read?
3. What is Two-Phase Locking and how does it ensure serializability?
4. What is MVCC and how is it different from locking?
5. Why is durability implemented using write-ahead logging?
