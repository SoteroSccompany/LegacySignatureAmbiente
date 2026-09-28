module.exports = {
    apps: [
        {
            name: "api",
            script: "index.js",
            watch: false,
            log_file: "logs/api.log",
            merge_logs: true
        },
        {
            name: "worker",
            script: "infrastructure/queue/workers/index.js",
            watch: false,
            log_file: "logs/worker.log",
            merge_logs: true
        }
    ]
};
