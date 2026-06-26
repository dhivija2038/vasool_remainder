"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dataManagementController_1 = require("../controllers/dataManagementController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authMiddleware);
router.post('/delete-range', dataManagementController_1.deleteDataByDateRange);
exports.default = router;
