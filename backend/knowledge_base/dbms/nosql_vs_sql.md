# DBMS: NoSQL vs SQL and CAP Theorem

## Relational Databases (SQL)
- Store data in **tables** with predefined schemas.
- Use **SQL** for querying.
- Support **ACID** transactions.
- Examples: MySQL, PostgreSQL, Oracle, SQL Server.
- Best for: structured data, complex queries, strong consistency requirements.

---

## NoSQL Databases
"Not Only SQL" — designed for scalability, flexibility, and high-velocity data.

### Types of NoSQL Databases

**1. Key-Value Store**
- Simplest model: each value accessed by a unique key.
- Extremely fast reads/writes.
- Examples: Redis, DynamoDB, Memcached.
- Use cases: Caching, session management, shopping carts.

**2. Document Store**
- Data stored as semi-structured documents (JSON, BSON, XML).
- Flexible schema — documents in same collection can have different fields.
- Examples: MongoDB, CouchDB, Firestore.
- Use cases: Product catalogs, user profiles, content management.

**3. Wide-Column Store (Columnar)**
- Data organized in column families (rows can have different columns).
- Optimized for write-heavy workloads and analytical queries.
- Examples: Apache Cassandra, HBase, BigTable.
- Use cases: Time-series data, IoT, event logging.

**4. Graph Database**
- Stores data as **nodes** (entities) and **edges** (relationships).
- Optimized for traversing relationships.
- Examples: Neo4j, Amazon Neptune.
- Use cases: Social networks, fraud detection, recommendation engines.

---

## SQL vs NoSQL Comparison

| Aspect | SQL (Relational) | NoSQL |
|---|---|---|
| Schema | Rigid, predefined | Flexible, dynamic |
| Scalability | Vertical (scale up) | Horizontal (scale out) |
| Query Language | Standardized SQL | Database-specific APIs |
| Transactions | Full ACID | Often eventual consistency (BASE) |
| Joins | Efficient | Often not supported |
| Data Model | Tables, rows | Documents, key-value, graph, columns |
| Best For | Structured data, complex queries | Large-scale unstructured data |

---

## BASE Properties (NoSQL)
As opposed to ACID, many NoSQL systems follow BASE:
- **B**asically **A**vailable: System guarantees availability (per CAP theorem).
- **S**oft state: State may change over time, even without input.
- **E**ventually Consistent: System will eventually become consistent, but not immediately.

---

## CAP Theorem (Brewer's Theorem)
In a distributed system, it is **impossible to simultaneously guarantee** all three of:

### C — Consistency
Every read receives the **most recent write** or an error. All nodes see the same data at the same time.

### A — Availability
Every request receives a **non-error response** (but not necessarily the latest data).

### P — Partition Tolerance
The system continues to function despite **network partitions** (communication failures between nodes).

> **In practice**: Network partitions are unavoidable in distributed systems. So the real choice is between **CP** and **AP**.

### CP Systems (Consistency + Partition Tolerance)
Sacrifice availability — during a partition, some nodes refuse requests to stay consistent.
- Examples: HBase, MongoDB (with strong consistency), Zookeeper.
- Use case: Banking, inventory management.

### AP Systems (Availability + Partition Tolerance)
Sacrifice strong consistency — during a partition, all nodes remain available but may return stale data.
- Examples: Cassandra, CouchDB, DynamoDB.
- Use case: Social media feeds, DNS.

### CA Systems (Consistency + Availability)
Only possible without network partitions — i.e., single-node systems. Not realistic for distributed systems.
- Examples: Traditional RDBMS (PostgreSQL, MySQL) — work in single-node mode.

---

## Sharding (Horizontal Partitioning)
Splitting a large database across multiple machines (shards), each holding a subset of the data.
- **Range-based sharding**: Rows partitioned by key range (e.g., users A-M on shard 1).
- **Hash-based sharding**: Hash of key determines shard — good distribution.
- **Directory-based**: Lookup table maps keys to shards.

## Replication
Keeping copies of data on multiple nodes for fault tolerance and read scalability.
- **Master-Slave**: One master handles writes; slaves replicate for reads.
- **Master-Master**: Multiple masters accept writes — more complex conflict resolution.
- **Eventual Consistency**: Replicas eventually sync, but may serve stale data in the interim.

## Key Interview Questions
1. What is the CAP theorem and what are the trade-offs?
2. When would you choose NoSQL over SQL?
3. What is the difference between ACID and BASE?
4. What is sharding and when is it needed?
5. What is eventual consistency?
