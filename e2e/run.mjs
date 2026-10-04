/**
 * Browser end-to-end run across all three SERVE frontends against a real
 * backend, PostgreSQL and the Firebase Auth emulator.
 *
 * Prerequisites (see e2e/README.md): auth emulator on :9099, backend on :5001
 * pointed at a freshly migrated + seeded database, staff dashboard on :5173,
 * admin portal on :5174, student web build served on :45678.
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import {
  api,
  assert,
  check,
  config,
  createAdminViaScript,
  db,
  emulatorSignIn,
  emulatorUser,
  eventually,
  query,
  onCheckFailure,
  routeFirebaseSdk,
  summary,
} from './lib.mjs';

const RUN = Date.now().toString(36);
const PASSWORD = 'e2e-Password-1';
const accounts = {
  admin: `admin-${RUN}@serve.test`,
  staffA: `staff-a-${RUN}@serve.test`,
  staffB: `staff-b-${RUN}@serve.test`,
  student: `student-${RUN}@serve.test`,
};
const CANTEEN_A = 'Krishna & Godavari Night Canteen';
const CANTEEN_B = 'Yamuna & Narmada Night Canteen';
const ITEM = `Test Backend Item ${RUN}`;
const CATEGORY = `Test Backend Category ${RUN}`;

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const shot = (page, name) => page.screenshot({ path: `${config.artifacts}/${name}.png` }).catch(() => {});

async function newPage(viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport, locale: 'en-US' });
  await routeFirebaseSdk(context);
  const page = await context.newPage();
  page.on('pageerror', (error) => console.log(`  pageerror: ${error.message.slice(0, 160)}`));
  page.on('requestfailed', (request) => {
    if (/:(9099|5001)\//.test(request.url())) {
      console.log(`  requestfailed: ${request.method()} ${request.url().slice(0, 120)} ${request.failure()?.errorText}`);
    }
  });
  page.on('dialog', (dialog) => {
    console.log(`  dialog: ${dialog.message()}`);
    void dialog.dismiss();
  });
  return page;
}

/* ------------------------------------------------------------- web helpers */

async function webSignIn(page, url, email) {
  await page.goto(url);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

const modalField = (page, label) => page.locator(`.modal-content div:has(> label:text-is("${label}"))`).locator('input, select, textarea').first();

/* --------------------------------------------------------- student helpers */

async function enableSemantics(page) {
  await page.waitForSelector('flt-semantics-placeholder', { state: 'attached', timeout: 30_000 });
  await page.locator('flt-semantics-placeholder').dispatchEvent('click');
  await page.waitForTimeout(500);
}

const fbutton = (page, name) => page.getByRole('button', { name }).first();
// Merged semantics (e.g. tappable cards) expose their text through aria-label.
const ftext = (page, text) =>
  page.locator(`flt-semantics[aria-label*="${text}"]`).or(page.locator('flt-semantics').filter({ hasText: text })).first();

async function ftype(page, label, value) {
  const box = page.locator(`input[aria-label="${label}"], textarea[aria-label="${label}"]`).first();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await box.click();
    await page.waitForTimeout(200); // let Flutter attach its editing element before typing
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(value, { delay: 15 });
    if ((await box.inputValue().catch(() => value)) === value) return;
  }
  throw new Error(`could not type into ${label}`);
}

async function studentText(page) {
  return page
    .locator('flt-semantics')
    .evaluateAll((els) => els.map((e) => `${e.getAttribute('aria-label') ?? ''}\n${e.textContent ?? ''}`).join('\n'));
}

/** Scrolls the student's current list (mouse wheel, like a user) until `text` is rendered. */
async function scrollStudentTo(page, text, { maxSteps = 40 } = {}) {
  await page.mouse.move(215, 450);
  for (let step = 0; step < maxSteps; step += 1) {
    if ((await studentText(page)).includes(text)) return;
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(250);
  }
  throw new Error(`could not scroll to "${text}"`);
}

async function waitStudentText(page, text, timeout = 15_000) {
  return eventually(async () => (await studentText(page)).includes(text), { timeout, message: `student UI never showed "${text}"` });
}

/* ==================================================================== RUN */

