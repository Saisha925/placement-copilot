# Operating Systems: Deadlocks

A deadlock is a situation where a set of processes are blocked, each waiting for a resource held by another process in the set — resulting in a circular wait with no process able to proceed.

## Necessary Conditions for Deadlock (Coffman Conditions)
All four must hold simultaneously for a deadlock to occur:

1. **Mutual Exclusion**: At least one resource must be held in a non-shareable mode (only one process at a time).
2. **Hold and Wait**: A process holds at least one resource and is waiting to acquire additional resources held by other processes.
3. **No Preemption**: Resources cannot be forcibly taken from a process; they must be released voluntarily.
4. **Circular Wait**: A set {P1, P2, ..., Pn} exists such that P1 is waiting for P2, P2 for P3, ..., Pn for P1.

## Resource Allocation Graph (RAG)
- **Request Edge**: Process → Resource (process requesting resource).
- **Assignment Edge**: Resource → Process (resource allocated to process).
- **Deadlock Detection**: If the graph contains a cycle AND there is only one instance of each resource type → deadlock. If multiple instances, a cycle is necessary but not sufficient.

## Deadlock Handling Strategies

### 1. Prevention — Break at Least One Coffman Condition
- **Mutual Exclusion**: Make resources shareable where possible (e.g., read-only files). Cannot eliminate for all resources.
- **Hold and Wait**: Require processes to request ALL resources at once before executing. OR: release all resources before requesting new ones. Leads to low resource utilization and starvation.
- **No Preemption**: If a process requests a resource that cannot be immediately allocated, preempt all its currently held resources.
- **Circular Wait**: Impose a total ordering on resource types; processes must request resources in increasing order.

### 2. Avoidance — Banker's Algorithm
The OS dynamically decides whether to grant a resource request based on whether the system remains in a **safe state**.

- **Safe State**: There exists a sequence in which all processes can finish.
- **Unsafe State**: No guarantee — may lead to deadlock.
- **Banker's Algorithm** (Dijkstra):
  - Requires processes to declare maximum resource needs upfront.
  - For each resource request, simulate allocation and check if a safe sequence exists.
  - If safe → grant. If unsafe → process must wait.
  - **Data structures**: `Allocation`, `Max`, `Need` (= Max - Allocation), `Available`.

**Safety Algorithm Steps**:
1. Find process whose `Need[i] <= Work` (Work = available resources).
2. If found, simulate completion: `Work = Work + Allocation[i]`, mark as finished.
3. Repeat until all finish (safe) or no such process found (unsafe).

### 3. Detection & Recovery
Allow deadlocks to occur, detect them, and recover.
- **Detection**: Run a deadlock detection algorithm periodically (similar to Banker's but checks current state, not future safety).
- **Recovery Options**:
  - **Process Termination**: Abort all deadlocked processes (expensive) or abort one at a time until deadlock broken.
  - **Resource Preemption**: Preempt resources from some processes (choose victim by cost), rollback process, avoid starvation.

### 4. Ignore (Ostrich Algorithm)
Pretend deadlocks never occur. Used by most operating systems (Windows, Linux) in practice — deadlocks are rare and the cost of handling them outweighs the benefit.

## Livelock vs Deadlock vs Starvation
- **Deadlock**: Processes blocked forever, no progress.
- **Livelock**: Processes keep changing state in response to each other but make no progress (e.g., two people stepping aside in the same direction repeatedly).
- **Starvation**: A process waits indefinitely but is not necessarily blocked — other processes keep getting preference.

## Key Interview Questions
1. What are the four necessary conditions for a deadlock?
2. Explain the Banker's Algorithm with an example.
3. What is the difference between deadlock prevention and deadlock avoidance?
4. How is a resource allocation graph used to detect deadlocks?
5. What is the difference between deadlock, livelock, and starvation?
