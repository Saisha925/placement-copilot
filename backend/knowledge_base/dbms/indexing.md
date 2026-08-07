# DBMS: Indexing

An index is a data structure that improves the speed of data retrieval operations on a database table at the cost of additional storage and slower write operations.

## Why Indexing?
Without an index, a query like `SELECT * FROM employees WHERE emp_id = 1000` requires a full table scan — O(n) in time. An index allows near-O(log n) lookup.

---

## Types of Indexes

### Primary Index
- Built on the **primary key** of an ordered file.
- One entry per data block (sparse index).
- Key + pointer to data block.

### Clustered (Clustering) Index
- The physical order of rows on disk **matches** the index order.
- Only **one clustered index per table** (since data can only be sorted one way).
- Very efficient for range queries (e.g., `WHERE salary BETWEEN 40000 AND 80000`).
- In SQL Server / MySQL InnoDB: the primary key is the clustered index by default.

### Non-Clustered Index
- The physical order of rows **does not match** the index.
- Index contains key + row pointer (row ID / physical location).
- Multiple non-clustered indexes are allowed per table.
- An extra lookup (index → row pointer → actual data) is needed — called a "double dip".

### Dense Index
- One index entry for every search key value in the data file.
- Faster lookup but more storage.

### Sparse Index
- Index entries for only some search key values (e.g., one per block).
- Less storage but requires scanning within a block after reaching it.

### Composite (Multi-Column) Index
- Index on two or more columns. `CREATE INDEX idx ON orders(customer_id, order_date)`.
- Useful for queries filtering on multiple columns.
- **Left-prefix rule**: Only leading columns can be used without the others. An index on (A, B, C) can be used for queries on A or A+B or A+B+C but not B alone.

### Covering Index
- An index that contains **all columns needed** by a query — no need to look up actual row.
- The query is "covered" by the index alone.

### Unique Index
- Ensures all values in the indexed column(s) are unique.
- Automatically created with `PRIMARY KEY` and `UNIQUE` constraints.

---

## B-Tree Index (Most Common)
The standard index structure in most RDBMS (MySQL, PostgreSQL, Oracle).

### Structure
- A **balanced search tree** where all leaf nodes are at the same depth.
- Each node contains multiple keys and child pointers.
- **B+ Tree** (most common variant):
  - All actual data (or pointers) stored only in **leaf nodes**.
  - Leaf nodes linked together as a doubly linked list — great for range scans.
  - Internal nodes store only keys for navigation.

### Properties
- Height: O(log N) — very shallow for large tables.
- Search, insert, delete: O(log N).
- The **fan-out** (number of children per node) is large due to block-aligned node size, keeping height small (typically 3–4 levels for millions of rows).

---

## Hash Index
- Uses a hash function to map keys directly to bucket locations.
- **O(1) average** lookup — faster than B-Tree for exact-match queries.
- **Cannot** support range queries (e.g., `WHERE id > 500`).
- Collisions handled by chaining (linked list) or open addressing.
- Used in MySQL MEMORY engine, some PostgreSQL use cases.

---

## Full-Text Index
- For searching text content (words, phrases).
- Used with `MATCH ... AGAINST` in MySQL, `tsvector` in PostgreSQL.
- Supports relevance ranking.

---

## Index Trade-offs

| Aspect | With Index | Without Index |
|---|---|---|
| SELECT (exact match) | Fast — O(log n) | Slow — O(n) full scan |
| SELECT (range) | Fast (B-Tree only) | Slow |
| INSERT / UPDATE / DELETE | Slower (index maintenance) | Faster |
| Storage | More space needed | Less space |

---

## When to Create an Index
- Columns frequently used in `WHERE`, `JOIN`, `ORDER BY`, `GROUP BY` clauses.
- Columns with high cardinality (many unique values — good) vs. low cardinality (few unique values like boolean — bad candidate).
- Foreign key columns used in JOINs.

## When NOT to Index
- Small tables (full scan is fast enough).
- Columns rarely used in queries.
- Tables with very frequent inserts/updates/deletes.
- Columns with very low cardinality.

## Key Interview Questions
1. What is the difference between a clustered and a non-clustered index?
2. How does a B+ Tree differ from a B-Tree, and why is it preferred for databases?
3. Why can a hash index not support range queries?
4. What is a covering index?
5. What is the left-prefix rule for composite indexes?