const admin = await newPage();
const staffA = await newPage();
const staffB = await newPage();
const student = await newPage({ width: 430, height: 900 });
// The sandbox cannot reach Google: any production Firebase call is a test bug.
student.on('request', (r) => {
  if (/^https:\/\/(identitytoolkit|securetoken)\.googleapis\.com/.test(r.url())) {
    console.log(`  WARNING: production Firebase endpoint called: ${r.url().slice(0, 100)}`);
  }
});

onCheckFailure(async (id) => {
  const tag = id.replace(/[^A-Za-z0-9]/g, '_');
  for (const [name, page] of Object.entries({ admin, staffA, staffB, student })) await shot(page, `FAIL-${tag}-${name}`);
});

let canteenA;
let canteenB;
let itemId;
let orderNumber;

try {
  [canteenA] = await query('SELECT id FROM "Canteen" WHERE name = $1', [CANTEEN_A]);
  [canteenB] = await query('SELECT id FROM "Canteen" WHERE name = $1', [CANTEEN_B]);

  /* ---------------------------------------------------------- admin login */
  await check('C', 'Admin logs in (Firebase) and is authorised by the PostgreSQL ADMIN role', async () => {
    await emulatorUser(accounts.admin, PASSWORD);
    const out = createAdminViaScript(accounts.admin);
    assert(out.includes('Admin ready'), out);
    await webSignIn(admin, config.adminUrl, accounts.admin);
    await admin.getByText('PENDING ACTIONS').first().waitFor({ timeout: 15_000 });
    const [row] = await query('SELECT role FROM "User" WHERE email = $1', [accounts.admin]);
    return `role=${row.role}`;
  });

  await check('AD', 'A non-admin cannot use the admin portal (UI rejects, API returns 403)', async () => {
    const page = await newPage();
    await emulatorUser(`not-admin-${RUN}@serve.test`, PASSWORD);
    await webSignIn(page, config.adminUrl, `not-admin-${RUN}@serve.test`);
    await page.getByText('This account does not have admin access.').waitFor({ timeout: 10_000 });
    const token = await emulatorSignIn(`not-admin-${RUN}@serve.test`, PASSWORD);
    const res = await api('GET', '/api/admin/canteens', token);
    assert(res.status === 403, `status ${res.status}`);
    await page.context().close();
    return 'UI error shown; GET /api/admin/canteens → 403';
  });

  /* -------------------------------------------------- staff sign-up + request */
  await check('B', 'Staff signs up / logs in through the staff dashboard', async () => {
    await staffA.goto(config.staffUrl);
    await staffA.getByRole('button', { name: 'New staff member? Create an account' }).click();
    await staffA.getByLabel('Full Name').fill('Rahul E2E');
    await staffA.getByLabel('Email').fill(accounts.staffA);
    await staffA.getByLabel('Password').fill(PASSWORD);
    await staffA.getByRole('button', { name: 'Create Account' }).click();
    await staffA.getByText('You are not assigned to a canteen yet.').waitFor({ timeout: 15_000 });
    const header = await staffA.locator('.canteen-name').textContent();
    assert(header === 'No canteen assigned', header);
    return 'new staff has no canteen access';
  });

  await check('G', 'Staff requests canteen access from Profile', async () => {
    await staffA.getByRole('link', { name: 'Profile' }).click();
    await staffA.getByRole('button', { name: 'Change Canteen' }).click();
    await staffA.locator('.modal-content select').selectOption({ label: CANTEEN_A });
    await staffA.getByRole('button', { name: 'Submit Request' }).click();
    await staffA.getByText(`Requested: ${CANTEEN_A} (PENDING)`).waitFor({ timeout: 10_000 });
    const rows = await query(
      'SELECT r.status FROM "StaffCanteenRequest" r JOIN "User" u ON u.id = r."staffId" WHERE u.email = $1',
      [accounts.staffA],
    );
    assert(rows.length === 1 && rows[0].status === 'PENDING', JSON.stringify(rows));
    return 'PENDING request stored in PostgreSQL';
  });

  await check('AC1', 'Unassigned staff cannot manage any menu or orders (403)', async () => {
    const token = await emulatorSignIn(accounts.staffA, PASSWORD);
    const menu = await api('GET', '/api/staff/menu', token);
    const orders = await api('GET', '/api/staff/orders', token);
    assert(menu.status === 403 && orders.status === 403, `${menu.status}/${orders.status}`);
    return 'GET /api/staff/menu and /orders → 403 NO_CANTEEN_ASSIGNED';
  });

  await check('H', 'Admin sees the pending request in real time (no refresh)', async () => {
    await admin.getByText('Rahul E2E').first().waitFor({ timeout: 10_000 });
    return 'request card appeared via change_request:created';
  });

  await check('I/J', 'Admin approves; assignment persists and staff UI updates without refresh', async () => {
    const card = admin.locator('.card', { hasText: 'Rahul E2E' }).filter({ hasText: 'STAFF CANTEEN CHANGE REQUEST' });
    await card.getByRole('button', { name: 'Approve' }).click();
    await admin.locator('.modal-content').getByRole('button', { name: 'Approve' }).click();
    await admin.getByText('No pending actions').waitFor({ timeout: 10_000 });
    const [row] = await query(
      'SELECT c.name FROM "StaffProfile" p JOIN "User" u ON u.id = p."userId" JOIN "Canteen" c ON c.id = p."canteenId" WHERE u.email = $1',
      [accounts.staffA],
    );
    assert(row?.name === CANTEEN_A, JSON.stringify(row));
    await eventually(async () => (await staffA.locator('.canteen-name').textContent()) === CANTEEN_A, {
      message: 'staff header did not update',
    });
    return `staff assigned to ${row.name}; header updated live`;
  });

  /* ------------------------------------------------ staff B via admin assign */
  await check('AC2', 'Admin assigns a second staff member to canteen B from Staff Management', async () => {
    await staffB.goto(config.staffUrl);
    await staffB.getByRole('button', { name: 'New staff member? Create an account' }).click();
    await staffB.getByLabel('Full Name').fill('Priya E2E');
    await staffB.getByLabel('Email').fill(accounts.staffB);
    await staffB.getByLabel('Password').fill(PASSWORD);
    await staffB.getByRole('button', { name: 'Create Account' }).click();
    await staffB.getByText('You are not assigned to a canteen yet.').waitFor({ timeout: 15_000 });
    await admin.getByRole('link', { name: 'Staff' }).click();
    await admin.reload();
    const member = admin.locator('div', { hasText: accounts.staffB }).filter({ has: admin.getByRole('button', { name: 'Change Assignment' }) }).last();
    await member.getByRole('button', { name: 'Change Assignment' }).click();
    await admin.locator('.modal-content select').selectOption({ label: CANTEEN_B });
    await admin.getByRole('button', { name: 'Save Assignment' }).click();
    await eventually(async () => (await staffB.locator('.canteen-name').textContent()) === CANTEEN_B, {
      message: 'staff B header did not update',
    });
    return `staff B → ${CANTEEN_B}`;
  });

  /* ------------------------------------------------------------- menu (K–L) */
  await check('K/L', 'Staff creates a NEW category and item (₹99) stored in PostgreSQL', async () => {
    await staffA.getByRole('link', { name: 'Menu' }).click();
    await staffA.getByRole('button', { name: 'Add Item' }).click();
    await modalField(staffA, 'Food Name').fill(ITEM);
    await modalField(staffA, 'Category').selectOption({ label: '+ Add new category' });
    await modalField(staffA, 'New Category Name').fill(CATEGORY);
    await modalField(staffA, 'Price (₹)').fill('99');
    await modalField(staffA, 'Description').fill('Created by the browser E2E run');
    await modalField(staffA, 'Preparation Time').fill('7');
    await staffA.locator('.modal-content').getByRole('button', { name: 'Add Item' }).click();
    await staffA.getByRole('heading', { name: ITEM }).waitFor({ timeout: 10_000 });
    const [row] = await query(
      'SELECT m.id, m.price::text, m."canteenId", c.name AS category FROM "MenuItem" m JOIN "MenuCategory" c ON c.id = m."categoryId" WHERE m.name = $1',
      [ITEM],
    );
    assert(row && row.price === '99.00' && row.canteenId === canteenA.id && row.category === CATEGORY, JSON.stringify(row));
    itemId = row.id;
    return `MenuItem ${row.id} price=${row.price} canteen=A category="${row.category}"`;
  });

  /* ------------------------------------------------------- student sign-up */
  await check('A', 'Student signs up in the Flutter app; canteen defaults from hostel', async () => {
    await student.goto(config.studentUrl);
    await enableSemantics(student);
    await fbutton(student, /Continue as Student/).click();
    await fbutton(student, /New here\? Create an account/).waitFor({ timeout: 15_000 });
    await fbutton(student, /New here\? Create an account/).click();
    await ftype(student, 'Full Name', 'Aryan E2E');
    await ftype(student, 'Roll Number', `E2E${RUN}`.toUpperCase());
    await student.getByRole('button', { name: /Hostel/ }).first().click();
    await student.getByRole('menuitem', { name: 'Krishna' }).or(student.getByRole('option', { name: 'Krishna' })).first().click();
    await ftype(student, 'Email', accounts.student);
    await ftype(student, 'Password', PASSWORD);
    await fbutton(student, 'Create Account').click();
    await waitStudentText(student, 'Popular with Students');
    const [row] = await query(
      'SELECT c.name FROM "StudentProfile" p JOIN "User" u ON u.id = p."userId" JOIN "Canteen" c ON c.id = p."selectedCanteenId" WHERE u.email = $1',
      [accounts.student],
    );
    assert(row?.name === CANTEEN_A, JSON.stringify(row));
    await shot(student, 'student-home');
    return `selected canteen = ${row.name}`;
  });

  await check('M', 'Student sees the staff-created item (from the database) in the menu', async () => {
    await fbutton(student, /Menu/).click();
    await waitStudentText(student, 'Sandwiches');
    await scrollStudentTo(student, ITEM);
    const text = await studentText(student);
    assert(text.includes('₹99'), 'price ₹99 not shown');
    await shot(student, 'student-menu');
    return 'item + new category chip rendered from API';
  });

  await check('N/O', 'Staff changes the price; student sees ₹120 without refresh', async () => {
    const card = staffA.locator('.menu-grid > div', { hasText: ITEM });
    await card.getByRole('button', { name: 'Edit' }).click();
    await modalField(staffA, 'Price (₹)').fill('120');
    await staffA.getByRole('button', { name: 'Save Changes' }).click();
    await card.getByText('₹120').waitFor({ timeout: 10_000 });
    await eventually(async () => {
      const text = await studentText(student);
      const block = text.slice(text.indexOf(ITEM), text.indexOf(ITEM) + 200);
      return block.includes('₹120');
    }, { message: 'student price did not update' });
    return 'menu:item_updated pushed to student';
  });

  await check('P/Q/R', 'Staff disables the item; student sees OUT OF STOCK and cannot add it', async () => {
    const card = staffA.locator('.menu-grid > div', { hasText: ITEM });
    await card.getByRole('button', { name: 'Toggle' }).click();
    await card.getByText('OUT OF STOCK').waitFor({ timeout: 10_000 });
    await eventually(async () => {
      const text = await studentText(student);
      const block = text.slice(Math.max(0, text.indexOf(ITEM) - 60), text.indexOf(ITEM) + 10);
      return block.includes('OUT OF STOCK');
    }, { message: 'student did not see OUT OF STOCK' });
    await shot(student, 'student-out-of-stock');
    // The card is not tappable while unavailable; the API also refuses it.
    const token = await emulatorSignIn(accounts.student, PASSWORD);
    const res = await fetch(`${config.api}/api/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': `e2e-${RUN}-unavail` },
      body: JSON.stringify({ canteenId: canteenA.id, items: [{ menuItemId: itemId, quantity: 1 }] }),
    });
    const body = await res.json();
    assert(res.status === 409 && body.error === 'ITEM_UNAVAILABLE', `${res.status} ${body.error}`);
    // Re-enable for the ordering steps.
    await card.getByRole('button', { name: 'Toggle' }).click();
    await card.getByText('AVAILABLE', { exact: true }).waitFor({ timeout: 10_000 });
    return 'UI shows OUT OF STOCK; POST /api/orders → 409 ITEM_UNAVAILABLE';
  });

  /* ------------------------------------------------------------- ordering */
  await check('S/T/U/V', 'Student orders 2 × item; server computes ₹240; mock payment verified', async () => {
    await waitStudentText(student, '₹120');
    await ftext(student, ITEM).click();
    const addToCart = fbutton(student, /Add to Cart/);
    await addToCart.waitFor({ timeout: 10_000 });
    // Quantity "+" is the last icon-only (unlabelled) button on the details screen.
    await student.locator('flt-semantics[role="button"]').filter({ hasText: /^$/ }).last().click();
    await fbutton(student, /Add to Cart - ₹240/).click();
    await waitStudentText(student, 'View Cart');
    await fbutton(student, /View Cart/).click();
    await fbutton(student, /Proceed to Checkout/).waitFor();
    await shot(student, 'student-cart');
    await fbutton(student, /Proceed to Checkout/).click();
    await waitStudentText(student, 'Payment Method');
    await shot(student, 'student-checkout');
    const payButton = student.getByRole('button', { name: /^Pay ₹/ });
    const label = await payButton.textContent();
    await payButton.click();
    await waitStudentText(student, 'Order Placed Successfully', 20_000);
    await shot(student, 'student-confirmation');
    const [order] = await query(
      `SELECT o."orderNumber", o.status, o."totalAmount"::text AS total, p.status AS payment,
              (SELECT sum(quantity) FROM "OrderItem" i WHERE i."orderId" = o.id) AS qty
         FROM "Order" o JOIN "User" u ON u.id = o."studentId" JOIN "Payment" p ON p."orderId" = o.id
        WHERE u.email = $1 AND o.status <> 'CANCELLED' ORDER BY o."createdAt" DESC LIMIT 1`,
      [accounts.student],
    );
    assert(order && order.status === 'PLACED' && order.payment === 'SUCCEEDED', JSON.stringify(order));
    assert(Number(order.total) === 120 * Number(order.qty), `total ${order.total} for qty ${order.qty}`);
    orderNumber = String(order.orderNumber);
    await waitStudentText(student, orderNumber);
    return `UI "${label?.trim()}" → order #${orderNumber} PLACED, total ₹${order.total} (qty ${order.qty}), payment SUCCEEDED`;
  });

  await check('W', 'Staff A receives the order without refreshing', async () => {
    await staffA.getByRole('link', { name: 'Dashboard' }).click();
    await staffA.locator('.order-card', { hasText: `#${orderNumber}` }).waitFor({ timeout: 10_000 });
    const card = await staffA.locator('.order-card', { hasText: `#${orderNumber}` }).textContent();
    assert(card.includes('Aryan E2E') && card.includes('Krishna'), card);
    return `#${orderNumber} shown with student name + hostel`;
  });

  await check('AA', 'Staff B (canteen B) does not receive canteen A’s order', async () => {
    await staffB.waitForTimeout(1500);
    const visible = await staffB.locator('.order-card', { hasText: `#${orderNumber}` }).count();
    const token = await emulatorSignIn(accounts.staffB, PASSWORD);
    const orders = await api('GET', '/api/staff/orders', token);
    assert(visible === 0 && !orders.body.orders.some((o) => o.orderNumber === orderNumber), 'leaked to staff B');
    const [orderRow] = await query('SELECT id FROM "Order" WHERE "orderNumber" = $1', [Number(orderNumber)]);
    const attack = await api('PATCH', `/api/staff/orders/${orderRow.id}/status`, token, { status: 'PREPARING' });
    assert(attack.status === 403, `status ${attack.status}`);
    return 'not in staff B UI/API; staff B PATCH → 403';
  });

  await check('X/Y/Z', 'Staff A: PLACED → PREPARING → READY; student sees each step live', async () => {
    await fbutton(student, /Track Order/).click();
    await waitStudentText(student, 'Payment Confirmed');
    const card = staffA.locator('.order-card', { hasText: `#${orderNumber}` });
    await card.getByRole('button', { name: 'Start Preparing' }).click();
    await card.getByText('PREPARING').waitFor();
    await eventually(async () => {
      const [row] = await query('SELECT status FROM "Order" WHERE "orderNumber" = $1', [Number(orderNumber)]);
      return row.status === 'PREPARING';
    });
    await shot(student, 'student-tracking-preparing');
    await card.getByRole('button', { name: 'Mark Ready' }).click();
    await waitStudentText(student, 'Your order is ready for pickup.');
    await shot(student, 'student-tracking-ready');
    return 'student tracking screen reached READY via order:status_updated';
  });

  await check('AE', 'Paused canteen blocks new orders; student sees the server reason', async () => {
    await staffA.getByRole('button', { name: 'Pause Order Taking' }).click();
    await staffA.getByRole('button', { name: 'Pause Orders' }).click();
    await staffA.getByText('ORDER TAKING PAUSED').waitFor();
    const token = await emulatorSignIn(accounts.student, PASSWORD);
    const res = await fetch(`${config.api}/api/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': `e2e-${RUN}-paused` },
      body: JSON.stringify({ canteenId: canteenA.id, items: [{ menuItemId: itemId, quantity: 1 }] }),
    });
    const body = await res.json();
    assert(res.status === 409 && body.error === 'CANTEEN_NOT_ACCEPTING_ORDERS', `${res.status} ${body.error}`);
    await staffA.getByRole('button', { name: 'Resume Order Taking' }).click();
    await staffA.getByText('ACCEPTING ORDERS').waitFor();
    return 'POST /api/orders → 409 CANTEEN_NOT_ACCEPTING_ORDERS while paused';
  });

  /* ------------------------------------------------------ canteen switching */
  await check('Cart switch', 'Switching canteen with items asks to confirm; cancel keeps cart, confirm clears it', async () => {
    // Leave the tracking screen through its close button (no page reload: see README).
    await student.locator('flt-semantics[role="button"]').filter({ hasText: /^$/ }).first().click();
    await fbutton(student, /Menu/).click();
    await waitStudentText(student, 'Sandwiches');
    await scrollStudentTo(student, ITEM);
    await ftext(student, ITEM).click();
    await fbutton(student, /Add to Cart/).click();
    await fbutton(student, /View Cart/).click();
    await fbutton(student, /Proceed to Checkout/).click();
    await waitStudentText(student, 'Payment Method');
    await fbutton(student, new RegExp(CANTEEN_B.replace('&', '\\&'))).click();
    await waitStudentText(student, 'Switch canteen?');
    await shot(student, 'student-switch-dialog');
    await fbutton(student, 'Cancel').click();
    await waitStudentText(student, 'Payment Method');
    let [row] = await query(
      'SELECT c.name FROM "StudentProfile" p JOIN "User" u ON u.id = p."userId" JOIN "Canteen" c ON c.id = p."selectedCanteenId" WHERE u.email = $1',
      [accounts.student],
    );
    assert(row.name === CANTEEN_A, 'cancel changed the canteen');
    assert((await studentText(student)).includes(ITEM), 'cart lost after cancel');
    await fbutton(student, new RegExp(CANTEEN_B.replace('&', '\\&'))).click();
    await fbutton(student, 'Switch & Clear Cart').click();
    await eventually(async () => !(await studentText(student)).includes('View Cart'), { message: 'cart not cleared' });
    [row] = await query(
      'SELECT c.name FROM "StudentProfile" p JOIN "User" u ON u.id = p."userId" JOIN "Canteen" c ON c.id = p."selectedCanteenId" WHERE u.email = $1',
      [accounts.student],
    );
    assert(row.name === CANTEEN_B, JSON.stringify(row));
    await fbutton(student, /Menu/).click();
    await eventually(async () => !(await studentText(student)).includes(ITEM), { message: 'canteen A item still shown' });
    return 'cancel preserved cart+canteen; confirm cleared cart and switched to B (A-only item gone)';
  });

  /* --------------------------------------------------- empty database menu */
  await check('AI', 'A canteen with zero menu items shows the empty state (no mock fallback)', async () => {
    await admin.getByRole('link', { name: 'Canteens' }).click();
    await admin.getByRole('button', { name: 'Add Canteen' }).click();
    await modalField(admin, 'Canteen Name').fill(`Empty Canteen ${RUN}`);
    await modalField(admin, 'Location').fill('E2E Block');
    await modalField(admin, 'Hostels Served (Comma separated)').fill('E2E Hostel');
    await admin.locator('.modal-content').getByRole('button', { name: 'Add Canteen' }).click();
    await admin.getByText(`Empty Canteen ${RUN}`).waitFor();
    await fbutton(student, /Profile/).click();
    await ftext(student, CANTEEN_B).click();
    await waitStudentText(student, `Empty Canteen ${RUN}`);
    await fbutton(student, new RegExp(`Empty Canteen ${RUN}`)).click();
    await fbutton(student, /Menu/).click();
    await waitStudentText(student, 'No food items available right now.');
    await shot(student, 'student-empty-menu');
    const [{ count }] = await query(
      'SELECT count(*)::int FROM "MenuItem" m JOIN "Canteen" c ON c.id = m."canteenId" WHERE c.name = $1',
      [`Empty Canteen ${RUN}`],
    );
    assert(count === 0, `count ${count}`);
    return '0 rows in PostgreSQL → empty-menu state';
  });

  await check('AE2', 'Admin deactivates a canteen; students can no longer order there', async () => {
    const card = admin.locator('.menu-grid > div', { hasText: `Empty Canteen ${RUN}` });
    await card.getByRole('button', { name: 'Toggle' }).click();
    await card.getByText('INACTIVE').waitFor();
    const token = await emulatorSignIn(accounts.student, PASSWORD);
    const [canteen] = await query('SELECT id FROM "Canteen" WHERE name = $1', [`Empty Canteen ${RUN}`]);
    const menu = await api('GET', `/api/canteens/${canteen.id}/menu`, token);
    const order = await fetch(`${config.api}/api/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': `e2e-${RUN}-inactive` },
      body: JSON.stringify({ canteenId: canteen.id, items: [{ menuItemId: itemId, quantity: 1 }] }),
    });
    const body = await order.json();
    assert(menu.status === 404 && order.status === 409 && body.error === 'CANTEEN_INACTIVE', `${menu.status} ${order.status} ${body.error}`);
    return 'menu → 404 for students; order → 409 CANTEEN_INACTIVE';
  });

  /* ---------------------------------------------------------- persistence */
  await check('D', 'Student logout → login keeps account and order history; inactive canteen forces re-selection', async () => {
    await fbutton(student, /Profile/).click();
    await fbutton(student, /Logout/).click();
    await waitStudentText(student, 'Welcome to SERVE');
    await fbutton(student, /Continue as Student/).click();
    await ftype(student, 'Email', accounts.student);
    await ftype(student, 'Password', PASSWORD);
    await fbutton(student, 'Sign In').click();
    // Their selected canteen was deactivated by the admin above: the app asks
    // them to pick an active canteen before showing a menu.
    await waitStudentText(student, 'Select where you want to collect your order.');
    await shot(student, 'student-reselect-canteen');
    await fbutton(student, new RegExp(CANTEEN_A.replace('&', '\\&'))).click();
    await waitStudentText(student, 'Your Most Ordered');
    await waitStudentText(student, ITEM);
    await fbutton(student, /Orders/).click();
    await waitStudentText(student, `Order ${orderNumber}`);
    await shot(student, 'student-history');
    return `re-login → re-select active canteen → "Your Most Ordered" lists ${ITEM}; history shows order ${orderNumber}`;
  });

  await check('E', 'Staff logout → login keeps assignment and menu', async () => {
    await staffA.getByRole('button', { name: 'Logout' }).click();
    await staffA.waitForURL(`${config.studentUrl}/**`);
    await webSignIn(staffA, config.staffUrl, accounts.staffA);
    await eventually(async () => (await staffA.locator('.canteen-name').textContent()) === CANTEEN_A);
    await staffA.getByRole('link', { name: 'Menu' }).click();
    await staffA.getByRole('heading', { name: ITEM }).waitFor();
    return 'assignment + created item persisted';
  });

  await check('F', 'Admin reload keeps the session; logout returns to sign-in', async () => {
    await admin.reload();
    await admin.getByRole('link', { name: 'Canteens' }).waitFor({ timeout: 15_000 });
    await admin.getByRole('button', { name: 'Logout' }).click();
    await admin.waitForURL(`${config.studentUrl}/**`);
    await webSignIn(admin, config.adminUrl, accounts.admin);
    await admin.getByText('PENDING ACTIONS').first().waitFor({ timeout: 15_000 });
    return 'session persisted across reload; re-login works';
  });
} finally {
  writeFileSync(`${config.artifacts}/results.json`, JSON.stringify(summary(), null, 2));
  await browser.close();
  await db.end();
  const failed = summary().filter((r) => !r.passed);
  console.log(`\n${summary().length - failed.length}/${summary().length} checks passed`);
  process.exit(failed.length > 0 ? 1 : 0);
}
