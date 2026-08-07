# Operating Systems: CPU Scheduling

CPU Scheduling is the process of determining which process in the ready queue gets CPU time. The goal is to maximize CPU utilization and throughput while minimizing turnaround time, waiting time, and response time.

## Scheduling Criteria
- **CPU Utilization**: Keep CPU as busy as possible.
- **Throughput**: Number of processes completed per time unit.
- **Turnaround Time**: Time from submission to completion of a process.
- **Waiting Time**: Total time spent in the ready queue.
- **Response Time**: Time from submission to first response (important for interactive systems).

## Types of Scheduling
- **Preemptive**: CPU can be taken away from a running process (e.g., Round Robin, SRTF).
- **Non-Preemptive**: CPU runs the process until it finishes or voluntarily releases (e.g., FCFS, SJF).

## Scheduling Algorithms

### 1. First Come First Served (FCFS)
- Processes are scheduled in arrival order (FIFO queue).
- **Non-preemptive**.
- Simple but suffers from **Convoy Effect**: short processes stuck behind long ones.
- Average waiting time can be very high.

### 2. Shortest Job First (SJF) / Shortest Job Next (SJN)
- Process with the smallest next CPU burst is scheduled first.
- **Non-preemptive SJF**: Once process starts, runs to completion.
- **Preemptive SJF (SRTF — Shortest Remaining Time First)**: If a new process arrives with shorter burst than remaining burst of current, preempt.
- **Optimal** in minimizing average waiting time — but requires knowing future burst length (often estimated with exponential averaging).

### 3. Priority Scheduling
- Each process assigned a priority; highest priority runs first.
- Can be preemptive or non-preemptive.
- **Problem**: Starvation — low-priority processes may never run.
- **Solution**: Aging — gradually increase priority of waiting processes over time.

### 4. Round Robin (RR)
- Each process gets a fixed time quantum (time slice), then preempted and added to end of queue.
- **Preemptive** — designed for time-sharing systems.
- **Smaller quantum**: Better response time but more context switches (overhead).
- **Larger quantum**: Degenerates toward FCFS.
- Fair — no starvation. Average waiting time often higher than SJF.

### 5. Multilevel Queue Scheduling
- Ready queue partitioned into multiple queues (e.g., interactive, batch, system).
- Each queue has its own scheduling algorithm.
- Processes permanently assigned to a queue — no movement between queues.

### 6. Multilevel Feedback Queue (MLFQ)
- Like multilevel queue, but processes can **move between queues** based on behavior.
- If a process uses too much CPU time, it moves to a lower-priority queue.
- I/O-bound and short processes stay in higher-priority queues.
- Considered the most flexible and general scheduling algorithm.

## Key Metrics (Example Calculation)
For processes P1 (burst=6), P2 (burst=2), P3 (burst=8) arriving at time 0:
- **FCFS**: Avg wait = (0 + 6 + 8) / 3 = 4.67 ms
- **SJF**: Avg wait = (0 + 2 + 8) / 3 = ... (orders P2, P1, P3) = (6 + 0 + 8) / 3 = 4.67... wait calculated differently: P2 waits 0, P1 waits 2, P3 waits 8 → avg = 3.33 ms

## Dispatcher
The dispatcher is the module that gives CPU control to the selected process:
- Switching context
- Switching to user mode
- Jumping to the correct location in user program
- **Dispatch Latency**: Time it takes for dispatcher to stop one process and start another.

## Key Interview Questions
1. What is the difference between preemptive and non-preemptive scheduling?
2. Why does Round Robin work well for time-sharing systems?
3. What is the Convoy Effect and which algorithm suffers from it?
4. How does aging solve the starvation problem in Priority Scheduling?
5. What is the optimal scheduling algorithm and why can't it be implemented in practice?
