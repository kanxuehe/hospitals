module.exports = {
  apps: [{
    name: 'hospitals-server',
    script: 'dist/src/main.js',
    cwd: '/home/ubuntu/hospitals/server',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    error_file: '/var/log/hospitals/error.log',
    out_file: '/var/log/hospitals/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
}
