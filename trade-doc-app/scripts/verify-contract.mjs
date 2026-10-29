import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import console from 'node:console';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'docs', 'contracts');
const read = name => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
const clone = value => JSON.parse(JSON.stringify(value));
const methods = new Set(['get', 'post', 'put', 'patch', 'delete']);
const decimalRef = '#/components/schemas/DecimalString';
const expectedOperationIds = [
  'createCustomer', 'createInquiry', 'createOrderFromQuote', 'createProduct', 'createQuote',
  'getCsrf', 'getCustomer', 'getInquiry', 'getMe', 'getOrder', 'getProduct', 'getQuote',
  'listCurrencies', 'listCustomers', 'listInquiries', 'listOrders', 'listProducts', 'listQuotes',
  'login', 'logout', 'recordCustomerConfirmation', 'submitQuote', 'updateCustomer', 'updateProduct', 'updateQuote'
];
const expectedTables = [
  'app_user', 'audit_event', 'company_profile', 'currency_catalog', 'customer', 'idempotency_record',
  'inquiry', 'inquiry_line', 'order_line', 'order_version', 'product', 'quote', 'quote_confirmation',
  'quote_line', 'sales_order', 'user_session'
];
const expectedCaseIds = [
  'AUTH-01', 'AUTH-02', 'AUTH-03', 'AUTH-04', 'AUTH-05', 'AUTH-06', 'AUTH-07',
  'CAT-01', 'CAT-02', 'CAT-03', 'CAT-04', 'CONFIRM-01', 'CONFIRM-02', 'CONFIRM-03',
  'CUST-01', 'CUST-02', 'DB-01', 'ERROR-01', 'IDEM-01', 'IDEM-02', 'IDEM-03', 'IDEM-04',
  'INQ-01', 'INQ-02', 'INQ-03', 'MONEY-01', 'MONEY-02', 'MONEY-03', 'MONEY-04',
  'ORDER-01', 'ORDER-02', 'ORDER-03', 'ORDER-04', 'ORDER-05', 'QUOTE-01', 'QUOTE-02',
  'QUOTE-03', 'QUOTE-04', 'RESTART-01', 'SCOPE-01', 'SCOPE-02', 'SCOPE-03', 'SCOPE-04',
  'SNAP-01', 'SUBMIT-01', 'SUBMIT-02', 'SUBMIT-03', 'TX-01', 'VERSION-01'
];
const storageMoneyFields = [
  ['product', 'ref_price'], ['inquiry_line', 'quantity'], ['quote', 'total_amount'],
  ['quote_line', 'quantity'], ['quote_line', 'unit_price'], ['quote_line', 'line_amount'],
  ['order_version', 'total_amount'], ['order_line', 'quantity'],
  ['order_line', 'unit_price'], ['order_line', 'line_amount']
];
const sourceRelations = [
  ['inquiry', ['customer_id', 'owner_user_id'], 'customer', ['id', 'owner_user_id']],
  ['quote', ['inquiry_id', 'owner_user_id', 'customer_id'], 'inquiry', ['id', 'owner_user_id', 'customer_id']],
  ['quote_line', ['quote_id', 'inquiry_id'], 'quote', ['id', 'inquiry_id']],
  ['quote_line', ['inquiry_id', 'inquiry_line_id'], 'inquiry_line', ['inquiry_id', 'id']],
  ['sales_order', ['source_quote_id', 'owner_user_id'], 'quote', ['id', 'owner_user_id']],
  ['sales_order', ['source_quote_id'], 'quote_confirmation', ['quote_id']],
  ['order_version', ['order_id', 'source_quote_id'], 'sales_order', ['id', 'source_quote_id']],
  ['order_line', ['order_version_id', 'source_quote_id'], 'order_version', ['id', 'source_quote_id']],
  ['order_line', ['source_quote_id', 'source_quote_line_id'], 'quote_line', ['quote_id', 'id']]
];
const isWrite = method => method !== 'get';

function pointer(document, reference) {
  if (typeof reference !== 'string' || !reference.startsWith('#/')) return undefined;
  return reference.slice(2).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce((value, key) => value && value[key], document);
}

