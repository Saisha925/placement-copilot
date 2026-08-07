# System Design: Fundamentals and Scalability

System design interviews test your ability to design large-scale distributed systems. You'll be asked to architect systems like "Design Twitter", "Design a URL Shortener", or "Design YouTube."

---

## Core Concepts

### Scalability
The ability of a system to handle growing amounts of work.

**Vertical Scaling (Scale Up)**:
- Add more power (CPU, RAM, SSD) to an existing server.
- Simple, no application changes needed.
- **Limits**: Single point of failure; hardware has physical limits; expensive.

**Horizontal Scaling (Scale Out)**:
- Add more machines to distribute the load.
- More complex (requires load balancing, distributed coordination).
- Nearly unlimited scalability; more fault-tolerant.
- Used by Google, Amazon, Netflix.

---

## Load Balancer
Distributes incoming requests across multiple servers.

**Algorithms**:
- **Round Robin**: Requests distributed sequentially to each server.
- **Weighted Round Robin**: Servers with more capacity get more requests.
- **Least Connections**: Route to the server with fewest active connections.
- **IP Hash**: Route same client IP to the same server (session affinity).
- **Random**: Random server selection.

**Types**:
- **L4 Load Balancer (Transport Layer)**: Routes based on IP and TCP port — fast, no content inspection.
- **L7 Load Balancer (Application Layer)**: Routes based on HTTP headers, URL, cookies — smarter routing.

**Use cases**: Nginx, AWS ALB/NLB, HAProxy.

---

## Caching

Storing copies of frequently accessed data in fast storage to reduce latency and database load.

### Cache Strategies

**Cache-Aside (Lazy Loading)**:
1. Check cache. If hit → return. If miss → query DB → store in cache → return.
- Most common. Cache only contains data that is actually requested.
- First request always has a miss (cold start).

**Write-Through**:
- Write to cache AND database simultaneously.
- Data always consistent but every write hits the DB.

**Write-Behind (Write-Back)**:
- Write to cache first; asynchronously write to DB later.
- Fast writes but risk of data loss if cache crashes before DB write.

**Read-Through**:
- Cache automatically fetches from DB on miss.

### Cache Eviction Policies
- **LRU (Least Recently Used)**: Evict item unused for longest time. Most common.
- **LFU (Least Frequently Used)**: Evict item used least often.
- **FIFO**: Evict oldest item.

### Cache Invalidation (Hardest problem in CS)
When does cached data become stale?
- **TTL (Time to Live)**: Expire cache after fixed duration.
- **Event-driven invalidation**: Invalidate on write.

**Cache Technologies**: Redis (in-memory, rich data structures), Memcached (simple key-value, multi-threaded).

---

## Database Scaling

### Read Replicas
- One **primary** handles writes; multiple **replicas** handle reads.
- Replication is asynchronous — replicas may be slightly behind (eventual consistency).
- Dramatically increases read throughput.

### Database Sharding (Horizontal Partitioning)
Split data across multiple DB instances (shards):
- **Range-based**: Users A-M on shard 1, N-Z on shard 2.
- **Hash-based**: `shard = hash(user_id) % num_shards` — even distribution.
- **Directory-based**: Lookup service maps keys to shards.

**Challenges**: Cross-shard queries are hard; resharding is painful; joins across shards don't work.

### Connection Pooling
Maintain a pool of pre-established DB connections to reuse, avoiding the overhead of creating a new connection per request. (e.g., PgBouncer for PostgreSQL).

---

## Content Delivery Network (CDN)

Geographically distributed network of servers that cache static content (images, JS, CSS, videos) close to users.

- User requests go to nearest CDN **Point of Presence (PoP)**.
- Reduces latency (network hops), reduces load on origin server.
- Examples: Cloudflare, AWS CloudFront, Akamai, Fastly.

**Push CDN**: You push content to CDN proactively.
**Pull CDN**: CDN fetches from origin on first request, caches for subsequent requests.

---

## Message Queues (Async Processing)

Decouple producers (senders) from consumers (processors) for async, reliable communication.

**Benefits**:
- **Decoupling**: Producer doesn't wait for consumer to process.
- **Buffering**: Handle traffic spikes — queue absorbs burst traffic.
- **Reliability**: Messages persisted; consumers can retry failed messages.
- **Scalability**: Add more consumers to scale processing.

**Technologies**: Apache Kafka, RabbitMQ, AWS SQS, Google Pub/Sub.

**Kafka Concepts**:
- **Topic**: Category of messages.
- **Partition**: Topics split into partitions for parallelism.
- **Consumer Group**: Multiple consumers sharing partitions for parallel processing.
- **Offset**: Position of a message in a partition — consumers track their offset.
- High throughput (millions of messages/sec), durable (messages stored on disk).

---

## API Design Basics

### REST (Representational State Transfer)
- Stateless: Each request is self-contained.
- Resources identified by URLs.
- Standard HTTP methods (GET, POST, PUT, PATCH, DELETE).
- Returns JSON (typically).

### Rate Limiting
Limit how many requests a user/IP can make in a time window.
- Protect APIs from abuse, DoS attacks.
- Algorithms: **Token Bucket**, **Leaky Bucket**, **Fixed Window Counter**, **Sliding Window**.

---

## System Design Interview Framework

1. **Clarify requirements**: Functional (what it does) + Non-functional (scale, latency, consistency).
2. **Estimate scale**: Users, requests/sec, data stored, bandwidth.
3. **High-level design**: Core components, data flow diagram.
4. **Deep dive**: Database schema, API design, bottleneck identification.
5. **Scale the design**: Introduce load balancers, caches, sharding, CDN as needed.
6. **Address edge cases**: Failure handling, monitoring, consistency.

## Key Interview Questions
1. What is the difference between vertical and horizontal scaling?
2. How does a load balancer work and what are the different routing algorithms?
3. Explain cache-aside vs write-through caching strategies.
4. What is database sharding and what are its drawbacks?
5. Why use a message queue and when would you choose Kafka over RabbitMQ?
