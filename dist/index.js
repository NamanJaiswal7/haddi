"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Hot reloading development server - Detached Mode
const app_1 = __importDefault(require("./app"));
const cluster_1 = __importDefault(require("cluster"));
const os_1 = __importDefault(require("os"));
const PORT = process.env.PORT || 4545;
if (cluster_1.default.isPrimary) {
    const numCPUs = os_1.default.cpus().length;
    console.log(`Primary process running. Forking for ${numCPUs} CPUs...`);
    for (let i = 0; i < numCPUs; i++) {
        cluster_1.default.fork();
    }
    cluster_1.default.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Forking a new one.`);
        cluster_1.default.fork();
    });
}
else {
    app_1.default.listen(PORT, () => {
        console.log(`Worker ${process.pid} running on port ${PORT}`);
    });
}
