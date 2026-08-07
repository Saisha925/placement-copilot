# DBMS: SQL Joins and Queries

SQL (Structured Query Language) is the standard language for relational database management. Understanding JOINs and complex queries is essential for placement interviews.

## Types of JOINs

### INNER JOIN
Returns only rows where the join condition is satisfied in **both** tables.
```sql
SELECT e.name, d.department_name
FROM employees e
INNER JOIN departments d ON e.dept_id = d.dept_id;
```
Only employees who belong to an existing department are returned.

### LEFT (OUTER) JOIN
Returns **all rows from the left table** and matched rows from the right table. Non-matching right rows have NULL.
```sql
SELECT e.name, d.department_name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.dept_id;
```
All employees are returned; employees without a department have NULL in department_name.

### RIGHT (OUTER) JOIN
Returns **all rows from the right table** and matched rows from the left. Non-matching left rows have NULL.

### FULL (OUTER) JOIN
Returns **all rows from both tables**. NULLs fill where there is no match on either side.

### CROSS JOIN
Returns the **Cartesian product** — every combination of rows from both tables.
```sql
SELECT * FROM colors CROSS JOIN sizes;  -- 3 colors × 4 sizes = 12 rows
```

### SELF JOIN
A table joined with itself — useful for hierarchical data.
```sql
SELECT e.name AS employee, m.name AS manager
FROM employees e
JOIN employees m ON e.manager_id = m.emp_id;
```

---

## Aggregations and Grouping

### Aggregate Functions
- `COUNT(*)`: Count all rows. `COUNT(col)`: Count non-NULL values.
- `SUM(col)`: Sum of numeric column.
- `AVG(col)`: Average.
- `MAX(col)` / `MIN(col)`: Maximum / minimum value.

### GROUP BY
Groups rows sharing a property to apply aggregate functions.
```sql
SELECT dept_id, COUNT(*) AS employee_count, AVG(salary) AS avg_salary
FROM employees
GROUP BY dept_id;
```

### HAVING
Filter groups (post-aggregation). Use WHERE to filter rows, HAVING to filter groups.
```sql
SELECT dept_id, AVG(salary)
FROM employees
GROUP BY dept_id
HAVING AVG(salary) > 60000;
```

### ORDER OF EXECUTION (critical to understand)
`FROM` → `JOIN` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `DISTINCT` → `ORDER BY` → `LIMIT`

---

## Subqueries

### Correlated Subquery
Refers to columns from the outer query — executed once per row.
```sql
SELECT name, salary
FROM employees e
WHERE salary > (SELECT AVG(salary) FROM employees WHERE dept_id = e.dept_id);
```

### Non-Correlated Subquery
Independent — executed once.
```sql
SELECT name FROM employees
WHERE dept_id IN (SELECT dept_id FROM departments WHERE location = 'Mumbai');
```

### Subquery with EXISTS
```sql
SELECT name FROM employees e
WHERE EXISTS (SELECT 1 FROM projects p WHERE p.emp_id = e.emp_id);
```

---

## Window Functions (Advanced)
Perform calculations across a set of rows related to the current row **without collapsing them** (unlike GROUP BY).

```sql
SELECT name, salary, dept_id,
       RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rank_in_dept,
       ROW_NUMBER() OVER (ORDER BY salary DESC) AS global_rank,
       LAG(salary, 1) OVER (ORDER BY hire_date) AS prev_salary,
       SUM(salary) OVER (PARTITION BY dept_id) AS dept_total
FROM employees;
```

- **RANK()**: Rank with gaps (1, 2, 2, 4).
- **DENSE_RANK()**: Rank without gaps (1, 2, 2, 3).
- **ROW_NUMBER()**: Unique sequential row number.
- **LAG(col, n)**: Value from n rows behind.
- **LEAD(col, n)**: Value from n rows ahead.
- **PARTITION BY**: Divides window into groups (like GROUP BY but keeps all rows).

---

## Common SQL Interview Questions

**Find the second highest salary:**
```sql
SELECT MAX(salary) FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);
-- OR using DENSE_RANK
SELECT salary FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk FROM employees
) t WHERE rnk = 2;
```

**Find duplicate records:**
```sql
SELECT email, COUNT(*) FROM employees GROUP BY email HAVING COUNT(*) > 1;
```

**Delete duplicates keeping one:**
```sql
DELETE FROM employees WHERE emp_id NOT IN (
  SELECT MIN(emp_id) FROM employees GROUP BY email
);
```

## Key Interview Questions
1. What is the difference between INNER JOIN and LEFT JOIN?
2. What is the difference between WHERE and HAVING?
3. Explain the order of SQL query execution.
4. How do window functions differ from GROUP BY?
5. Write a query to find the Nth highest salary.
