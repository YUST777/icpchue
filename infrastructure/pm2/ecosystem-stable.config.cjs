module.exports = {
    apps: [
        {
            name: 'icpchue-server',
            script: './server/index.js',
            cwd: './',
            instances: 1,
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'production',
                PORT: 3001
            },
            error_file: './logs/pm2-error.log',
            out_file: './logs/pm2-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            autorestart: true,
            max_memory_restart: '500M',
            watch: false,
            ignore_watch: ['node_modules', 'logs', '*.log']
        },
        {
            name: 'icpchue-web',
            script: 'npm',
            args: 'start',
            cwd: './next-app',
            instances: 1,
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            },
            error_file: './logs/web-error.log',
            out_file: './logs/web-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            autorestart: true,
            max_memory_restart: '500M',
            max_restarts: 10,
            min_uptime: '10s'
        }
    ]
};
