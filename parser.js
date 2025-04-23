
//main func
function decode(sql) {
    var select = decoder(sql, /select\s+(.*?)\s+from/i);
    var from = decoder(sql, /from\s+([^\s;]+)/i);
    var fromAlias = decoder(sql,/from\s+[^\s;]+(?:\s+as)?\s+([^\s;]+)/i);
    var where = decoder(sql, /where\s+(.*?)(order by|group by|limit|;|$)/i);
    var limit = decoder(sql, /limit\s+(\d+)/i);
    var groupBy = decoder(sql, /group\s+by\s+([\w,\s]+)/i);
    var orderBy = decoder(sql, /order\s+by\s+([\w,\s]+)\s*(asc|desc)?/i);

    var selectFields = [];
    var aggregateFields = [];
    var tablesAliases = {};


	if (fromAlias) {
    tablesAliases[fromAlias] = from;}

    var gr = new GlideAggregate(from);

    if (where) {
        gr.addEncodedQuery(whereToEncodedQuery(where));
    }

    if (limit) {
        gr.setLimit(limit);
    }



    parseSelectFields(from, select, selectFields, aggregateFields, gr, tablesAliases);

    if (groupBy) {
        var groupFields = groupBy.split(',').map(f => f.trim());
        groupFields.forEach(groupField => {
            gr.groupBy(groupField);
        });
    }
    if (orderBy) {
        var orderParsed = parseOrderBy(orderBy);
        orderParsed.forEach(function(order) {
            if (order.direction === 'ASC') {
                gr.orderBy(order.field);
            } else {
                gr.orderByDesc(order.field);
            }
        });

    }

    gr.query();

    while (gr.next()) {
        selectFields.forEach(function(field) {
            gs.info(field + ": " + gr.getValue(field));
        });

        aggregateFields.forEach(aggregate => {
            gs.info(aggregate.func + "(" + aggregate.fieldName + "): " + gr.getAggregate(aggregate.func, aggregate.fieldName));
        });
    }
}


//decoder function that extracts relvant info using patter param
function decoder(sql, pattern) {
    sql = sql.replace(/;$/, '');
    var match = sql.match(pattern);
    var selectFields = match ? match[1] : null;
    return selectFields;
}


//used to get all table field names in case of selecting *
function getTableFieldNames(table) {
	var fieldNames = [];
    var gr = new GlideRecord('sys_dictionary'); 
    gr.addQuery('name', table); 
    gr.query();

    while (gr.next()) {
        fieldNames.push(gr.getValue('element')); 
    }

    return fieldNames; 
}

//used to differeniate between aggregate functions and normal select fields
function parseSelectFields(from, select, selectFields, aggregateFields, gr, tablesAliases) {
    var fields = select.split(',').map(f => f.trim());

    fields.forEach(field => {
        var aggregateMatch = field.match(/(COUNT|AVG|SUM|MIN|MAX)\s*\(([\w\.]+)\)/i);
		gs.info(aggregateMatch);
        // 1) Handle Aggregates (COUNT, AVG, etc.)
        if (aggregateMatch) {
            var func      = aggregateMatch[1].toUpperCase();
            var fieldName = aggregateMatch[2];
		
            var dotMatch = fieldName.match(/^([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)$/);
            if (dotMatch) {
                var alias = dotMatch[1];
                var realTable = tablesAliases[alias];
                if (!realTable) {
                    throw 'Unknown alias `' + alias + '` for field `' + fieldName + '`';
                }
                fieldName = dotMatch[2]; 
            }

            aggregateFields.push({ func, fieldName });
            return;
        }
		// 2) alias.* expansion
        var allMatch = field.match(/^([A-Za-z0-9_]+)\.\*$/);
        if (allMatch) {
            var alias = allMatch[1];
            var realTable = tablesAliases[alias];
            if (!realTable) {
                throw 'Unknown alias `' + alias + '` for `*` expansion';
            }
            var cols = getTableFieldNames(realTable);
            cols.forEach(col => selectFields.push(col));
            return;
        }

        // 3) alias.field resolution
        var dotMatch = field.match(/^([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)$/);
        if (dotMatch) {
            var alias = dotMatch[1];
            var fieldName = dotMatch[2];
            var realTable = tablesAliases[alias];
            if (!realTable) {
                throw 'Unknown alias `' + alias + '` for field `' + field + '`';
            }
            selectFields.push(fieldName);
            return;
        }
        if (field == '*') {
            var allFields = getTableFieldNames(from);
            allFields.forEach(fieldName => {
                selectFields.push(fieldName);
            });
			return;
        } else {
            selectFields.push(field);
			return;
        }
    });

    aggregateFields.forEach(aggregate => {
        gr.addAggregate(aggregate.func, aggregate.fieldName);
    });
}

//used to handle multiple order by fields
function parseOrderBy(orderByClause) {
    if (!orderByClause) return [];

    var cleaned = orderByClause
        .replace(/\s+/g, ' ')
        .trim();

    var fields = cleaned.split(/\s*,\s*/);

    var parsedOrder = fields.map(function(field) {
        var parts = field.split(/\s+/); 
        var fieldName = parts[0];
        var direction = (parts[1] && parts[1].toUpperCase() === 'DESC') ? 'DESC' : 'ASC';
        return {
            field: fieldName,
            direction: direction
        };
    });

    return parsedOrder;
}


//used to handle where clauses 
function whereToEncodedQuery(whereClause) {
    if (!whereClause) return '';

    var cleaned = whereClause
        .replace(/contains\s+/gi, 'LIKE ')
        .replace(/%\s*/g, '')
        .replace(/''/g, "'")
        .replace(/["]/g, "'")
        .trim();

    var orGroups = cleaned.split(/\s+OR\s+/i);
    var result = orGroups.map(group => {
        var andParts = group.split(/\s+AND\s+/i);
        var encodedAnd = andParts.map(part => parseCondition(part)).filter(Boolean).join('^');
        return encodedAnd;
    });

    return result.join('^OR');
}

function parseCondition(cond) {
    cond = cond.trim();

    var match = cond.match(/^(\w+(?:\.\w+)?)\s*(=|!=|LIKE)\s*'?([^']*)'?$/i);
    if (!match) return null;

    var field = match[1];
    var operator = match[2].toUpperCase();
    var value = match[3];

    switch (operator) {
        case '=':
            return `${field}=${value}`;
        case '!=':
            return `${field}!=${value}`;
        case 'LIKE':
            return `${field}LIKE%${value}%`;
        default:
            return null;
    }
}