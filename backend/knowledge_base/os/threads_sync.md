# Operating Systems: Threads and Synchronization

## Threads

### Process vs Thread
| Aspect | Process | Thread |
|---|---|---|
| Definition | Program in execution | Lightweight unit of execution within a process |
| Memory | Own address space | Shares address space with other threads of same process |
| Communication | Inter-process communication (IPC) needed | Shared memory directly |
| Creation overhead | High | Low |
| Context switch | Expensive | Cheap |
| Crash impact | Does not affect other processes | Can crash entire process |

### Thread Components
Each thread has its own:
- Thread ID
- Program counter
- Register set
- Stack

Threads share:
- Code section
- Data section (global variables)
- Heap memory
- Open files, signals

### User Threads vs Kernel Threads
- **User Threads**: Managed by user-level library (e.g., POSIX pthreads). Fast but OS unaware — one thread blocking blocks all.
- **Kernel Threads**: Managed by OS. Slower to create but OS can schedule them independently.
- **Multithreading Models**: Many-to-One, One-to-One, Many-to-Many.

### Benefits of Multithreading
- **Responsiveness**: Application continues even if part blocks.
- **Resource Sharing**: Threads share memory — efficient.
- **Economy**: Faster to create and context-switch than processes.
- **Scalability**: Threads can run truly in parallel on multi-core CPUs.

---

## Synchronization

### The Critical Section Problem
A **critical section** is code accessing shared data. The solution must satisfy:
1. **Mutual Exclusion**: Only one process in critical section at a time.
2. **Progress**: If no process is in the critical section, the decision of which process enters next cannot be postponed indefinitely.
3. **Bounded Waiting**: A limit must exist on how many times others enter before a waiting process is allowed.

### Race Condition
When the output depends on the order/timing of thread execution. Example: two threads incrementing a shared counter simultaneously may lose updates.

### Mutex (Mutual Exclusion Lock)
- A lock that allows only one thread to enter the critical section.
- `acquire()` → lock; `release()` → unlock.
- **Spinlock**: Thread busy-waits (spins) checking the lock — wastes CPU but has low latency for short waits.
- **Blocking Mutex**: Thread sleeps if lock unavailable — good for longer waits.

### Semaphore
An integer variable accessed through two atomic operations:
- **`wait(S)` (P operation)**: Decrement S. If S < 0, block the process.
- **`signal(S)` (V operation)**: Increment S. If S ≤ 0, wake a blocked process.

**Types**:
- **Binary Semaphore (0 or 1)**: Works like a mutex.
- **Counting Semaphore**: Allows N processes; useful for managing N identical resources.

**Difference from Mutex**: Mutex is owned (only the locking thread can unlock). Semaphore has no ownership — any thread can signal.

### Monitors
A high-level synchronization construct that encapsulates:
- Shared data
- Procedures to access that data
- Condition variables for signaling

Only one process can be active inside a monitor at a time. Used in Java (`synchronized` blocks) and other languages.

### Condition Variables
Used inside monitors for processes to wait for a specific condition:
- `wait()`: Release monitor lock and sleep until signaled.
- `signal()`: Wake one waiting process.
- `broadcast()`: Wake all waiting processes.

### Classic Synchronization Problems

**1. Producer-Consumer (Bounded Buffer)**:
Producer writes to buffer; consumer reads. Buffer is finite. Use semaphores: `empty` (initially N), `full` (initially 0), `mutex`.

**2. Readers-Writers Problem**:
Multiple readers can read simultaneously; writers need exclusive access. Priority variations: readers-preference vs writers-preference.

**3. Dining Philosophers Problem**:
5 philosophers alternately think and eat. 5 forks shared. Each needs 2 adjacent forks. Risk: deadlock if all pick up left fork simultaneously. Solutions: allow at most 4 to sit, or only pick up both forks atomically.

### Deadlock with Synchronization
Improper use of locks causes deadlock. Always acquire locks in a consistent order.

## Key Interview Questions
1. What is the difference between a process and a thread?
2. What are the three requirements for solving the critical section problem?
3. What is the difference between a mutex and a semaphore?
4. What is a race condition? Give an example.
5. Explain the Producer-Consumer problem and its solution using semaphores.
