# Servicenow-SQL-Parser

This project is a ServiceNow Javascript designed to help you execute complex queries using GlideAggregate and handle SQL-like SELECT statements. It is particularly useful when you want to process the SELECT, WHERE, GROUP BY, LIMIT, and ORDER BY clauses dynamically and execute the equivalent queries using GlideAggregate.

## Capabilities

### 1. **Handle Basic SQL SELECT Syntax**
   - This script can parse SQL-like SELECT statements and handle field selections, including individual columns and the use of aggregate functions like `COUNT`, `AVG`, `SUM`, `MIN`, and `MAX`.

### 2. **Process Aggregates**
   - Supports aggregation functions (COUNT, AVG, SUM, MIN, MAX) by extracting them from the SELECT clause and applying them using `GlideAggregate`.
   - Example: `"SELECT COUNT(city), AVG(population) FROM cmn_location"`

### 3. **Retrieve All Columns (`*`)**
   - If the SELECT clause uses the wildcard `*`, the script dynamically retrieves all the field names of the specified table from the **`sys_dictionary`** table and executes the query.

### 4. **Handle WHERE Clauses**
   - The script supports WHERE conditions in SQL format, and it normalizes them for use in GlideRecord queries.
   - Example: `"SELECT name FROM cmn_location WHERE city = 'Abha'"`

### 5. **Support GROUP BY Clause**
   - You can group results by specific fields, similar to SQL's `GROUP BY` clause.
   - The script parses the fields in the `GROUP BY` clause and handles grouping in the resulting query.

### 6. **Handle ORDER BY Clause**
   - It supports sorting the result set using the `ORDER BY` clause, allowing sorting by one or more fields in ascending (`ASC`) or descending (`DESC`) order.
   - Example: `"SELECT name FROM cmn_location ORDER BY country ASC"`

### 7. **Limit Results**
   - Supports limiting the number of records returned using the `LIMIT` clause in SQL, ensuring that the query doesn't return more data than necessary.
   - Example: `"SELECT name FROM cmn_location LIMIT 10"`

## Example Usage

```javascript
var selectStatement = "SELECT name, country, COUNT(city) FROM cmn_location WHERE city = 'Abha' ORDER BY country DESC";
decode(selectStatement);
```

## Function Breakdown
- decode(sql): Main function that accepts a SQL-like string, parses it, and executes the query using GlideRecord/GlideAggregate.

- getTableFieldNames(table): Fetches all field names from a given table by querying the sys_dictionary table.

- parseSelectFields(from, select, selectFields, aggregateFields, gr): Handles parsing of the SELECT clause and applies aggregation using GlideAggregate.

- whereToEncodedQuery(whereClause): Converts the WHERE clause into an encoded query format compatible with GlideRecord.

## Future Enhancements
- Extend support for additional SQL functions.

- Handle JOIN operations to support cross-table queries.