function each(value, fn, location = '#') {
  if (!value || typeof value !== 'object') return;
  fn(value, location);
  for (const [key, item] of Object.entries(value)) each(item, fn, `${location}/${key}`);
}

function resolve(document, value) {
  return value?.$ref ? pointer(document, value.$ref) : value;
}

function operations(api) {
  return Object.entries(api.paths).flatMap(([url, item]) => Object.entries(item)
    .filter(([method]) => methods.has(method))
    .map(([method, op]) => ({ url, method, op })));
}

function sameSorted(values, expected) {
  return JSON.stringify([...values].sort()) === JSON.stringify([...expected].sort());
}

export function validate(api, model, matrix) {
  const errors = [];
  let checks = 0;
  let refs = 0;
  const check = (condition, message) => {
    checks++;
    if (!condition) errors.push(message);
  };

  check(api.openapi === '3.1.1', 'pinned OpenAPI dialect');
  check(api['x-contract-stage'] === 'authoritative-not-implemented', 'authoritative API implementation boundary');
  check(model.status === 'authoritative-not-implemented' && model.databaseEngine === 'postgresql' && model.ddlExecuted === false, 'authoritative PostgreSQL logical model, no executed DDL');
  check(matrix.status === 'PLANNED-NOT-EXECUTED', 'integration matrix is planned, not passed');
  check(api.servers.length === 1 && api.servers[0].url === '/api/v1', 'same-origin API prefix');
  check(api.components.securitySchemes.CookieAuth.in === 'cookie' && api.components.securitySchemes.CookieAuth.name === 'TRADE_SESSION', 'session cookie scheme');
  check(api.components.securitySchemes.CsrfHeader.in === 'header' && api.components.securitySchemes.CsrfHeader.name === 'X-CSRF-TOKEN', 'CSRF scheme');

  each(api, (item, where) => {
    if (item.$ref) {
      refs++;
      check(pointer(api, item.$ref) !== undefined, `internal reference ${where}`);
    }
    if (item.type === 'object') {
      check(item.additionalProperties === false, `strict object fields ${where}`);
      check((item.required || []).every(key => Object.hasOwn(item.properties || {}, key)), `required properties exist ${where}`);
    }
  });

  const ops = operations(api);
  const ids = ops.map(item => item.op.operationId);
  check(ids.length === 25 && new Set(ids).size === ids.length, '25 unique operation IDs');
  check(sameSorted(ids, expectedOperationIds), 'exact 25 operationId contract');

  const forbid = new Set(['role', 'actorUserId', 'ownerUserId', 'status', 'totalAmount', 'createdBy', 'createdAt', 'recordedBy', 'recordedAt']);
  function inspectRequest(rawSchema, where, visited = new Set()) {
    let schema = rawSchema;
    if (!schema) return;
    if (schema.$ref) {
      if (visited.has(schema.$ref)) return;
      visited = new Set(visited).add(schema.$ref);
      schema = pointer(api, schema.$ref);
    }
    if (!schema) return;
    for (const key of Object.keys(schema.properties || {})) check(!forbid.has(key), `no client authorization/computed field ${where}/${key}`);
    for (const [key, child] of Object.entries(schema.properties || {})) inspectRequest(child, `${where}/${key}`, visited);
    if (schema.items) inspectRequest(schema.items, `${where}/*`, visited);
    for (const child of schema.anyOf || []) inspectRequest(child, where, visited);
  }

  for (const { url, method, op } of ops) {
    const id = op.operationId;
    for (const name of ['x-roles', 'x-scope', 'x-permission', 'x-invariants']) check(Array.isArray(op[name]), `${id} ${name}`);
    check(op['x-scope']?.length > 0 && op['x-invariants']?.length > 0, `${id} scope and invariants`);
    const publicOp = ['getCsrf', 'login'].includes(id);
    const authOp = ['getMe', 'logout'].includes(id);
    const security = op.security ?? api.security;
    if (!publicOp) check(security.length > 0 && security.every(item => Object.hasOwn(item, 'CookieAuth')), `${id} cookie required in every alternative`);
    if (isWrite(method)) check(security.length > 0 && security.every(item => Object.hasOwn(item, 'CsrfHeader')), `${id} CSRF required in every alternative`);
    if (!publicOp && !authOp) {
      check(JSON.stringify(op['x-roles']) === JSON.stringify(isWrite(method) ? ['sales'] : ['sales', 'boss']), `${id} least role scope`);
      const params = [...(api.paths[url].parameters || []), ...(op.parameters || [])].map(item => resolve(api, item));
      if (isWrite(method)) {
        check(params.some(item => item?.in === 'header' && item.name === 'Idempotency-Key' && item.required), `${id} business idempotency header`);
        check(Object.hasOwn(op.responses, '200'), `${id} replay status 200`);
        const response = resolve(api, op.responses['200']);
        check(resolve(api, response?.headers?.['Idempotency-Replayed'])?.schema?.const === true, `${id} replay header`);
      }
      const catalog = url.startsWith('/products') || url.startsWith('/reference');
      check(op['x-scope'].includes(catalog ? 'company-catalog' : 'owner-or-boss'), `${id} correct catalog/owner scope`);
    }
    const params = [...(api.paths[url].parameters || []), ...(op.parameters || [])].map(item => resolve(api, item));
    for (const match of url.matchAll(/\{([^}]+)\}/g)) check(params.some(item => item?.in === 'path' && item.name === match[1] && item.required), `${id} required path parameter`);
    if (op.requestBody) {
      check(op.requestBody.required === true, `${id} request body required`);
      inspectRequest(op.requestBody.content['application/json'].schema, id);
    }
    for (const [status, raw] of Object.entries(op.responses)) {
      const response = resolve(api, raw);
      check(!!response?.description, `${id} response ${status}`);
      check(resolve(api, response?.headers?.['Cache-Control'])?.schema?.const === 'no-store', `${id} no-store ${status}`);
      if (status !== '204') check(!!response?.content?.['application/json']?.schema, `${id} typed response ${status}`);
    }
  }

  check(!api.paths['/orders']?.post && !api.paths['/orders/{id}']?.put && !api.paths['/orders/{id}']?.patch, 'no bypass order mutations');
  check(sameSorted(Object.keys(api.components.schemas.OrderCreate.properties), ['deliveryDate', 'expectedVersion']), 'order accepts only source version/delivery');
  check(!api.components.schemas.QuoteUpdate.properties.quoteDate, 'quote date remains server-generated');
  check(sameSorted(api.components.schemas.QuoteSubmitRequest.required, ['expectedVersion', 'expectedCustomerVersion', 'expectedCompanyProfileVersion']), 'submit source versions');
  for (const name of ['ProductSnapshot', 'CustomerSnapshot', 'CompanySnapshot', 'TradeSnapshot', 'TradeSnapshotItem']) {
    const schema = api.components.schemas[name];
    check(schema.required.includes('schemaVersion') && schema.properties.schemaVersion.const === 1, `${name} structure version`);
  }
  check(api.components.schemas.ConfirmationCreate.required.includes('note') && !api.components.schemas.ConfirmationCreate.required.includes('attachmentIds'), 'confirmation record required, attachment optional');
  check(api.components.schemas.ConfirmationCreate.properties.attachmentIds.maxItems === 0, 'unimplemented attachments not silently accepted');
  check(api.components.schemas.Quote.properties.status.enum.join() === 'DRAFT,AWAITING_CUSTOMER,CONFIRMED', 'conversion does not replace confirmed state');
  check(['orderProgress', 'documentProgress', 'paymentProgress'].every(key => api.components.schemas.Order.required.includes(key)), 'three independent progresses');
  const decimal = api.components.schemas.DecimalString;
  check(decimal.type === 'string' && decimal.maxLength === 21 && decimal.pattern === '^(?:0|[1-9][0-9]{0,17})(?:\\.[0-9]{1,2})?$', 'canonical decimal string boundary');

  const moneyFields = [
    ['ProductCreate', 'refPrice', false], ['ProductUpdate', 'refPrice', false], ['Product', 'refPrice', false],
    ['InquiryItemInput', 'quantity', false], ['InquiryItem', 'quantity', false],
    ['QuoteItemUpdate', 'quantity', false], ['QuoteItemUpdate', 'unitPrice', true],
    ['QuoteItem', 'quantity', false], ['QuoteItem', 'unitPrice', true], ['QuoteItem', 'lineAmount', true],
    ['TradeSnapshotItem', 'quantity', false], ['TradeSnapshotItem', 'unitPrice', false], ['TradeSnapshotItem', 'lineAmount', false],
    ['TradeSnapshot', 'totalAmount', false], ['Quote', 'totalAmount', true]
  ];
  for (const [dto, field, nullable] of moneyFields) {
    const schema = api.components.schemas[dto]?.properties?.[field];
    check(nullable
      ? JSON.stringify(schema) === JSON.stringify({ anyOf: [{ $ref: decimalRef }, { type: 'null' }] })
      : schema?.$ref === decimalRef && !schema.type && !schema.anyOf,
    `${dto}.${field} exact string-decimal contract`);
  }

  const getCols = table => ({ ...Object.fromEntries((table.common || []).map(key => [key, model.commonColumns[key]])), ...table.columns });
  check(sameSorted(Object.keys(model.tables), expectedTables), 'exact 16-table contract');
  for (const [table, column] of storageMoneyFields) check(model.tables[table]?.columns?.[column]?.type === 'decimal20_2', `${table}.${column} exact storage decimal type`);
  for (const [name, table] of Object.entries(model.tables)) {
    const cols = getCols(table);
    const keys = [table.primaryKey, ...table.unique];
    check(table.primaryKey.length > 0, `${name} primary key`);
    for (const key of [...keys, ...(table.indexes || [])]) check(key.every(column => cols[column]), `${name} key/index columns exist`);
    for (const key of table.primaryKey) check(cols[key]?.nullable !== true, `${name} non-null primary key`);
    for (const fk of table.foreignKeys) {
      const target = model.tables[fk.table];
      check(!!target && fk.columns.length === fk.target.length && fk.columns.every(column => cols[column]), `${name} source FK exists`);
      if (!target) continue;
      const dest = getCols(target);
      check(fk.target.every(column => dest[column]), `${name} target FK exists`);
      check([target.primaryKey, ...target.unique].some(key => JSON.stringify(key) === JSON.stringify(fk.target)), `${name} FK points to declared unique key`);
      check(fk.columns.every((column, index) => cols[column]?.type === dest[fk.target[index]]?.type), `${name} FK field types agree`);
    }
  }

  function hasUnique(table, fields) {
    return model.tables[table].unique.some(key => JSON.stringify(key) === JSON.stringify(fields));
  }
  check(hasUnique('app_user', ['login_key']), 'login identity uniqueness');
  check(hasUnique('user_session', ['session_key_hash']), 'session token hash uniqueness');
  check(hasUnique('product', ['sku']), 'shared product SKU uniqueness');
  check(hasUnique('customer', ['id', 'owner_user_id']), 'customer ownership target uniqueness');
  check(hasUnique('quote', ['inquiry_id']), 'one first quote per inquiry');
  check(hasUnique('sales_order', ['source_quote_id']), 'one order independent of idempotency key');
  check(hasUnique('quote_confirmation', ['quote_id']), 'one confirmation per quote');
  check(hasUnique('idempotency_record', ['actor_user_id', 'idempotency_key']), 'actor/key uniqueness across endpoints');
  for (const [table, columns, target, destination] of sourceRelations) {
    check(model.tables[table].foreignKeys.some(fk => fk.table === target && JSON.stringify(fk.columns) === JSON.stringify(columns) && JSON.stringify(fk.target) === JSON.stringify(destination)), `${table} exact source FK ${columns.join(',')}`);
  }
  check(!getCols(model.tables.product).owner_user_id, 'shared products do not become owner-private');
  const session = model.tables.user_session;
  check(session.columns.user_id.nullable === true && session.columns.auth_version.nullable === true, 'anonymous database session representation');
  check(session.columns.csrf_token_hash?.sensitive === true, 'session-bound CSRF hash storage');

  const maps = {
    Currency: ['currency_catalog', { code: 'code', displayName: 'display_name', amountScale: 'amount_scale' }],
    Product: ['product', { sku: 'sku', refPrice: 'ref_price', currency: 'currency', enabled: 'enabled', nameCn: 'name_cn', nameEn: 'name_en', spec: 'spec', unit: 'unit', hsCode: 'hs_code', remark: 'remark' }],
    Customer: ['customer', { nameCn: 'name_cn', nameEn: 'name_en', country: 'country', address: 'address', contact: 'contact', email: 'email', phone: 'phone', remark: 'remark' }],
    Inquiry: ['inquiry', { inquiryDate: 'inquiry_date', message: 'message', source: 'source' }],
    CompanySnapshot: ['company_profile', { legalName: 'legal_name', address: 'address', contact: 'contact', email: 'email', phone: 'phone' }],
    Quote: ['quote', { quoteDate: 'quote_date', validUntil: 'valid_until', currency: 'currency', tradeTerm: 'trade_term', paymentTerm: 'payment_term', remark: 'remark' }]
  };
  for (const [dto, [table, mapping]] of Object.entries(maps)) {
    for (const [field, column] of Object.entries(mapping)) {
      const storage = getCols(model.tables[table])[column];
      const schema = api.components.schemas[dto].properties[field];
      check(!!storage && !!schema, `${dto}.${field} mapped column`);
      if (schema?.maxLength && storage?.maxLength) check(schema.maxLength === storage.maxLength, `${dto}.${field} matching length`);
    }
  }
  check(model.tables.quote.columns.valid_until.nullable === true, 'draft nullable expiry matches API');
  check(model.tables.currency_catalog.columns.amount_scale.type === 'integer', 'currency catalog scale uses integer storage');
  check(api.components.schemas.Currency.properties.amountScale.const === 2, 'service catalog exposes only two-decimal currencies');
  check(model.tables.quote_line.checks.some(item => item.includes('lineNo')) && !model.tables.quote_line.checks.some(item => item.includes('lineId')), 'stable lineNo API/model agreement');
  const decisions = model.confirmedDecisions;
  check(decisions.salesDataScope === 'owner-only' && decisions.productCatalogScope === 'company-shared' && decisions.historicalImport === false, 'confirmed scope decisions');
  check(decisions.confirmationAttachmentRequired === false && decisions.quantityScale === 2 && decisions.unitPriceScale === 2 && decisions.lineAmountPolicy === 'reject-fractional-minor-unit', 'confirmed confirmation/money decisions');

  const caseIds = new Set();
  const covered = new Set();
  for (const item of matrix.cases) {
    check(!caseIds.has(item.id), `unique acceptance ID ${item.id}`);
    caseIds.add(item.id);
    check(item.status === 'PLANNED' && !!item.given && !!item.when && !!item.expect && !!item.layer, `${item.id} planned scenario with expectation`);
    for (const id of item.operations) {
      covered.add(id);
      check(ids.includes(id), `${item.id} known operation ${id}`);
    }
    for (const [id, statuses] of Object.entries(item.expectedHttp || {})) {
      const operation = ops.find(item => item.op.operationId === id)?.op;
      check(item.operations.includes(id) && statuses.every(status => operation?.responses[String(status)]), `${item.id} expected HTTP declared by API`);
    }
  }
  const moneyCase = matrix.cases.find(item => item.id === 'MONEY-01');
  check(sameSorted(moneyCase?.expectedHttp?.updateQuote || [], [400, 422]) && sameSorted(moneyCase?.expectedHttp?.createInquiry || [], [400, 422]), 'MONEY-01 separates malformed JSON types from field semantics');
  const currencyCase = matrix.cases.find(item => item.id === 'CAT-01');
  check(currencyCase?.given.includes('不同非负精度') && currencyCase?.expect.includes('目录可保存非两位精度'), 'CAT-01 permits filtered non-two-decimal catalog storage');
  check(matrix.cases.length === 49 && sameSorted([...caseIds], expectedCaseIds), 'exact 49 planned acceptance scenarios');
  check(ids.every(id => covered.has(id)), 'all operations mapped to planned integration cases');

  return {
    errors,
    checks,
    refs,
    operations: ops.length,
    schemas: Object.keys(api.components.schemas).length,
    tables: Object.keys(model.tables).length,
    plannedCases: matrix.cases.length
  };
}

