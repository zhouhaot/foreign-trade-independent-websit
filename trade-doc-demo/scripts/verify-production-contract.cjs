'use strict';
/* Static design checks only. Does not start a server, connect to a database,
 * certify OpenAPI fully, or execute the planned integration cases. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'docs/production');
const read = name => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
const clone = value => JSON.parse(JSON.stringify(value));
const methods = new Set(['get', 'post', 'put', 'patch', 'delete']);
const allRoles = ['admin', 'sales', 'doc', 'fin', 'boss'];
const decimalRef = '#/components/schemas/DecimalString';
const sourceRelations = [
  ['inquiry', ['customer_id','owner_user_id'], 'customer', ['id','owner_user_id']],
  ['quote', ['inquiry_id','owner_user_id','customer_id'], 'inquiry', ['id','owner_user_id','customer_id']],
  ['quote_line', ['quote_id','inquiry_id'], 'quote', ['id','inquiry_id']],
  ['quote_line', ['inquiry_id','inquiry_line_id'], 'inquiry_line', ['inquiry_id','id']],
  ['sales_order', ['source_quote_id','owner_user_id'], 'quote', ['id','owner_user_id']],
  ['sales_order', ['source_quote_id'], 'quote_confirmation', ['quote_id']],
  ['order_version', ['order_id','source_quote_id'], 'sales_order', ['id','source_quote_id']],
  ['order_line', ['order_version_id','source_quote_id'], 'order_version', ['id','source_quote_id']],
  ['order_line', ['source_quote_id','source_quote_line_id'], 'quote_line', ['quote_id','id']]
];
const isWrite = method => method !== 'get';
function pointer(document, reference) {
  if (typeof reference !== 'string' || !reference.startsWith('#/')) return undefined;
  return reference.slice(2).split('/').map(s => s.replace(/~1/g, '/').replace(/~0/g, '~')).reduce((v, k) => v && v[k], document);
}
function each(value, fn, location = '#') {
  if (!value || typeof value !== 'object') return;
  fn(value, location);
  for (const [key, item] of Object.entries(value)) each(item, fn, location + '/' + key);
}
function resolve(document, value) { return value?.$ref ? pointer(document, value.$ref) : value; }
function operations(api) {
  return Object.entries(api.paths).flatMap(([url, item]) => Object.entries(item).filter(([m]) => methods.has(m)).map(([method, op]) => ({ url, method, op })));
}
function validate(api, model, matrix) {
  const errors = []; let checks = 0, refs = 0;
  const check = (condition, message) => { checks++; if (!condition) errors.push(message); };
  check(api.openapi === '3.1.1', 'pinned OpenAPI design dialect');
  check(api['x-contract-stage'] === 'design-only-not-implemented', 'API implementation boundary');
  check(model.status === 'design-not-implemented' && model.databaseEngine === 'undecided' && model.ddlExecuted === false, 'model is logical, no executed DDL');
  check(matrix.status === 'PLANNED-NOT-EXECUTED', 'integration matrix is planned, not passed');
  check(api.servers.length === 1 && api.servers[0].url === '/api/v1', 'same-origin API prefix');
  check(api.components.securitySchemes.CookieAuth.in === 'cookie' && api.components.securitySchemes.CookieAuth.name === 'TRADE_SESSION', 'session cookie scheme');
  check(api.components.securitySchemes.CsrfHeader.in === 'header' && api.components.securitySchemes.CsrfHeader.name === 'X-CSRF-TOKEN', 'CSRF scheme');
  each(api, (item, where) => {
    if (item.$ref) { refs++; check(pointer(api, item.$ref) !== undefined, 'internal reference ' + where); }
    if (item.type === 'object') {
      check(item.additionalProperties === false, 'strict object fields ' + where);
      check((item.required || []).every(k => Object.hasOwn(item.properties || {}, k)), 'required properties exist ' + where);
    }
  });
  const ops = operations(api), ids = ops.map(x => x.op.operationId);
  check(ids.length === 25 && new Set(ids).size === ids.length, '25 unique operation IDs');
  const forbid = new Set(['role', 'actorUserId', 'ownerUserId', 'status', 'totalAmount', 'createdBy', 'createdAt', 'recordedBy', 'recordedAt']);
  function inspectRequest(schema, where, visited = new Set()) {
    if (!schema) return;
    if (schema.$ref) {
      if (visited.has(schema.$ref)) return;
      visited = new Set(visited).add(schema.$ref); schema = pointer(api, schema.$ref);
    }
    if (!schema) return;
    for (const key of Object.keys(schema.properties || {})) check(!forbid.has(key), 'no client authorization/computed field ' + where + '/' + key);
    for (const [key, child] of Object.entries(schema.properties || {})) inspectRequest(child, where + '/' + key, visited);
    if (schema.items) inspectRequest(schema.items, where + '/*', visited);
    for (const child of schema.anyOf || []) inspectRequest(child, where, visited);
  }
  for (const { url, method, op } of ops) {
    const id = op.operationId;
    for (const name of ['x-roles', 'x-scope', 'x-permission', 'x-invariants']) check(Array.isArray(op[name]), id + ' ' + name);
    check(op['x-scope']?.length > 0 && op['x-invariants']?.length > 0, id + ' scope and invariants');
    const publicOp = ['getCsrf', 'login'].includes(id), authOp = ['getMe', 'logout'].includes(id);
    const security = op.security ?? api.security;
    if (!publicOp) check(security.length > 0 && security.every(x => Object.hasOwn(x, 'CookieAuth')), id + ' cookie required in every alternative');
    if (isWrite(method)) check(security.length > 0 && security.every(x => Object.hasOwn(x, 'CsrfHeader')), id + ' CSRF required in every alternative');
    if (!publicOp && !authOp) {
      check(JSON.stringify(op['x-roles']) === JSON.stringify(isWrite(method) ? ['sales'] : ['sales', 'boss']), id + ' least role scope');
      const params = [...(api.paths[url].parameters || []), ...(op.parameters || [])].map(p => resolve(api, p));
      if (isWrite(method)) {
        check(params.some(p => p?.in === 'header' && p.name === 'Idempotency-Key' && p.required), id + ' business idempotency header');
        check(Object.hasOwn(op.responses, '200'), id + ' replay status 200');
        const response = resolve(api, op.responses['200']);
        check(resolve(api, response?.headers?.['Idempotency-Replayed'])?.schema?.const === true, id + ' replay header');
      }
      const catalog = url.startsWith('/products') || url.startsWith('/reference');
      check(op['x-scope'].includes(catalog ? 'company-catalog' : 'owner-or-boss'), id + ' correct catalog/owner scope');
    }
    const params = [...(api.paths[url].parameters || []), ...(op.parameters || [])].map(p => resolve(api, p));
    for (const match of url.matchAll(/\{([^}]+)\}/g)) check(params.some(p => p?.in === 'path' && p.name === match[1] && p.required), id + ' required path parameter');
    if (op.requestBody) {
      check(op.requestBody.required === true, id + ' request body required');
      inspectRequest(op.requestBody.content['application/json'].schema, id);
    }
    for (const [status, raw] of Object.entries(op.responses)) {
      const response = resolve(api, raw);
      check(!!response?.description, id + ' response ' + status);
      check(resolve(api, response?.headers?.['Cache-Control'])?.schema?.const === 'no-store', id + ' no-store ' + status);
      if (status !== '204') check(!!response?.content?.['application/json']?.schema, id + ' typed response ' + status);
    }
  }
  check(!api.paths['/orders']?.post && !api.paths['/orders/{id}']?.put && !api.paths['/orders/{id}']?.patch, 'no bypass order mutations');
  check(Object.keys(api.components.schemas.OrderCreate.properties).sort().join() === ['deliveryDate', 'expectedVersion'].sort().join(), 'order accepts only source version/delivery');
  check(!api.components.schemas.QuoteUpdate.properties.quoteDate, 'quote date remains server-generated');
  check([...api.components.schemas.QuoteSubmitRequest.required].sort().join() === ['expectedVersion', 'expectedCustomerVersion', 'expectedCompanyProfileVersion'].sort().join(), 'submit source versions');
  for (const name of ['ProductSnapshot', 'CustomerSnapshot', 'CompanySnapshot', 'TradeSnapshot', 'TradeSnapshotItem']) {
    const schema = api.components.schemas[name];
    check(schema.required.includes('schemaVersion') && schema.properties.schemaVersion.const === 1, name + ' structure version');
  }
  check(api.components.schemas.ConfirmationCreate.required.includes('note') && !api.components.schemas.ConfirmationCreate.required.includes('attachmentIds'), 'confirmation record required, attachment optional');
  check(api.components.schemas.ConfirmationCreate.properties.attachmentIds.maxItems === 0, 'unimplemented attachments not silently accepted');
  check(api.components.schemas.Quote.properties.status.enum.join() === 'DRAFT,AWAITING_CUSTOMER,CONFIRMED', 'conversion does not replace confirmed state');
  check(['orderProgress', 'documentProgress', 'paymentProgress'].every(k => api.components.schemas.Order.required.includes(k)), 'three independent progresses');
  const decimal = api.components.schemas.DecimalString;
  check(decimal.type === 'string' && decimal.maxLength === 21 && decimal.pattern === '^(?:0|[1-9][0-9]{0,17})(?:\\.[0-9]{1,2})?$', 'canonical decimal string boundary');
  const moneyFields = [
    ['ProductCreate','refPrice',false], ['ProductUpdate','refPrice',false], ['Product','refPrice',false],
    ['InquiryItemInput','quantity',false], ['InquiryItem','quantity',false],
    ['QuoteItemUpdate','quantity',false], ['QuoteItemUpdate','unitPrice',true],
    ['QuoteItem','quantity',false], ['QuoteItem','unitPrice',true], ['QuoteItem','lineAmount',true],
    ['TradeSnapshotItem','quantity',false], ['TradeSnapshotItem','unitPrice',false], ['TradeSnapshotItem','lineAmount',false],
    ['TradeSnapshot','totalAmount',false], ['Quote','totalAmount',true]
  ];
  for (const [dto,field,nullable] of moneyFields) {
    const schema = api.components.schemas[dto]?.properties?.[field];
    check(nullable
      ? JSON.stringify(schema) === JSON.stringify({anyOf:[{$ref:decimalRef},{type:'null'}]})
      : schema?.$ref === decimalRef && !schema.type && !schema.anyOf,
    dto+'.'+field+' exact string-decimal contract');
  }
  const getCols = table => ({ ...Object.fromEntries((table.common || []).map(k => [k, model.commonColumns[k]])), ...table.columns });
  for (const [name, table] of Object.entries(model.tables)) {
    const cols = getCols(table), keys = [table.primaryKey, ...table.unique];
    check(table.primaryKey.length > 0, name + ' primary key');
    for (const key of [...keys, ...(table.indexes || [])]) check(key.every(k => cols[k]), name + ' key/index columns exist');
    for (const key of table.primaryKey) check(cols[key]?.nullable !== true, name + ' non-null primary key');
    for (const fk of table.foreignKeys) {
      const target = model.tables[fk.table];
      check(!!target && fk.columns.length === fk.target.length && fk.columns.every(k => cols[k]), name + ' source FK exists');
      if (!target) continue;
      const dest = getCols(target);
      check(fk.target.every(k => dest[k]), name + ' target FK exists');
      check([target.primaryKey, ...target.unique].some(k => JSON.stringify(k) === JSON.stringify(fk.target)), name + ' FK points to declared unique key');
      check(fk.columns.every((k, i) => cols[k]?.type === dest[fk.target[i]]?.type), name + ' FK field types agree');
    }
  }
  function hasUnique(table, fields) { return model.tables[table].unique.some(u => JSON.stringify(u) === JSON.stringify(fields)); }
  check(hasUnique('quote', ['inquiry_id']), 'one first quote per inquiry');
  check(hasUnique('sales_order', ['source_quote_id']), 'one order independent of idempotency key');
  check(hasUnique('quote_confirmation', ['quote_id']), 'one confirmation per quote');
  check(hasUnique('idempotency_record', ['actor_user_id', 'idempotency_key']), 'actor/key uniqueness across endpoints');
  for (const [table,columns,target,destination] of sourceRelations) {
    check(model.tables[table].foreignKeys.some(f => f.table === target && JSON.stringify(f.columns) === JSON.stringify(columns) && JSON.stringify(f.target) === JSON.stringify(destination)), table+' exact source FK '+columns.join(','));
  }
  check(!getCols(model.tables.product).owner_user_id, 'shared products do not become owner-private');
  const maps = {
    Currency: ['currency_catalog', {code:'code', displayName:'display_name', amountScale:'amount_scale'}],
    Product: ['product', {sku:'sku', refPrice:'ref_price', currency:'currency', enabled:'enabled', nameCn:'name_cn', nameEn:'name_en', spec:'spec', unit:'unit', hsCode:'hs_code', remark:'remark'}],
    Customer: ['customer', {nameCn:'name_cn', nameEn:'name_en', country:'country', address:'address', contact:'contact', email:'email', phone:'phone', remark:'remark'}],
    Inquiry: ['inquiry', {inquiryDate:'inquiry_date', message:'message', source:'source'}],
    CompanySnapshot: ['company_profile', {legalName:'legal_name', address:'address', contact:'contact', email:'email', phone:'phone'}],
    Quote: ['quote', {quoteDate:'quote_date', validUntil:'valid_until', currency:'currency', tradeTerm:'trade_term', paymentTerm:'payment_term', remark:'remark'}]
  };
  for (const [dto, [table, mapping]] of Object.entries(maps)) for (const [field, column] of Object.entries(mapping)) {
    const storage = getCols(model.tables[table])[column], schema = api.components.schemas[dto].properties[field];
    check(!!storage && !!schema, dto + '.' + field + ' mapped column');
    if (schema?.maxLength && storage?.maxLength) check(schema.maxLength === storage.maxLength, dto + '.' + field + ' matching length');
  }
  check(model.tables.quote.columns.valid_until.nullable === true, 'draft nullable expiry matches API');
  check(model.tables.quote_line.checks.some(s => s.includes('lineNo')) && !model.tables.quote_line.checks.some(s => s.includes('lineId')), 'stable lineNo API/model agreement');
  const decisions = model.confirmedDecisions;
  check(decisions.salesDataScope === 'owner-only' && decisions.productCatalogScope === 'company-shared' && decisions.historicalImport === false, 'confirmed scope decisions');
  check(decisions.confirmationAttachmentRequired === false && decisions.quantityScale === 2 && decisions.unitPriceScale === 2 && decisions.lineAmountPolicy === 'reject-fractional-minor-unit', 'confirmed confirmation/money decisions');
  const caseIds = new Set(), covered = new Set();
  for (const item of matrix.cases) {
    check(!caseIds.has(item.id), 'unique acceptance ID ' + item.id); caseIds.add(item.id);
    check(item.status === 'PLANNED' && !!item.given && !!item.when && !!item.expect && !!item.layer, item.id + ' planned scenario with expectation');
    for (const id of item.operations) { covered.add(id); check(ids.includes(id), item.id + ' known operation ' + id); }
    for (const [id, statuses] of Object.entries(item.expectedHttp || {})) {
      const operation = ops.find(x => x.op.operationId === id)?.op;
      check(item.operations.includes(id) && statuses.every(s => operation?.responses[String(s)]), item.id + ' expected HTTP declared by API');
    }
  }
  check(ids.every(id => covered.has(id)), 'all operations mapped to planned integration cases');
  check(matrix.cases.length >= 45, 'at least 45 explicit planned integration cases');
  return { errors, checks, refs, operations: ops.length, schemas: Object.keys(api.components.schemas).length, tables: Object.keys(model.tables).length, plannedCases: matrix.cases.length };
}
/* Deliberately small validator for this file's JSON Schema subset, not an OAS
 * conformance validator. Runtime semantic authorization/amount checks are NOT run. */
