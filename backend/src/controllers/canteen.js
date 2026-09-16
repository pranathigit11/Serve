"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCanteenStatus = void 0;
const getCanteenStatus = async (req, res) => {
    // GET /api/canteen/status mock
    res.status(200).json({
        status: "OPEN",
        message: "Orders open until 9 PM",
        updatedAt: "2026-09-16T18:00:00Z"
    });
};
exports.getCanteenStatus = getCanteenStatus;
//# sourceMappingURL=canteen.js.map