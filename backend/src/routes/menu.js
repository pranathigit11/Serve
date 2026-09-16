"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const menu_1 = require("../controllers/menu");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateStudentOrStaff, menu_1.getMenu);
router.get('/:id', auth_1.authenticateStudentOrStaff, menu_1.getMenuItem);
exports.default = router;
//# sourceMappingURL=menu.js.map