function schemaAccepts(api, rawSchema, value) {
  const schema = resolve(api, rawSchema);
  if (!schema) return false;
  if (schema.anyOf) return schema.anyOf.some(item => schemaAccepts(api, item, value));
  if (schema.const !== undefined && value !== schema.const) return false;
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (schema.type === 'null') return value === null;
  if (schema.type === 'string') return typeof value === 'string' && value.length >= (schema.minLength || 0) && value.length <= (schema.maxLength ?? Infinity) && (!schema.pattern || new RegExp(schema.pattern).test(value));
  if (schema.type === 'integer') return Number.isSafeInteger(value) && value >= (schema.minimum ?? -Infinity) && value <= (schema.maximum ?? Infinity);
  if (schema.type === 'boolean') return typeof value === 'boolean';
  if (schema.type === 'array') return Array.isArray(value) && value.length >= (schema.minItems || 0) && value.length <= (schema.maxItems ?? Infinity) && value.every(item => schemaAccepts(api, schema.items, item));
  if (schema.type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value) && (schema.required || []).every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => Object.hasOwn(schema.properties, key) && schemaAccepts(api, schema.properties[key], value[key]));
  return false;
}

export function run() {
  const api = read('slice-01.openapi.json');
  const model = read('slice-01.data-model.json');
  const matrix = read('slice-01.acceptance.json');
  const before = JSON.stringify([api, model, matrix]);
  const result = validate(api, model, matrix);
  assert.deepEqual(result.errors, [], result.errors.join('\n'));
  assert.equal(JSON.stringify([api, model, matrix]), before, 'validator does not mutate its inputs');

  const mutations = [
    ['broken-ref', a => { a.components.schemas.OrderCreate.properties.deliveryDate.$ref = '#/components/schemas/UNKNOWN'; }],
    ['missing-operation', a => { delete a.paths['/orders'].get; }],
    ['bypass-order', a => { a.paths['/orders'].post = clone(a.paths['/quotes/{id}/orders'].post); }],
    ['boss-write', a => { a.paths['/customers'].post['x-roles'].push('boss'); }],
    ['missing-csrf', a => { delete a.paths['/customers'].post.security[0].CsrfHeader; }],
    ['optional-cookie-alternative', a => { a.paths['/customers'].get.security.push({}); }],
    ['missing-idempotency', a => { a.paths['/customers'].post.parameters = []; }],
    ['owner-input', a => { a.components.schemas.CustomerCreate.properties.ownerUserId = { type: 'string' }; }],
    ['permissive-input', a => { a.components.schemas.QuoteUpdate.additionalProperties = true; }],
    ['missing-source-version', a => { a.components.schemas.QuoteSubmitRequest.required.pop(); }],
    ['snapshot-unversioned', a => { a.components.schemas.TradeSnapshot.required = a.components.schemas.TradeSnapshot.required.filter(key => key !== 'schemaVersion'); }],
    ['confirmation-forced-attachment', a => { a.components.schemas.ConfirmationCreate.required.push('attachmentIds'); }],
    ['catalog-private', a => { a.paths['/products'].get['x-scope'] = ['owner-or-boss']; }],
    ['quote-date-client-write', a => { a.components.schemas.QuoteUpdate.properties.quoteDate = { $ref: '#/components/schemas/Date' }; }],
    ['cache-public', a => { a.paths['/auth/csrf'].get.responses['200'].headers['Cache-Control'].schema.const = 'public'; }],
    ['missing-table', (a, m) => { delete m.tables.audit_event; }],
    ['model-field-missing', (a, m) => { delete m.tables.product.columns.enabled; }],
    ['model-expiry-not-null', (a, m) => { m.tables.quote.columns.valid_until.nullable = false; }],
    ['model-weak-ownership-fk', (a, m) => { m.tables.inquiry.foreignKeys = []; }],
    ['model-weak-source-unique', (a, m) => { m.tables.sales_order.unique = m.tables.sales_order.unique.filter(key => key.join() !== 'source_quote_id'); }],
    ['model-missing-target', (a, m) => { m.tables.quote.foreignKeys[0].table = 'UNKNOWN'; }],
    ['model-missing-display-name', (a, m) => { delete m.tables.currency_catalog.columns.display_name; }],
    ['model-currency-scale-not-integer', (a, m) => { m.tables.currency_catalog.columns.amount_scale.type = 'decimal20_2'; }],
    ['anonymous-session-removed', (a, m) => { m.tables.user_session.columns.user_id.nullable = false; }],
    ['csrf-storage-removed', (a, m) => { delete m.tables.user_session.columns.csrf_token_hash; }],
    ['matrix-fake-pass', (a, m, c) => { c.cases[0].status = 'PASS'; }],
    ['matrix-money-type-status', (a, m, c) => { c.cases.find(item => item.id === 'MONEY-01').expectedHttp.updateQuote = [422]; }],
    ['matrix-catalog-two-scale-storage', (a, m, c) => { c.cases.find(item => item.id === 'CAT-01').expect = '仅启用的两位金额币种可用'; }],
    ['matrix-case-removed', (a, m, c) => { c.cases.pop(); }],
    ['matrix-unknown-operation', (a, m, c) => { c.cases[0].operations.push('UNKNOWN'); }],
    ['matrix-undeclared-http', (a, m, c) => { c.cases[0].expectedHttp.getCsrf = [599]; }],
    ['api-unit-price-number', a => { a.components.schemas.QuoteItemUpdate.properties.unitPrice = { anyOf: [{ type: 'number' }, { type: 'null' }] }; }],
    ['api-quantity-number', a => { a.components.schemas.InquiryItemInput.properties.quantity = { type: 'number' }; }],
    ['api-decimal-base-number', a => { a.components.schemas.DecimalString = { type: 'number' }; }],
    ...storageMoneyFields.map(([table, column]) => [
      `storage-decimal-type-${table}-${column}`,
      (a, m) => { m.tables[table].columns[column].type = 'binaryFloat'; }
    ]),
    ...sourceRelations.map(([table, columns, target, destination]) => [
      `source-relation-${table}-${columns.join('-')}`,
      (a, m) => { m.tables[table].foreignKeys = m.tables[table].foreignKeys.filter(fk => !(fk.table === target && JSON.stringify(fk.columns) === JSON.stringify(columns) && JSON.stringify(fk.target) === JSON.stringify(destination))); }
    ])
  ];
  for (const [label, change] of mutations) {
    const a = clone(api);
    const m = clone(model);
    const c = clone(matrix);
    change(a, m, c);
    assert.ok(validate(a, m, c).errors.length > 0, `static checker must catch ${label}`);
  }

  const id = '10000000-0000-4000-8000-000000000001';
  const samples = [
    ['OrderCreate', { expectedVersion: 1, deliveryDate: '2026-11-13' }, true],
    ['OrderCreate', { expectedVersion: 1, deliveryDate: '2026-11-13', items: [] }, false],
    ['OrderCreate', { deliveryDate: '2026-11-13' }, false],
    ['QuoteSubmitRequest', { expectedVersion: 1, expectedCustomerVersion: 1, expectedCompanyProfileVersion: 1 }, true],
    ['QuoteSubmitRequest', { expectedVersion: 1 }, false],
    ['ConfirmationCreate', { expectedVersion: 1, method: '邮件确认', confirmedOn: '2026-10-14', note: '合成确认记录' }, true],
    ['ConfirmationCreate', { expectedVersion: 1, method: '邮件确认', confirmedOn: '2026-10-14', note: '合成确认记录', attachmentIds: [] }, true],
    ['ConfirmationCreate', { expectedVersion: 1, method: '邮件确认', confirmedOn: '2026-10-14', note: '合成确认记录', attachmentIds: [id] }, false],
    ['ConfirmationCreate', { expectedVersion: 1, method: '邮件确认', confirmedOn: '2026-10-14' }, false],
    ...['1', '0.01', '999999999999999999.99'].map(value => ['DecimalString', value, true]),
    ...[1, '1e2', '0x10', '1,000.00', '-1', ' 1', '1.001', '1000000000000000000', ''].map(value => ['DecimalString', value, false])
  ];
  for (const [schema, value, expected] of samples) assert.equal(schemaAccepts(api, api.components.schemas[schema], value), expected, `schema subset sample ${schema}`);

  const report = {
    result: 'PASS',
    scope: 'Static authoritative-contract consistency and checker negative probes only; no server, database, or browser integration executed',
    ...result,
    mutationProbes: mutations.length,
    schemaSubsetSamples: samples.length,
    plannedIntegrationCasesExecuted: 0
  };
  console.log(JSON.stringify(report, null, 2));
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
