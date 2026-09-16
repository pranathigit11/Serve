"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const canteen_1 = require("../controllers/canteen");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/status', auth_1.authenticateStudentOrStaff, canteen_1.getCanteenStatus);
exports.default = router;
//# sourceMappingURL=canteen.js.map