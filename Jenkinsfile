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

        DEPLOY_ROOT = '/home/jenkins/apps/fusion'

        FRONTEND_DEPLOY_DIR = '/home/jenkins/apps/fusion/frontend'

        BACKEND_DEPLOY_DIR = '/home/jenkins/apps/fusion/backend'

        ENV_FILE = '/etc/fusion/backend.env'
    }

    stages {

        // ============================================================
        // CHECKOUT
        // ============================================================

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


        // ============================================================
        // VERIFY
        // ============================================================

        stage('Verify') {

            steps {

                sh '''
                    set -eu

                    echo "======================================"
                    echo "             VERIFY"
                    echo "======================================"

                    echo "===== User ====="
                    whoami

                    echo "===== Host ====="
                    hostname

                    echo "===== Node ====="
                    node -v

                    echo "===== NPM ====="
                    npm -v

                    echo "===== PM2 ====="
                    pm2 --version

                    echo "===== Nginx ====="
                    sudo -n nginx -t

                    echo "===== Git ====="
                    git branch --show-current
                    git log -1 --oneline

                    echo "===== Required files ====="

                    test -f package.json
                    test -f package-lock.json

                    test -f backend/package.json
                    test -f backend/package-lock.json

                    test -f craco.config.js

                    echo "Required files verified."

                    echo "===== Environment ====="

                    if [ ! -r "${ENV_FILE}" ]; then
                        echo "ERROR: ${ENV_FILE} is not readable."
                        exit 1
                    fi

                    echo "Environment file is readable."

                    echo "Verification successful."
                '''
            }
        }


        // ============================================================
        // INSTALL FRONTEND
        // ============================================================

        stage('Install Frontend Dependencies') {

            steps {

                sh '''
                    set -eu

                    echo "======================================"
                    echo "    INSTALL FRONTEND DEPENDENCIES"
                    echo "======================================"

                    cd "${WORKSPACE}"

                    unset NPM_CONFIG_OMIT || true
                    unset npm_config_omit || true

                    unset NPM_CONFIG_PRODUCTION || true
                    unset npm_config_production || true

                    npm ci --include=dev

                    echo "===== Checking CRACO ====="

                    if [ ! -x node_modules/.bin/craco ]; then
                        echo "ERROR: CRACO executable not found."
                        echo
                        echo "npm dependency tree:"
                        npm ls @craco/craco --depth=0 || true
                        exit 1
                    fi

                    echo "CRACO found."

                    npm ls @craco/craco --depth=0

                    echo "Frontend dependencies installed."
                '''
            }
        }


        // ============================================================
        // BUILD FRONTEND
        // ============================================================

        stage('Build Frontend') {

            steps {

                sh '''
                    set -eu

                    echo "======================================"
                    echo "          BUILD FRONTEND"
                    echo "======================================"

                    cd "${WORKSPACE}"

                    export CI=false

                    npm run build

                    if [ ! -d build ]; then
                        echo "ERROR: build directory was not created."
                        exit 1
                    fi

                    if [ ! -f build/index.html ]; then
                        echo "ERROR: build/index.html does not exist."
                        exit 1
                    fi

                    echo "Frontend build successful."

                    du -sh build
                '''
            }
        }


        // ============================================================
        // TEST MONGODB
        // ============================================================

        stage('Test MongoDB') {

            steps {

                sh '''
                    set -eu

                    echo "======================================"
                    echo "          TEST MONGODB"
                    echo "======================================"

                    if [ ! -r "${ENV_FILE}" ]; then
                        echo "ERROR: ${ENV_FILE} is not readable."
                        exit 1
                    fi

                    cd "${WORKSPACE}/backend"

                    set +x
                    set -a
                    . "${ENV_FILE}"
                    set +a
                    set -x

                    if [ -z "${MONGO_URI:-}" ]; then
                        echo "ERROR: MONGO_URI is missing."
                        exit 1
                    fi

                    echo "Testing MongoDB connection..."

                    node <<'NODE'
const mongoose = require('mongoose');

async function testMongoDB() {
    try {

        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000
        });

        console.log('MongoDB CONNECTED');

        await mongoose.connection.close();

        console.log('MongoDB connection CLOSED');

    } catch (error) {

        console.error('MongoDB CONNECTION FAILED');
        console.error(error.message);

        process.exit(1);
    }
}

testMongoDB();
NODE

                    echo "MongoDB test successful."
                '''
            }
        }


        // ============================================================
        // INSTALL BACKEND
        // ============================================================

        stage('Install Backend Dependencies') {

            steps {

                sh '''
                    set -eu

                    echo "======================================"
                    echo "     INSTALL BACKEND DEPENDENCIES"
                    echo "======================================"

                    cd "${WORKSPACE}/backend"

                    unset NPM_CONFIG_OMIT || true
                    unset npm_config_omit || true

                    unset NPM_CONFIG_PRODUCTION || true
                    unset npm_config_production || true

                    npm ci --omit=dev

                    echo "Backend dependencies installed."

                    node -e "console.log('Mongoose:', require('mongoose').version)"
                '''
            }
        }


        // ============================================================
        // DEPLOY FRONTEND
        // ============================================================

        stage('Deploy Frontend') {

            steps {

                sh '''
                    set -eu

                    echo "======================================"
                    echo "          DEPLOY FRONTEND"
                    echo "======================================"

                    if [ ! -d "${WORKSPACE}/build" ]; then
                        echo "ERROR: build directory does not exist."
                        exit 1
                    fi

                    if [ ! -f "${WORKSPACE}/build/index.html" ]; then
                        echo "ERROR: build/index.html does not exist."
                        exit 1
                    fi

                    echo "Creating frontend directory..."

                    mkdir -p "${FRONTEND_DEPLOY_DIR}"

                    echo "Removing old frontend..."

                    rm -rf "${FRONTEND_DEPLOY_DIR:?}"/*

                    echo "Copying new frontend..."

                    cp -a "${WORKSPACE}/build/." \
                          "${FRONTEND_DEPLOY_DIR}/"

                    test -f "${FRONTEND_DEPLOY_DIR}/index.html"

                    echo "Frontend deployed successfully."
                '''
            }
        }


        // ============================================================
        // DEPLOY BACKEND
        // ============================================================

        stage('Deploy Backend') {

            steps {

                sh '''
                    set -eu

                    echo "======================================"
                    echo "           DEPLOY BACKEND"
                    echo "======================================"

                    echo "Creating backend deployment directory..."

                    mkdir -p "${BACKEND_DEPLOY_DIR}"

                    echo "Removing old backend..."

                    rm -rf "${BACKEND_DEPLOY_DIR:?}"/*

                    echo "Copying backend..."

                    cp -a "${WORKSPACE}/backend/." \
                          "${BACKEND_DEPLOY_DIR}/"

                    cd "${BACKEND_DEPLOY_DIR}"

                    test -f package.json

                    if [ -f server.js ]; then
                        ENTRY_FILE="server.js"
                    elif [ -f index.js ]; then
                        ENTRY_FILE="index.js"
                    elif [ -f app.js ]; then
                        ENTRY_FILE="app.js"
                    else
                        echo "ERROR: Backend entry file not found."
                        exit 1
                    fi

                    echo "Backend entry point: ${ENTRY_FILE}"

                    echo "===== Installing production dependencies ====="

                    unset NPM_CONFIG_OMIT || true
                    unset npm_config_omit || true

                    unset NPM_CONFIG_PRODUCTION || true
                    unset npm_config_production || true

                    npm ci --omit=dev

                    echo "===== Loading environment ====="

                    set +x
                    set -a
                    . "${ENV_FILE}"
                    set +a
                    set -x

                    echo "===== Restarting backend ====="

                    pm2 delete "${APP_NAME}-backend" 2>/dev/null || true

                    pm2 start "${ENTRY_FILE}" \
                        --name "${APP_NAME}-backend" \
                        --cwd "${BACKEND_DEPLOY_DIR}" \
                        --time

                    pm2 save

                    echo "Backend started."

                    pm2 describe "${APP_NAME}-backend"
                '''
            }
        }


        // ============================================================
        // NGINX
        // ============================================================

        stage('Reload Nginx') {

            steps {

                sh '''
                    set -eu

                    echo "======================================"
                    echo "           RELOAD NGINX"
                    echo "======================================"

                    sudo -n nginx -t

                    sudo -n systemctl reload nginx

                    echo "Nginx reloaded successfully."
                '''
            }
        }


        // ============================================================
        // HEALTH CHECK
        // ============================================================

        stage('Health Check') {

            steps {

                sh '''
                    set -eu

                    echo "======================================"
                    echo "            HEALTH CHECK"
                    echo "======================================"

                    echo "===== Backend process ====="

                    pm2 describe "${APP_NAME}-backend"

                    STATUS=$(pm2 describe "${APP_NAME}-backend" \
                        | grep -E 'status' \
                        | head -1 || true)

                    echo "Backend PM2 status: ${STATUS}"

                    echo "===== Waiting for backend ====="

                    sleep 5

                    echo "===== Checking PM2 ====="

                    if ! pm2 describe "${APP_NAME}-backend" \
                        | grep -q "online"; then

                        echo "ERROR: Backend is not online."

                        echo "===== PM2 logs ====="

                        pm2 logs "${APP_NAME}-backend" \
                            --lines 50 \
                            --nostream || true

                        exit 1
                    fi

                    echo "Backend PM2 process is ONLINE."

                    echo "===== Checking backend port ====="

                    if curl \
                        --fail \
                        --silent \
                        --show-error \
                        --max-time 10 \
                        "http://127.0.0.1:${BACKEND_PORT}/" \
                        >/tmp/fusion-backend-health.txt 2>&1
                    then

                        echo "Backend HTTP check successful."

                    else

                        echo "WARNING: Backend root endpoint did not return HTTP 2xx."

                        echo "Response:"
                        cat /tmp/fusion-backend-health.txt || true

                        echo
                        echo "PM2 is online, so continuing."

                    fi

                    echo "===== Checking frontend ====="

                    test -f "${FRONTEND_DEPLOY_DIR}/index.html"

                    echo "Frontend is deployed."

                    echo "===== Checking Nginx ====="

                    sudo -n nginx -t

                    echo
                    echo "======================================"
                    echo "       DEPLOYMENT SUCCESSFUL"
                    echo "======================================"
                '''
            }
        }
    }


    // ================================================================
    // POST
    // ================================================================

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

                echo
                echo "===== Backend PM2 ====="

                pm2 describe "${APP_NAME}-backend" || true

                echo
                echo "===== Backend logs ====="

                pm2 logs "${APP_NAME}-backend" \
                    --lines 50 \
                    --nostream || true

                echo
                echo "===== Nginx ====="

                sudo -n nginx -t || true

                echo
                echo "===== Deployment directories ====="

                ls -lah "${DEPLOY_ROOT}" || true

                ls -lah "${FRONTEND_DEPLOY_DIR}" || true

                ls -lah "${BACKEND_DEPLOY_DIR}" || true
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