function schemaAccepts(api, schema, value) {
  schema = resolve(api, schema);
  if (!schema) return false;
  if (schema.anyOf) return schema.anyOf.some(s => schemaAccepts(api, s, value));
  if (schema.const !== undefined && value !== schema.const) return false;
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (schema.type === 'null') return value === null;
  if (schema.type === 'string') return typeof value === 'string' && value.length >= (schema.minLength || 0) && value.length <= (schema.maxLength ?? Infinity) && (!schema.pattern || new RegExp(schema.pattern).test(value));
  if (schema.type === 'integer') return Number.isSafeInteger(value) && value >= (schema.minimum ?? -Infinity) && value <= (schema.maximum ?? Infinity);
  if (schema.type === 'boolean') return typeof value === 'boolean';
  if (schema.type === 'array') return Array.isArray(value) && value.length >= (schema.minItems || 0) && value.length <= (schema.maxItems ?? Infinity) && value.every(v => schemaAccepts(api, schema.items, v));
  if (schema.type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value) && (schema.required || []).every(k => Object.hasOwn(value, k)) && Object.keys(value).every(k => Object.hasOwn(schema.properties, k) && schemaAccepts(api, schema.properties[k], value[k]));
  return false;
}
function run() {
  const api = read('slice-01.openapi.json'), model = read('slice-01.data-model.json'), matrix = read('slice-01.acceptance.json');
  const before = JSON.stringify([api,model,matrix]);
  const result = validate(api, model, matrix); assert.deepEqual(result.errors, [], result.errors.join('\n'));
  assert.equal(JSON.stringify([api,model,matrix]),before,'validator does not mutate its inputs');
  const mutations = [
    ['broken-ref', a => { a.components.schemas.OrderCreate.properties.deliveryDate.$ref = '#/components/schemas/UNKNOWN'; }],
    ['bypass-order', a => { a.paths['/orders'].post = clone(a.paths['/quotes/{id}/orders'].post); }],
    ['boss-write', a => { a.paths['/customers'].post['x-roles'].push('boss'); }],
    ['missing-csrf', a => { delete a.paths['/customers'].post.security[0].CsrfHeader; }],
    ['optional-cookie-alternative', a => { a.paths['/customers'].get.security.push({}); }],
    ['missing-idempotency', a => { a.paths['/customers'].post.parameters = []; }],
    ['owner-input', a => { a.components.schemas.CustomerCreate.properties.ownerUserId = {type:'string'}; }],
    ['permissive-input', a => { a.components.schemas.QuoteUpdate.additionalProperties = true; }],
    ['missing-source-version', a => { a.components.schemas.QuoteSubmitRequest.required.pop(); }],
    ['snapshot-unversioned', a => { a.components.schemas.TradeSnapshot.required = a.components.schemas.TradeSnapshot.required.filter(k => k !== 'schemaVersion'); }],
    ['confirmation-forced-attachment', a => { a.components.schemas.ConfirmationCreate.required.push('attachmentIds'); }],
    ['catalog-private', a => { a.paths['/products'].get['x-scope'] = ['owner-or-boss']; }],
    ['quote-date-client-write', a => { a.components.schemas.QuoteUpdate.properties.quoteDate = {$ref:'#/components/schemas/Date'}; }],
    ['cache-public', a => { a.paths['/auth/csrf'].get.responses['200'].headers['Cache-Control'].schema.const = 'public'; }],
    ['model-field-missing', (a,m) => { delete m.tables.product.columns.enabled; }],
    ['model-expiry-not-null', (a,m) => { m.tables.quote.columns.valid_until.nullable = false; }],
    ['model-weak-ownership-fk', (a,m) => { m.tables.inquiry.foreignKeys = []; }],
    ['model-weak-source-unique', (a,m) => { m.tables.sales_order.unique = m.tables.sales_order.unique.filter(k => k.join() !== 'source_quote_id'); }],
    ['model-missing-target', (a,m) => { m.tables.quote.foreignKeys[0].table = 'UNKNOWN'; }],
    ['model-missing-display-name', (a,m) => { delete m.tables.currency_catalog.columns.display_name; }],
    ['matrix-fake-pass', (a,m,c) => { c.cases[0].status = 'PASS'; }],
    ['matrix-unknown-operation', (a,m,c) => { c.cases[0].operations.push('UNKNOWN'); }],
    ['matrix-undeclared-http', (a,m,c) => { c.cases[0].expectedHttp.getCsrf = [599]; }],
    ['api-unit-price-number', a => { a.components.schemas.QuoteItemUpdate.properties.unitPrice = {anyOf:[{type:'number'},{type:'null'}]}; }],
    ['api-quantity-number', a => { a.components.schemas.InquiryItemInput.properties.quantity = {type:'number'}; }],
    ['api-decimal-base-number', a => { a.components.schemas.DecimalString = {type:'number'}; }],
    ...sourceRelations.map(([table,columns,target,destination]) => [
      'source-relation-'+table+'-'+columns.join('-'),
      (a,m) => { m.tables[table].foreignKeys = m.tables[table].foreignKeys.filter(f => !(f.table === target && JSON.stringify(f.columns) === JSON.stringify(columns) && JSON.stringify(f.target) === JSON.stringify(destination))); }
    ])
  ];
  for (const [label, change] of mutations) {
    const a = clone(api), m = clone(model), c = clone(matrix); change(a,m,c);
    assert.ok(validate(a,m,c).errors.length > 0, 'static checker must catch ' + label);
  }
  const id = '10000000-0000-4000-8000-000000000001';
  const samples = [
    ['OrderCreate', {expectedVersion:1, deliveryDate:'2026-11-13'}, true],
    ['OrderCreate', {expectedVersion:1, deliveryDate:'2026-11-13', items:[]}, false],
    ['OrderCreate', {deliveryDate:'2026-11-13'}, false],
    ['QuoteSubmitRequest', {expectedVersion:1, expectedCustomerVersion:1, expectedCompanyProfileVersion:1}, true],
    ['QuoteSubmitRequest', {expectedVersion:1}, false],
    ['ConfirmationCreate', {expectedVersion:1,method:'邮件确认',confirmedOn:'2026-10-14',note:'合成确认记录'}, true],
    ['ConfirmationCreate', {expectedVersion:1,method:'邮件确认',confirmedOn:'2026-10-14',note:'合成确认记录',attachmentIds:[]}, true],
    ['ConfirmationCreate', {expectedVersion:1,method:'邮件确认',confirmedOn:'2026-10-14',note:'合成确认记录',attachmentIds:[id]}, false],
    ['ConfirmationCreate', {expectedVersion:1,method:'邮件确认',confirmedOn:'2026-10-14'}, false],
    ...['1','0.01','999999999999999999.99'].map(v => ['DecimalString',v,true]),
    ...[1,'1e2','0x10','1,000.00','-1',' 1','1.001','1000000000000000000',''].map(v => ['DecimalString',v,false])
  ];
  for (const [schema,value,expected] of samples) assert.equal(schemaAccepts(api,api.components.schemas[schema],value),expected,'schema subset sample '+schema);
  const productFiles = ['index.html', ...fs.readdirSync(path.join(root,'js')).filter(f => f.endsWith('.js')).map(f => 'js/'+f), ...fs.readdirSync(path.join(root,'css')).filter(f=>f.endsWith('.css')).map(f=>'css/'+f)];
  const sourceHashes = Object.fromEntries(productFiles.map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')]));
  const report = { result:'PASS', scope:'Static contract consistency and checker negative probes only; NO server/database/browser integration executed', ...result, mutationProbes:mutations.length, schemaSubsetSamples:samples.length, plannedIntegrationCasesExecuted:0, sourceHashes };
  const reportAt = process.argv.indexOf('--report');
  if (reportAt >= 0) {
    const destination = path.resolve(root, process.argv[reportAt+1] || '');
    assert.ok(destination.startsWith(directory + path.sep) && destination.endsWith('.json'), 'report output must be a production design JSON artifact');
    fs.mkdirSync(path.dirname(destination), {recursive:true}); fs.writeFileSync(destination, JSON.stringify(report,null,2)+'\n');
  }
  console.log(JSON.stringify(report,null,2)); return report;
}
if (require.main === module) run();
module.exports = { validate, schemaAccepts, run };
