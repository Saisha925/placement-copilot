# DSA: Trees and Graphs

## Trees

### Binary Tree
Each node has at most **two children** (left and right).

**Types**:
- **Full Binary Tree**: Every node has 0 or 2 children.
- **Complete Binary Tree**: All levels filled except possibly the last, filled left to right. Used in heaps.
- **Perfect Binary Tree**: All internal nodes have 2 children; all leaves at same level.
- **Balanced Binary Tree**: Height is O(log n) — no subtree is much taller than another.
- **Degenerate (Skewed) Tree**: Every node has only one child — degenerates to linked list; O(n) operations.

### Binary Search Tree (BST)
- Left subtree contains nodes with keys **less than** the root.
- Right subtree contains nodes with keys **greater than** the root.
- In-order traversal of a BST gives **sorted output**.

**Operations**:
- Search: O(h) where h = height. O(log n) balanced, O(n) worst case.
- Insert: Navigate to correct position, insert as leaf.
- Delete: Three cases — no children (remove), one child (bypass), two children (replace with in-order successor).

### Tree Traversals
```python
def inorder(node):    # Left, Root, Right — gives sorted order for BST
    if node:
        inorder(node.left)
        print(node.val)
        inorder(node.right)

def preorder(node):   # Root, Left, Right — useful for copying tree
    if node:
        print(node.val)
        preorder(node.left)
        preorder(node.right)

def postorder(node):  # Left, Right, Root — useful for deleting tree
    if node:
        postorder(node.left)
        postorder(node.right)
        print(node.val)

def level_order(root):  # BFS level by level
    from collections import deque
    q = deque([root])
    while q:
        node = q.popleft()
        print(node.val)
        if node.left: q.append(node.left)
        if node.right: q.append(node.right)
```

### Balanced BSTs

**AVL Tree**:
- Self-balancing BST where the **height difference** between left and right subtrees (balance factor) is at most 1.
- After insert/delete, perform **rotations** (left, right, left-right, right-left) to rebalance.

**Red-Black Tree**:
- Self-balancing BST with coloring rules (each node is Red or Black).
- Less strictly balanced than AVL but faster insert/delete (fewer rotations).
- Used in Java `TreeMap`, C++ `std::map`.

### Heap
A **complete binary tree** satisfying the heap property:
- **Max-Heap**: Every parent ≥ its children. Root is maximum.
- **Min-Heap**: Every parent ≤ its children. Root is minimum.

**Operations**: Insert O(log n), Extract-max/min O(log n), Peek O(1).

**Implementation**: Stored as array. For node at index `i`:
- Left child: `2i + 1`. Right child: `2i + 2`. Parent: `(i-1) // 2`.

**Heapify**: O(n) to build a heap from an unsorted array.

**Use cases**: Priority queue, heap sort, Dijkstra's algorithm, k-th largest element.

---

## Graphs

### Representation

**Adjacency Matrix** (`V × V` matrix):
- `matrix[i][j] = 1` if edge from i to j.
- **Pros**: O(1) edge lookup, O(1) add/remove edge.
- **Cons**: O(V²) space — bad for sparse graphs.

**Adjacency List** (list of lists or dict):
- `graph[i]` = list of neighbors of vertex i.
- **Pros**: O(V + E) space — great for sparse graphs.
- **Cons**: O(degree) edge lookup.

### Graph Traversal

**Depth-First Search (DFS)**:
```python
def dfs(graph, node, visited=None):
    if visited is None: visited = set()
    visited.add(node)
    for neighbor in graph[node]:
        if neighbor not in visited:
            dfs(graph, neighbor, visited)
```
- Uses a stack (or recursion stack).
- Good for: cycle detection, topological sort, finding connected components, path finding.

**Breadth-First Search (BFS)**:
```python
from collections import deque
def bfs(graph, start):
    visited = set([start])
    queue = deque([start])
    while queue:
        node = queue.popleft()
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
```
- Uses a queue.
- Finds **shortest path** in unweighted graphs.
- Good for: level-order traversal, shortest path in unweighted graph.

### Shortest Path Algorithms

**Dijkstra's Algorithm** (non-negative weights):
- Greedy: Always process the unvisited node with the smallest known distance.
- Uses a min-heap (priority queue).
- Time: O((V + E) log V).
- Cannot handle negative weights.

**Bellman-Ford** (allows negative weights):
- Relax all edges V-1 times.
- Detects negative weight cycles.
- Time: O(V × E).

**Floyd-Warshall** (all-pairs shortest path):
- Dynamic programming approach.
- Time: O(V³). Space: O(V²).

### Minimum Spanning Tree (MST)

**Kruskal's Algorithm**:
- Sort all edges by weight; add edge if it doesn't create a cycle (use Union-Find).
- Time: O(E log E).

**Prim's Algorithm**:
- Start from any node; greedily add the cheapest edge connecting tree to a new node.
- Uses a min-heap. Time: O((V + E) log V).

### Topological Sort (DAGs)
Linear ordering of vertices such that for every directed edge u→v, u comes before v.
Only possible for Directed Acyclic Graphs (DAGs).

**Kahn's Algorithm (BFS-based)**:
1. Find all nodes with in-degree 0; add to queue.
2. Process queue: for each node, reduce in-degree of neighbors; add any that reach 0.
3. If all nodes processed → valid topological order. Else → cycle exists.

**DFS-based**: Perform DFS; on node's completion (all neighbors visited), push to stack. Reverse stack = topological order.

**Use cases**: Dependency resolution, course prerequisites, build systems.

## Key Interview Questions
1. What is the difference between a tree and a graph?
2. What is the difference between DFS and BFS? When would you use each?
3. How does Dijkstra's algorithm work? Why can't it handle negative weights?
4. What is a topological sort and when is it used?
5. What is the time complexity of building a heap from an unsorted array?
