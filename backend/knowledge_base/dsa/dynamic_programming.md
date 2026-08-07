# DSA: Dynamic Programming

Dynamic Programming (DP) is an optimization technique for solving problems with **overlapping subproblems** and **optimal substructure** — by solving each subproblem only once and storing results.

---

## When to Use DP

A problem is suitable for DP if it has:
1. **Optimal Substructure**: Optimal solution can be built from optimal solutions of subproblems.
2. **Overlapping Subproblems**: Same subproblems solved multiple times in naive recursion.

**Common Signals in Interview Problems**:
- "Find the minimum/maximum..."
- "How many ways to..."
- "Is it possible to..."
- Sequences, grids, intervals, subsets, subsequences.

---

## Two DP Approaches

### 1. Top-Down (Memoization)
Write the recursive solution, then add a cache to avoid recomputation.

```python
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n <= 1: return n
    return fib(n-1) + fib(n-2)
```

- Natural — mirrors the recursive thinking.
- Only computes subproblems that are actually needed.
- Stack overflow risk for very deep recursion.

### 2. Bottom-Up (Tabulation)
Build solution iteratively from smallest subproblems.

```python
def fib(n):
    if n <= 1: return n
    dp = [0] * (n + 1)
    dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i-1] + dp[i-2]
    return dp[n]
```

- No recursion overhead. More memory-efficient (often can reduce to O(1) or O(n) space).
- Slightly harder to think through.

---

## Classic DP Problems

### 1. 0/1 Knapsack
Given items with weights and values, maximize value in a knapsack of capacity W. Each item used at most once.

```python
def knapsack(weights, values, W):
    n = len(weights)
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(W + 1):
            dp[i][w] = dp[i-1][w]  # Skip item i
            if weights[i-1] <= w:
                dp[i][w] = max(dp[i][w], dp[i-1][w - weights[i-1]] + values[i-1])
    return dp[n][W]
```
Time: O(n × W). Space: O(n × W) → can optimize to O(W).

### 2. Longest Common Subsequence (LCS)
Longest sequence that is a subsequence of both strings.

```python
def lcs(s1, s2):
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i-1] == s2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    return dp[m][n]
```
Time: O(m × n).

### 3. Longest Increasing Subsequence (LIS)
```python
def lis(nums):
    dp = [1] * len(nums)
    for i in range(1, len(nums)):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)
```
Time: O(n²). Can be improved to O(n log n) with binary search + patience sorting.

### 4. Coin Change (Minimum Coins)
```python
def coin_change(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1
```

### 5. Unique Paths (Grid DP)
Robot starts top-left of m×n grid, moves only right or down. Count paths to bottom-right.
```python
def unique_paths(m, n):
    dp = [[1] * n for _ in range(m)]
    for i in range(1, m):
        for j in range(1, n):
            dp[i][j] = dp[i-1][j] + dp[i][j-1]
    return dp[m-1][n-1]
```

### 6. Edit Distance (Levenshtein)
Minimum operations (insert, delete, replace) to convert s1 to s2.
```python
def edit_distance(s1, s2):
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1): dp[i][0] = i
    for j in range(n + 1): dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i-1] == s2[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    return dp[m][n]
```

---

## DP on Subsets (Bitmask DP)

For problems involving subsets of small sets (n ≤ 20):
- Use an integer bitmask to represent subsets.
- `mask = 0b101` represents items 0 and 2 selected.
- Iterate over all 2ⁿ subsets.

**Use case**: Travelling Salesman Problem, assignment problems.

---

## DP Patterns to Recognize

| Pattern | Example Problems |
|---|---|
| Linear DP | Fibonacci, house robber, climbing stairs |
| Grid DP | Unique paths, minimum path sum |
| Interval DP | Burst balloons, matrix chain multiplication |
| Subsequence DP | LCS, LIS, edit distance |
| Knapsack DP | 0/1 Knapsack, subset sum, coin change |
| Tree DP | Diameter of tree, house robber on tree |
| Bitmask DP | TSP, assignment problem |

## Key Interview Questions
1. What is dynamic programming? How is it different from recursion?
2. What is the difference between memoization and tabulation?
3. What are the two properties a problem must have for DP to apply?
4. Explain the 0/1 Knapsack problem and its DP solution.
5. What is the time complexity of the Longest Common Subsequence algorithm?
