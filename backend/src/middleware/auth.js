"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateStudentOrStaff = exports.authenticateStaff = exports.authenticateStudent = void 0;
const auth_1 = require("firebase-admin/auth");
const app_1 = require("firebase-admin/app");
// Initialize Firebase Admin if not already initialized
if (!(0, app_1.getApps)().length) {
    // In a real app, this should be configured with a service account
    // initializeApp({ credential: admin.credential.cert(serviceAccount) });
    (0, app_1.initializeApp)();
}
const authenticateStudent = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    const token = authHeader.split('Bearer ')[1] || '';
    try {
        const decodedToken = await (0, auth_1.getAuth)().verifyIdToken(token);
        req.user = decodedToken;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'INVALID_TOKEN' });
    }
};
exports.authenticateStudent = authenticateStudent;
const authenticateStaff = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    const token = authHeader.split('Bearer ')[1] || '';
    try {
        const decodedToken = await (0, auth_1.getAuth)().verifyIdToken(token);
        // In a real app, verify staff role here
        // if (!decodedToken.staff) throw new Error('Not staff');
        req.user = decodedToken;
        next();
    }
    catch (error) {
        return res.status(403).json({ error: 'FORBIDDEN' });
    }
};
exports.authenticateStaff = authenticateStaff;
const authenticateStudentOrStaff = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    const token = authHeader.split('Bearer ')[1] || '';
    try {
        const decodedToken = await (0, auth_1.getAuth)().verifyIdToken(token);
        req.user = decodedToken;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'INVALID_TOKEN' });
    }
};
exports.authenticateStudentOrStaff = authenticateStudentOrStaff;
//# sourceMappingURL=auth.js.map