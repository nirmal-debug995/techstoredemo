module.exports = {
  apps: [
    {
      name: 'fusion-backend',
      cwd: '/home/jenkins/apps/fusion/backend',
      script: 'index.js',
      interpreter: 'node',

      env: {
        NODE_ENV: 'production',
        PORT: 8000
      }
    }
  ]
};
