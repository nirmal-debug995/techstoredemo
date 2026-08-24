pipeline {

    agent {
        label 'fusion-app-worker'
    }

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        skipDefaultCheckout(true)
    }

    environment {
        APP_NAME = 'fusion'
        BACKEND_PORT = '8000'

        FRONTEND_DIR = '/home/jenkins/apps/fusion/frontend'
        BACKEND_DIR = '/home/jenkins/apps/fusion/backend'

        ENV_FILE = '/etc/fusion/backend.env'
    }

    stages {

        stage('Checkout') {
            steps {
                deleteDir()

                git(
                    branch: 'dev',
                    credentialsId: 'github-ssh-key',
                    url: 'git@github.com:nirmal-debug995/techstoredemo.git'
                )
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                    set -e

                    echo "Installing frontend dependencies..."
                    npm install

                    echo "Installing backend dependencies..."
                    cd backend
                    npm install
                '''
            }
        }

        stage('Build Frontend') {
            steps {
                withEnv(['CI=false']) {
                    sh '''
                        set -e

                        echo "Building frontend..."

                        npm run build

                        test -f build/index.html

                        echo "Frontend build successful."
                    '''
                }
            }
        }

        stage('Test MongoDB') {
            steps {
                sh '''
                    set -e

                    echo "Testing MongoDB connection..."

                    cd backend

                    set +x
                    set -a
                    . "${ENV_FILE}"
                    set +a
                    set -x

                    test -n "${MONGO_URI:-}"

                    node <<'NODE'
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000
})
.then(async () => {
    console.log('MongoDB CONNECTED');
    await mongoose.connection.close();
    console.log('MongoDB connection CLOSED');
})
.catch(error => {
    console.error('MongoDB CONNECTION FAILED');
    console.error(error.message);
    process.exit(1);
});
NODE
                '''
            }
        }

        stage('Deploy Frontend') {
            steps {
                sh '''
                    set -e

                    echo "Deploying frontend..."

                    mkdir -p "${FRONTEND_DIR}"

                    rm -rf "${FRONTEND_DIR:?}"/*

                    cp -a build/. "${FRONTEND_DIR}/"

                    test -f "${FRONTEND_DIR}/index.html"

                    echo "Frontend deployed."
                '''
            }
        }

        stage('Deploy Backend') {
            steps {
                sh '''
                    set -e

                    echo "Deploying backend..."

                    mkdir -p "${BACKEND_DIR}"

                    rm -rf "${BACKEND_DIR:?}"/*

                    cp -a backend/. "${BACKEND_DIR}/"

                    cd "${BACKEND_DIR}"

                    npm install --omit=dev

                    echo "Backend deployed."
                '''
            }
        }

        stage('Restart Backend') {
            steps {
                sh '''
                    set -e

                    echo "Restarting backend..."

                    if pm2 describe "${APP_NAME}-backend" >/dev/null 2>&1; then
                        pm2 restart "${APP_NAME}-backend"
                    else
                        pm2 start index.js \
                            --name "${APP_NAME}-backend" \
                            --cwd "${BACKEND_DIR}" \
                            --time
                    fi

                    pm2 save

                    pm2 status
                '''
            }
        }

        stage('Reload Nginx') {
            steps {
                sh '''
                    set -e

                    echo "Reloading Nginx..."

                    sudo -n nginx -t
                    sudo -n systemctl reload nginx

                    echo "Nginx reloaded."
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    set -e

                    echo "Checking backend..."

                    sleep 5

                    pm2 describe "${APP_NAME}-backend"

                    if ! pm2 describe "${APP_NAME}-backend" | grep -q "online"; then
                        echo "ERROR: Backend is not online."
                        pm2 logs "${APP_NAME}-backend" --lines 50 --nostream || true
                        exit 1
                    fi

                    echo "Backend is ONLINE."

                    echo "Checking frontend..."

                    test -f "${FRONTEND_DIR}/index.html"

                    echo "Frontend is available."

                    echo "Checking Nginx..."

                    sudo -n nginx -t

                    echo "Health check successful."
                '''
            }
        }
    }

    post {

        success {
            echo '''
======================================
       DEPLOYMENT SUCCESSFUL
======================================
'''
        }

        failure {
            echo '''
======================================
        DEPLOYMENT FAILED
======================================
'''

            sh '''
                set +e

                echo "===== PM2 ====="
                pm2 status

                echo "===== Backend logs ====="
                pm2 logs "${APP_NAME}-backend" \
                    --lines 50 \
                    --nostream || true

                echo "===== Nginx ====="
                sudo -n nginx -t || true
            '''
        }

        always {
            cleanWs(
                deleteDirs: true,
                disableDeferredWipeout: true,
                notFailBuild: true
            )
        }
    }
}
