# DSA: Complexity Analysis (Big-O Notation)

Complexity analysis gives us a mathematical way to describe the efficiency of algorithms in terms of **time** and **space**, independent of hardware or implementation language.

---

## Big-O Notation

Big-O describes the **upper bound** of an algorithm's growth rate — how performance scales with input size `n` in the **worst case**.

### Common Complexities (Best to Worst)

| Notation | Name | Example |
|---|---|---|
| O(1) | Constant | Array index access, hash map lookup |
| O(log n) | Logarithmic | Binary search, BST operations |
| O(n) | Linear | Linear search, single loop |
| O(n log n) | Linearithmic | Merge sort, Heap sort, Quick sort (avg) |
| O(n²) | Quadratic | Bubble sort, Selection sort, nested loops |
| O(n³) | Cubic | Floyd-Warshall, naive matrix multiplication |
| O(2ⁿ) | Exponential | Recursive Fibonacci, power set generation |
| O(n!) | Factorial | Traveling Salesman (brute force), permutations |

### Other Notations
- **Big-Ω (Omega)**: Lower bound (best case).
- **Big-Θ (Theta)**: Tight bound (both upper and lower).
- Most interviews ask for **Big-O (worst case)** unless specified otherwise.

---

## Time Complexity Examples

### O(1) — Constant
```python
def get_first(arr):
    return arr[0]  # Always one operation regardless of size
```

### O(log n) — Logarithmic
```python
def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target: return mid
        elif arr[mid] < target: lo = mid + 1
        else: hi = mid - 1
    return -1
# Each iteration halves the search space: log₂(n) iterations
```

### O(n) — Linear
```python
def find_max(arr):
    max_val = arr[0]
    for x in arr:  # n iterations
        if x > max_val: max_val = x
    return max_val
```

### O(n log n)
```python
def merge_sort(arr):
    if len(arr) <= 1: return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])    # T(n/2)
    right = merge_sort(arr[mid:])   # T(n/2)
    return merge(left, right)       # O(n) to merge
# Recurrence: T(n) = 2T(n/2) + O(n) → O(n log n) by Master Theorem
```

### O(n²) — Quadratic
```python
def bubble_sort(arr):
    for i in range(len(arr)):        # n
        for j in range(len(arr)-i-1):  # n
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
```

---

## Space Complexity

The amount of extra memory used relative to input size.

- `O(1)` extra space: In-place algorithms (most sorting sorts).
- `O(n)` extra space: Arrays, storing a copy of input.
- `O(log n)` extra space: Recursive call stack for divide-and-conquer.
- `O(n)` space for recursion: Recursive DFS on a linear tree.

---

## Amortized Analysis

Some operations are expensive occasionally but cheap on average.

**Example — Dynamic Array (Python list) `append()`**:
- Usually O(1) — just adds to end.
- Occasionally O(n) — when resizing (doubles capacity).
- **Amortized**: Still O(1) per operation when averaged over many appends.

---

## Master Theorem

For recurrences of the form `T(n) = a·T(n/b) + f(n)`:

Where `a` = number of subproblems, `b` = factor by which problem shrinks, `f(n)` = work done outside recursive calls.

Let `c = log_b(a)`:
- If `f(n) = O(n^(c-ε))` for some ε > 0: **T(n) = Θ(n^c)** (recursion dominates)
- If `f(n) = Θ(n^c)`: **T(n) = Θ(n^c log n)** (both equal)
- If `f(n) = Ω(n^(c+ε))` for some ε > 0: **T(n) = Θ(f(n))** (divide step dominates)

**Examples**:
- Merge Sort: `T(n) = 2T(n/2) + O(n)` → c = log₂2 = 1, f(n) = n → Case 2 → **O(n log n)**
- Binary Search: `T(n) = T(n/2) + O(1)` → c = 0, f(n) = 1 = n⁰ → Case 2 → **O(log n)**

---

## Data Structure Complexities Reference

| Data Structure | Access | Search | Insert | Delete |
|---|---|---|---|---|
| Array | O(1) | O(n) | O(n) | O(n) |
| Linked List | O(n) | O(n) | O(1) | O(1) |
| Hash Map | O(1) avg | O(1) avg | O(1) avg | O(1) avg |
| Binary Search Tree (balanced) | O(log n) | O(log n) | O(log n) | O(log n) |
| Heap | O(1) peek | O(n) | O(log n) | O(log n) |
| Stack / Queue | O(1) | O(n) | O(1) | O(1) |

## Key Interview Questions
1. What is the difference between time complexity and space complexity?
2. What does O(n log n) mean? Give an example of an O(n log n) algorithm.
3. What is amortized complexity?
4. What is the Master Theorem and how do you apply it?
5. What is the time complexity of searching in a hash map? What happens in the worst case?
