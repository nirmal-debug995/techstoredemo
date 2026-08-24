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

        WORKSPACE_DIR =
            '/home/jenkins/workspace/Fusion-GitHub-Checkout-Test'

        DEPLOY_ROOT =
            '/home/jenkins/apps/fusion'

        FRONTEND_DEPLOY_DIR =
            '/home/jenkins/apps/fusion/frontend'

        BACKEND_DEPLOY_DIR =
            '/home/jenkins/apps/fusion/backend'

        ENV_FILE =
            '/etc/fusion/backend.env'

        BACKEND_PORT = '8000'

        NODE_ENV = 'development'
    }

    stages {

        // ============================================================
        // VERIFY WORKER
        // ============================================================

        stage('Verify Worker') {
            steps {
                sh '''
                    set -eu

                    echo "======================================"
                    echo "           VERIFY WORKER"
                    echo "======================================"

                    echo "===== Worker ====="
                    whoami
                    hostname
                    hostname -I || true

                    echo "===== Public IP ====="
                    curl -4 -s --max-time 10 ifconfig.me || true
                    echo

                    echo "===== Node ====="
                    node -v

                    echo "===== NPM ====="
                    npm -v

                    echo "===== PM2 ====="
                    pm2 --version

                    echo "===== Nginx ====="
                    sudo -n /usr/sbin/nginx -t

                    echo "===== Environment File ====="

                    if [ ! -r "${ENV_FILE}" ]; then
                        echo "ERROR: ${ENV_FILE} is not readable by Jenkins."
                        exit 1
                    fi

                    echo "Environment file is readable by Jenkins."

                    echo "Worker verification successful."
                '''
            }
        }


        // ============================================================
        // CHECKOUT
        // ============================================================

        stage('Checkout dev') {
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
        // VERIFY CHECKOUT
        // ============================================================

        stage('Verify Checkout') {
            steps {
                sh '''
                    set -eu

                    echo "======================================"
                    echo "          VERIFY CHECKOUT"
                    echo "======================================"

                    echo "===== Repository ====="
                    pwd

                    echo "===== Git Branch ====="
                    git branch --show-current

                    echo "===== Git Commit ====="
                    git log -1 --oneline

                    echo "===== Git Status ====="
                    git status --short

                    echo "===== Root package.json ====="

                    node <<'NODE'
                    const p = require('./package.json');

                    console.log('name:', p.name);
                    console.log('version:', p.version);
                    console.log('build:', p.scripts && p.scripts.build);

                    console.log(
                        '@craco/craco:',
                        p.devDependencies &&
                        p.devDependencies['@craco/craco']
                    );
                    NODE

                    echo "===== Backend package.json ====="

                    node <<'NODE'
                    const p = require('./backend/package.json');

                    console.log('name:', p.name);
                    console.log('version:', p.version);
                    NODE

                    echo "===== Required files ====="

                    test -f package.json
                    test -f package-lock.json

                    test -f backend/package.json
                    test -f backend/package-lock.json

                    test -f craco.config.js

                    echo "Repository verification successful."
                '''
            }
        }


        // ============================================================
        // INSTALL DEPENDENCIES
        // ============================================================

        stage('Install Dependencies') {
            steps {
                sh '''
                    set -eu

                    echo "======================================"
                    echo "        INSTALL DEPENDENCIES"
                    echo "======================================"

                    echo "===== Node/NPM ====="
                    node -v
                    npm -v

                    echo "======================================"
                    echo "  RESETTING NPM CONFIGURATION"
                    echo "======================================"

                    unset NPM_CONFIG_OMIT || true
                    unset npm_config_omit || true

                    unset NPM_CONFIG_PRODUCTION || true
                    unset npm_config_production || true

                    unset NPM_CONFIG_ONLY || true
                    unset npm_config_only || true

                    unset NPM_CONFIG_NODE_ENV || true
                    unset npm_config_node_env || true

                    export NODE_ENV=development

                    echo "NODE_ENV=${NODE_ENV}"

                    echo "===== npm effective configuration ====="

                    npm config get omit || true
                    npm config get production || true

                    echo "======================================"
                    echo " Installing frontend dependencies"
                    echo "======================================"

                    npm ci --include=dev

                    echo "======================================"
                    echo " Verifying CRACO"
                    echo "======================================"

                    if [ ! -x ./node_modules/.bin/craco ]; then

                        echo "ERROR: CRACO executable is missing."

                        echo
                        echo "===== @craco directory ====="

                        ls -lah node_modules/@craco 2>/dev/null || true

                        echo
                        echo "===== npm dependency tree ====="

                        npm ls @craco/craco --depth=0 || true

                        echo
                        echo "===== npm configuration ====="

                        npm config get omit || true
                        npm config get production || true

                        exit 1
                    fi

                    echo "CRACO executable exists."

                    echo "===== CRACO package ====="

                    node <<'NODE'
                    const fs = require('fs');

                    const pkgPath =
                        './node_modules/@craco/craco/package.json';

                    if (!fs.existsSync(pkgPath)) {
                        console.error(
                            'ERROR: @craco/craco/package.json not found'
                        );

                        process.exit(1);
                    }

                    const pkg = require(pkgPath);

                    console.log(
                        'CRACO version:',
                        pkg.version
                    );
                    NODE

                    echo "===== npm ls @craco/craco ====="

                    npm ls @craco/craco --depth=0

                    echo "======================================"
                    echo " Installing backend dependencies"
                    echo "======================================"

                    cd backend

                    npm ci --include=dev

                    echo "======================================"
                    echo " Verifying Mongoose"
                    echo "======================================"

                    node <<'NODE'
                    console.log(
                        'Mongoose version:',
                        require('mongoose').version
                    );
                    NODE

                    echo "Dependency installation completed."
                '''
            }
        }


        // ============================================================
        // TEST MONGODB
        // ============================================================

        stage('Test MongoDB Connection') {
            steps {
                sh '''
                    set -eu

                    echo "======================================"
                    echo "       TEST MONGODB CONNECTION"
                    echo "======================================"

                    echo "===== Environment file ====="

                    if [ ! -r "${ENV_FILE}" ]; then
                        echo "ERROR: ${ENV_FILE} is not readable."
                        exit 1
                    fi

                    echo "Environment file is readable."

                    echo "===== Loading backend environment ====="

                    set -a
                    . "${ENV_FILE}"
                    set +a

                    if [ -z "${MONGO_URI:-}" ]; then
                        echo "ERROR: MONGO_URI is missing."
                        exit 1
                    fi

                    if [ -z "${JWT_SECRET:-}" ]; then
                        echo "ERROR: JWT_SECRET is missing."
                        exit 1
                    fi

                    if [ -z "${PORT:-}" ]; then
                        echo "ERROR: PORT is missing."
                        exit 1
                    fi

                    echo "Required environment variables loaded."

                    cd "${WORKSPACE_DIR}/backend"

                    echo "===== Testing MongoDB connection ====="

                    node <<'NODE'
                    const mongoose = require('mongoose');

                    async function main() {

                        try {

                            await mongoose.connect(
                                process.env.MONGO_URI,
                                {
                                    serverSelectionTimeoutMS: 10000
                                }
                            );

                            console.log('MongoDB CONNECTED');

                            await mongoose.connection.close();

                            console.log(
                                'MongoDB connection closed.'
                            );

                        } catch (error) {

                            console.error(
                                'MongoDB connection FAILED'
                            );

                            console.error(
                                error.message
                            );

                            process.exit(1);
                        }
                    }

                    main();
                    NODE

                    echo "MongoDB connection test successful."
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

                    cd "${WORKSPACE_DIR}"

                    unset NPM_CONFIG_OMIT || true
                    unset npm_config_omit || true

                    unset NPM_CONFIG_PRODUCTION || true
                    unset npm_config_production || true

                    unset NPM_CONFIG_ONLY || true
                    unset npm_config_only || true

                    export NODE_ENV=development

                    echo "NODE_ENV=${NODE_ENV}"

                    echo "===== CRACO executable ====="

                    if [ ! -x ./node_modules/.bin/craco ]; then

                        echo "ERROR: CRACO executable is missing."

                        echo
                        echo "===== npm ls @craco/craco ====="

                        npm ls @craco/craco --depth=0 || true

                        echo
                        echo "===== node_modules/@craco ====="

                        ls -lah node_modules/@craco 2>/dev/null || true

                        exit 1
                    fi

                    echo "CRACO executable exists."

                    echo "===== CRACO version ====="

                    ./node_modules/.bin/craco --version || true

                    echo "===== Starting frontend build ====="

                    npm run build

                    echo "===== Verifying build directory ====="

                    if [ ! -d build ]; then
                        echo "ERROR: build directory was not created."
                        exit 1
                    fi

                    if [ ! -f build/index.html ]; then
                        echo "ERROR: build/index.html does not exist."
                        exit 1
                    fi

                    echo "Frontend build successful."

                    echo "===== Build size ====="

                    du -sh build
                '''
            }
        }


        // ============================================================
        // PREPARE DEPLOYMENT
        // ============================================================

        stage('Prepare Deployment') {
            steps {
                sh '''
                    set -eu

                    echo "======================================"
                    echo "        PREPARE DEPLOYMENT"
                    echo "======================================"

                    mkdir -p "${DEPLOY_ROOT}"
                    mkdir -p "${FRONTEND_DEPLOY_DIR}"
                    mkdir -p "${BACKEND_DEPLOY_DIR}"

                    echo "Deployment directories ready."

                    ls -ld \
                        "${DEPLOY_ROOT}" \
                        "${FRONTEND_DEPLOY_DIR}" \
                        "${BACKEND_DEPLOY_DIR}"
                '''
            }
        }


        // ============================================================
        // INSTALL PRODUCTION BACKEND DEPENDENCIES
        // ============================================================

        stage('Install Production Dependencies') {
            steps {
                sh '''
                    set -eu

                    echo "======================================"
                    echo "   INSTALL PRODUCTION DEPENDENCIES"
                    echo "======================================"

                    rm -rf "${BACKEND_DEPLOY_DIR}"

                    mkdir -p "${BACKEND_DEPLOY_DIR}"

                    cp -a \
                        "${WORKSPACE_DIR}/backend/." \
                        "${BACKEND_DEPLOY_DIR}/"

                    cd "${BACKEND_DEPLOY_DIR}"

                    unset NPM_CONFIG_OMIT || true
                    unset npm_config_omit || true

                    unset NPM_CONFIG_PRODUCTION || true
                    unset npm_config_production || true

                    npm ci --omit=dev

                    echo "Production backend dependencies installed."

                    if [ ! -d node_modules ]; then
                        echo "ERROR: backend node_modules missing."
                        exit 1
                    fi

                    echo "Backend deployment directory ready."
                '''
            }
        }


        // ============================================================
        // VERIFY DEPLOYMENT ENVIRONMENT
        // ============================================================

        stage('Verify Deployment Environment') {
            steps {
                sh '''
                    set -eu

                    echo "======================================"
                    echo "     VERIFY DEPLOYMENT ENVIRONMENT"
                    echo "======================================"

                    echo "===== Node ====="
                    node -v

                    echo "===== NPM ====="
                    npm -v

                    echo "===== PM2 ====="
                    pm2 --version

                    echo "===== Nginx ====="
                    sudo -n /usr/sbin/nginx -t

                    echo "===== Deployment directories ====="

                    test -d "${DEPLOY_ROOT}"
                    test -d "${FRONTEND_DEPLOY_DIR}"
                    test -d "${BACKEND_DEPLOY_DIR}"

                    echo "Deployment environment verification successful."
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

                    cd "${BACKEND_DEPLOY_DIR}"

                    echo "===== Backend files ====="

                    test -f package.json

                    if [ -f server.js ]; then
                        ENTRY_FILE="server.js"
                    elif [ -f index.js ]; then
                        ENTRY_FILE="index.js"
                    elif [ -f app.js ]; then
                        ENTRY_FILE="app.js"
                    else
                        echo "ERROR: Could not find backend entry file."
                        exit 1
                    fi

                    echo "Backend entry point: ${ENTRY_FILE}"

                    echo "Backend files verified."

                    echo "===== Loading backend environment ====="

                    set -a
                    . "${ENV_FILE}"
                    set +a

                    echo "===== Stopping existing backend ====="

                    pm2 delete "${APP_NAME}-backend" 2>/dev/null || true

                    echo "===== Starting backend with PM2 ====="

                    pm2 start "${ENTRY_FILE}" \
                        --name "${APP_NAME}-backend" \
                        --cwd "${BACKEND_DEPLOY_DIR}" \
                        --time

                    echo "===== PM2 status after start ====="

                    pm2 status

                    echo "===== PM2 describe ====="

                    pm2 describe "${APP_NAME}-backend" || true

                    echo "===== Saving PM2 process list ====="

                    pm2 save

                    echo "Backend deployment successful."
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

                    cd "${WORKSPACE_DIR}"

                    if [ ! -d build ]; then
                        echo "ERROR: Frontend build directory does not exist."
                        exit 1
                    fi

                    if [ ! -f build/index.html ]; then
                        echo "ERROR: build/index.html does not exist."
                        exit 1
                    fi

                    echo "===== Cleaning previous frontend ====="

                    rm -rf "${FRONTEND_DEPLOY_DIR}"

                    mkdir -p "${FRONTEND_DEPLOY_DIR}"

                    echo "===== Copying frontend ====="

                    cp -a build/. "${FRONTEND_DEPLOY_DIR}/"

                    echo "===== Verifying frontend ====="

                    test -f "${FRONTEND_DEPLOY_DIR}/index.html"

                    echo "Frontend deployment successful."

                    echo "===== Frontend files ====="

                    ls -lah "${FRONTEND_DEPLOY_DIR}"
                '''
            }
        }


        // ============================================================
        // CONFIGURE NGINX
        // ============================================================

        stage('Configure Nginx') {
            steps {
                sh '''
                    set -eu

                    echo "======================================"
                    echo "           CONFIGURE NGINX"
                    echo "======================================"

                    echo "===== Testing Nginx configuration ====="

                    sudo -n /usr/sbin/nginx -t

                    echo "===== Reloading Nginx ====="

                    sudo -n /usr/bin/systemctl reload nginx

                    echo "Nginx configuration successful."
                '''
            }
        }


        // ============================================================
        // SAVE PM2 PROCESS
        // ============================================================

        stage('Save PM2 Process') {
            steps {
                sh '''
                    set -eu

                    echo "======================================"
                    echo "          SAVE PM2 PROCESS"
                    echo "======================================"

                    pm2 save

                    echo "===== PM2 status ====="

                    pm2 status

                    echo "PM2 process saved successfully."
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

                    echo "===== PM2 status ====="

                    pm2 status

                    echo
                    echo "===== Backend process ====="

                    if ! pm2 describe "${APP_NAME}-backend" >/dev/null 2>&1; then

                        echo "ERROR: ${APP_NAME}-backend is not registered in PM2."

                        echo
                        echo "===== PM2 process list ====="

                        pm2 status || true

                        exit 1
                    fi

                    echo
                    echo "===== PM2 describe ====="

                    pm2 describe "${APP_NAME}-backend"

                    echo
                    echo "Waiting for backend process to initialize..."

                    sleep 5

                    echo
                    echo "===== Backend PM2 status ====="

                    STATUS=$(
                        pm2 describe "${APP_NAME}-backend" 2>/dev/null \
                        | grep -E 'status' \
                        | head -1 \
                        || true
                    )

                    echo "Backend PM2 status: ${STATUS}"

                    echo
                    echo "===== Verifying backend is ONLINE ====="

                    if ! pm2 describe "${APP_NAME}-backend" 2>/dev/null \
                        | grep -q "online"
                    then

                        echo "ERROR: Backend is not online."

                        echo
                        echo "===== PM2 status ====="

                        pm2 status || true

                        echo
                        echo "===== PM2 describe ====="

                        pm2 describe "${APP_NAME}-backend" || true

                        echo
                        echo "===== PM2 logs ====="

                        pm2 logs "${APP_NAME}-backend" \
                            --lines 50 \
                            --nostream || true

                        exit 1
                    fi

                    echo "Backend PM2 process is ONLINE."

                    echo
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

                        echo
                        echo "===== Backend response ====="

                        cat /tmp/fusion-backend-health.txt || true

                    else

                        echo "WARNING: Backend root endpoint did not return HTTP 2xx."

                        echo
                        echo "===== Backend response ====="

                        cat /tmp/fusion-backend-health.txt || true

                        echo
                        echo "===== PM2 logs ====="

                        pm2 logs "${APP_NAME}-backend" \
                            --lines 50 \
                            --nostream || true

                        /*
                         * Do NOT immediately fail here.
                         *
                         * Some applications do not expose "/" as an
                         * HTTP health endpoint.
                         *
                         * PM2 ONLINE is the primary process check.
                         */
                    fi

                    echo
                    echo "===== Final backend PM2 verification ====="

                    if ! pm2 describe "${APP_NAME}-backend" 2>/dev/null \
                        | grep -q "online"
                    then

                        echo "ERROR: Backend stopped after health check."

                        echo
                        echo "===== PM2 logs ====="

                        pm2 logs "${APP_NAME}-backend" \
                            --lines 50 \
                            --nostream || true

                        exit 1
                    fi

                    echo "Backend remains ONLINE."

                    echo
                    echo "===== Frontend ====="

                    test -f "${FRONTEND_DEPLOY_DIR}/index.html"

                    echo "Frontend health check successful."

                    echo
                    echo "===== Nginx ====="

                    sudo -n /usr/sbin/nginx -t

                    echo
                    echo "======================================"
                    echo "       HEALTH CHECK SUCCESSFUL"
                    echo "======================================"
                '''
            }
        }
    }


    // ================================================================
    // POST ACTIONS
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
Collecting diagnostics...
'''

            /*
             * Diagnostics happen BEFORE cleanWs().
             */

            sh '''
                set +e

                echo "======================================"
                echo "             DIAGNOSTICS"
                echo "======================================"

                echo "===== Current directory ====="
                pwd

                echo "===== Git ====="

                if [ -d .git ]; then

                    git log -1 --oneline

                    git status --short

                else

                    echo "Git metadata is not available."

                fi

                echo "===== PM2 ====="

                pm2 status

                echo
                echo "===== Backend PM2 describe ====="

                pm2 describe "${APP_NAME}-backend" || true

                echo
                echo "===== PM2 logs ====="

                pm2 logs "${APP_NAME}-backend" \
                    --lines 50 \
                    --nostream || true

                echo
                echo "===== Nginx ====="

                sudo -n /usr/sbin/nginx -t

                echo
                echo "===== Deployment directories ====="

                ls -lah "${DEPLOY_ROOT}" || true

                ls -lah "${FRONTEND_DEPLOY_DIR}" || true

                ls -lah "${BACKEND_DEPLOY_DIR}" || true

                echo
                echo "===== Frontend build ====="

                if [ -d "${WORKSPACE_DIR}/build" ]; then

                    ls -lah "${WORKSPACE_DIR}/build"

                else

                    echo "Frontend build directory does not exist."

                fi

                echo
                echo "===== CRACO diagnostic ====="

                if [ -x "${WORKSPACE_DIR}/node_modules/.bin/craco" ]; then

                    echo "CRACO executable exists."

                    "${WORKSPACE_DIR}/node_modules/.bin/craco" \
                        --version || true

                else

                    echo "CRACO executable does not exist."

                fi

                if [ -d "${WORKSPACE_DIR}" ]; then

                    cd "${WORKSPACE_DIR}"

                    npm ls @craco/craco --depth=0 || true

                fi

                echo
                echo "===== NPM configuration ====="

                npm config get omit || true

                npm config get production || true

                echo
                echo "======================================"
                echo "        END OF DIAGNOSTICS"
                echo "======================================"
            '''
        }


        always {

            echo "Cleaning Jenkins workspace."

            cleanWs(
                deleteDirs: true,
                disableDeferredWipeout: true,
                notFailBuild: true
            )
        }
    }
}
