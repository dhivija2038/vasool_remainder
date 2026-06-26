"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./config/db");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const customerRoutes_1 = __importDefault(require("./routes/customerRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const reminderRoutes_1 = __importDefault(require("./routes/reminderRoutes"));
const settingRoutes_1 = __importDefault(require("./routes/settingRoutes"));
const dataManagementRoutes_1 = __importDefault(require("./routes/dataManagementRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/customers', customerRoutes_1.default);
app.use('/api/payments', paymentRoutes_1.default);
app.use('/api/dashboard', dashboardRoutes_1.default);
app.use('/api/reports', reportRoutes_1.default);
app.use('/api/reminders', reminderRoutes_1.default);
app.use('/api/settings', settingRoutes_1.default);
app.use('/api/data-management', dataManagementRoutes_1.default);
// Catch-all route
app.use((req, res) => {
    res.status(404).json({ message: 'API Route Not Found' });
});
// Initialise DB and Start Server
async function startServer() {
    try {
        console.log('Connecting to MySQL database...');
        await (0, db_1.initDB)();
        app.listen(PORT, () => {
            console.log(`Backend server is running on http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to start server due to database error:', error);
        process.exit(1);
    }
}
startServer();
