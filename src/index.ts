import app from './app';
import cluster from 'cluster';
import os from 'os';

const PORT = process.env.PORT || 4545;

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`Primary process running. Forking for ${numCPUs} CPUs...`);
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Forking a new one.`);
    cluster.fork();
  });
} else {
  app.listen(PORT, () => {
    console.log(`Worker ${process.pid} running on port ${PORT}`);
  });
}
