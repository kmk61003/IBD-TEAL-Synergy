/**
 * Creates a fresh mock db object for use in tests.
 * Each call returns new jest.fn() instances so tests are independent.
 */
function createMockDb() {
    const mockStmt = () => ({
        get: jest.fn().mockReturnValue(undefined),
        all: jest.fn().mockReturnValue([]),
        run: jest.fn().mockReturnValue({ lastInsertRowid: 1, changes: 1 })
    });

    return {
        prepare: jest.fn().mockImplementation(() => mockStmt()),
        transaction: jest.fn().mockImplementation(fn => () => fn()),
        exec: jest.fn(),
        pragma: jest.fn()
    };
}

/**
 * Configures the mocked db module so that every db.prepare() call
 * returns the provided statement mock.
 *
 * @param {object} db  - The jest-mocked db module
 * @param {object} stmt - Object with get/all/run jest.fn() overrides
 */
function mockPrepare(db, stmt) {
    const base = {
        get: jest.fn().mockReturnValue(undefined),
        all: jest.fn().mockReturnValue([]),
        run: jest.fn().mockReturnValue({ lastInsertRowid: 1, changes: 1 }),
        ...stmt
    };
    db.prepare.mockReturnValue(base);
    return base;
}

// Minimal valid billing/shipping body for order tests
const validOrderBody = {
    bill_fname: 'John',
    bill_lname: 'Doe',
    bill_address1: '123 Main St',
    bill_country_code: 'IN',
    bill_pincode: '400001',
    bill_phone: '9999999999',
    bill_email: 'john@example.com',
    ship_fname: 'John',
    ship_lname: 'Doe',
    ship_address1: '123 Main St',
    ship_country_code: 'IN',
    ship_pincode: '400001',
    ship_phone: '9999999999',
    ship_email: 'john@example.com'
};

module.exports = { createMockDb, mockPrepare, validOrderBody };
