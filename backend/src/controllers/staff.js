"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCanteenStatus = exports.updateMenuAvailability = exports.verifyPickup = exports.updateOrderStatus = void 0;
const updateOrderStatus = async (req, res) => {
    // PATCH /api/staff/orders/:id/status mock
    res.status(200).json({
        orderId: req.params.id,
        status: req.body.status || "PREPARING"
    });
};
exports.updateOrderStatus = updateOrderStatus;
const verifyPickup = async (req, res) => {
    // POST /api/staff/orders/:id/verify-pickup mock
    res.status(200).json({
        orderId: req.params.id,
        status: "COMPLETED"
    });
};
exports.verifyPickup = verifyPickup;
const updateMenuAvailability = async (req, res) => {
    // PATCH /api/staff/menu/:id/availability mock
    res.status(200).json({
        id: req.params.id,
        isAvailable: req.body.isAvailable !== undefined ? req.body.isAvailable : false
    });
};
exports.updateMenuAvailability = updateMenuAvailability;
const updateCanteenStatus = async (req, res) => {
    // PATCH /api/staff/canteen/status mock
    res.status(200).json({
        status: req.body.status || "PAUSED"
    });
};
exports.updateCanteenStatus = updateCanteenStatus;
//# sourceMappingURL=staff.js.map