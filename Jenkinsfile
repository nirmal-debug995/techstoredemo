pipeline {

    agent {
        label 'fusion-app-worker'
    }

    options {
        timestamps()
        disableConcurrentBuilds()
        skipDefaultCheckout(true)

        // Prevent very long builds from hanging forever
        timeout(time: 30, unit: 'MINUTES')
    }

    environment {
        APP_NAME        = 'fusion'
        DEPLOY_ROOT     = '/home/jenkins/apps/fusion'
        FRONTEND_ROOT   = '/home/jenkins/apps/fusion/frontend'
        BACKEND_ROOT    = '/home/jenkins/apps/fusion/backend'

        BACKEND_ENV     = '/etc/fusion/backend.env'

        PM2_APP_NAME    = 'fusion-backend'

        FRONTEND_PORT   = '3000'
        BACKEND_PORT    = '8000'

        NODE_ENV        = 'production'
    }

    stages {

        // ============================================================
        // VERIFY WORKER
        // ============================================================

        stage('Verify Worker') {

            steps {

                sh '''
                    set -e

                    echo "======================================"
                    echo "           VERIFY WORKER"
                    echo "======================================"

                    echo "===== Worker ====="
                    whoami
                    hostname
                    hostname -I

                    echo "===== Public IP ====="
                    curl -4 -s ifconfig.me || true
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
                    test -r "${BACKEND_ENV}"
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
                    set -e

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

                    node -e "
                        const p = require('./package.json');

                        console.log('name:', p.name);
                        console.log('version:', p.version);
                        console.log('build:', p.scripts && p.scripts.build);
                        console.log(
                            '@craco/craco:',
                            p.devDependencies &&
                            p.devDependencies['@craco/craco']
                        );
                    "

                    echo "===== Backend package.json ====="

                    node -e "
                        const p = require('./backend/package.json');

                        console.log('name:', p.name);
                        console.log('version:', p.version);
                    "

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
                    set -e

                    echo "======================================"
                    echo "        INSTALL DEPENDENCIES"
                    echo "======================================"

                    echo "===== Node/NPM ====="
                    node -v
                    npm -v

                    echo "===== npm configuration ====="

                    echo "npm omit:"
                    npm config get omit || true

                    echo "npm production:"
                    npm config get production || true

                    echo "NODE_ENV:"
                    echo "${NODE_ENV}"

                    echo "======================================"
                    echo " Installing frontend dependencies"
                    echo "======================================"

                    npm ci --include=dev

                    echo "======================================"
                    echo " Verifying CRACO"
                    echo "======================================"

                    # IMPORTANT:
                    # Do NOT use:
                    #
                    # require('@craco/craco/package.json')
                    #
                    # The previous pipeline failed here even though
                    # the CRACO executable was correctly installed.
                    #
                    # The reliable check is the executable itself.

                    test -x ./node_modules/.bin/craco

                    echo "CRACO executable exists."

                    # Verify package through npm rather than Node require.
                    npm ls @craco/craco --depth=0 || true

                    echo "======================================"
                    echo " Installing backend dependencies"
                    echo "======================================"

                    cd backend

                    npm ci --include=dev

                    echo "======================================"
                    echo " Verifying Mongoose"
                    echo "======================================"

                    node -e "
                        console.log(
                            'Mongoose version:',
                            require('mongoose').version
                        );
                    "

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
                    set -e

                    echo "======================================"
                    echo "      TEST MONGODB CONNECTION"
                    echo "======================================"

                    echo "===== Environment file ====="

                    test -r "${BACKEND_ENV}"

                    echo "Environment file is readable."

                    echo "===== Loading backend environment ====="

                    # Disable shell tracing while loading secrets.
                    set +x

                    set -a
                    . "${BACKEND_ENV}"
                    set +a

                    set -x

                    # Never print the actual values.

                    if [ -z "${MONGO_URI:-}" ]; then
                        echo "ERROR: MONGO_URI is not configured."
                        exit 1
                    fi

                    if [ -z "${JWT_SECRET:-}" ]; then
                        echo "ERROR: JWT_SECRET is not configured."
                        exit 1
                    fi

                    if [ -z "${PORT:-}" ]; then
                        echo "ERROR: PORT is not configured."
                        exit 1
                    fi

                    echo "Required environment variables loaded."

                    cd "${WORKSPACE}/backend"

                    echo "===== Testing MongoDB connection ====="

                    node <<'NODE'
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI;

if (!uri) {
    console.error('MONGO_URI is not available.');
    process.exit(1);
}

mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000
})
.then(async () => {

    console.log('MongoDB CONNECTED');

    await mongoose.connection.close();

    console.log('MongoDB connection closed.');

    process.exit(0);

})
.catch((error) => {

    console.error(
        'MongoDB FAILED:',
        error.message
    );

    process.exit(1);
});
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
                    set -e

                    echo "======================================"
                    echo "           BUILD FRONTEND"
                    echo "======================================"

                    export NODE_ENV=development

                    echo "NODE_ENV=${NODE_ENV}"

                    echo "===== CRACO executable ====="

                    test -x ./node_modules/.bin/craco

                    echo "CRACO executable exists."

                    echo "===== CRACO package ====="

                    npm ls @craco/craco --depth=0 || true

                    echo "===== Frontend build ====="

                    npm run build

                    echo "===== Build verification ====="

                    test -d build

                    test -f build/index.html

                    echo "Frontend build completed successfully."

                    echo "Build contents:"
                    ls -lah build
                '''
            }
        }


        // ============================================================
        // PREPARE DEPLOYMENT
        // ============================================================

        stage('Prepare Deployment') {

            steps {

                sh '''
                    set -e

                    echo "======================================"
                    echo "        PREPARE DEPLOYMENT"
                    echo "======================================"

                    echo "Deployment root:"
                    echo "${DEPLOY_ROOT}"

                    echo "Creating deployment directories."

                    sudo -n mkdir -p "${DEPLOY_ROOT}"
                    sudo -n mkdir -p "${FRONTEND_ROOT}"
                    sudo -n mkdir -p "${BACKEND_ROOT}"

                    sudo -n chown -R jenkins:jenkins "${DEPLOY_ROOT}"

                    echo "Deployment directories ready."

                    echo "===== Existing deployment ====="

                    ls -lah "${DEPLOY_ROOT}" || true
                '''
            }
        }


        // ============================================================
        // INSTALL PRODUCTION DEPENDENCIES
        // ============================================================

        stage('Install Production Dependencies') {

            steps {

                sh '''
                    set -e

                    echo "======================================"
                    echo " INSTALL PRODUCTION DEPENDENCIES"
                    echo "======================================"

                    cd backend

                    echo "Removing existing backend node_modules."

                    rm -rf node_modules

                    echo "Installing production dependencies."

                    npm ci --omit=dev

                    echo "Production dependencies installed."

                    echo "===== Verify backend ====="

                    test -f package.json
                    test -f index.js
                    test -d node_modules

                    node -e "
                        console.log(
                            'Mongoose version:',
                            require('mongoose').version
                        );
                    "

                    echo "Backend production installation verified."
                '''
            }
        }


        // ============================================================
        // VERIFY DEPLOYMENT ENVIRONMENT
        // ============================================================

        stage('Verify Deployment Environment') {

            steps {

                sh '''
                    set -e

                    echo "======================================"
                    echo " VERIFY DEPLOYMENT ENVIRONMENT"
                    echo "======================================"

                    echo "===== Environment ====="

                    test -r "${BACKEND_ENV}"

                    echo "Backend environment file exists."

                    echo "===== PM2 ====="

                    pm2 --version

                    echo "===== Nginx ====="

                    sudo -n /usr/sbin/nginx -t

                    echo "===== Deployment directories ====="

                    test -d "${DEPLOY_ROOT}"
                    test -d "${FRONTEND_ROOT}"
                    test -d "${BACKEND_ROOT}"

                    echo "Deployment environment verified."
                '''
            }
        }


        // ============================================================
        // DEPLOY BACKEND
        // ============================================================

        stage('Deploy Backend') {

            steps {

                sh '''
                    set -e

                    echo "======================================"
                    echo "          DEPLOY BACKEND"
                    echo "======================================"

                    echo "===== Preparing backend ====="

                    rm -rf "${BACKEND_ROOT}"

                    mkdir -p "${BACKEND_ROOT}"

                    echo "Copying backend source."

                    cp -a "${WORKSPACE}/backend/." "${BACKEND_ROOT}/"

                    echo "===== Backend files ====="

                    ls -lah "${BACKEND_ROOT}"

                    echo "===== Backend environment ====="

                    test -r "${BACKEND_ENV}"

                    echo "Environment file available."

                    echo "===== PM2 deployment ====="

                    cd "${BACKEND_ROOT}"

                    # Stop old application if it exists.
                    pm2 delete "${PM2_APP_NAME}" 2>/dev/null || true

                    # Start using repository ecosystem configuration.
                    #
                    # The ecosystem file contains:
                    #
                    # cwd: /home/jenkins/apps/fusion/backend
                    # script: index.js

                    if [ -f "${WORKSPACE}/ecosystem.config.js" ]; then

                        echo "Using ecosystem.config.js"

                        cp "${WORKSPACE}/ecosystem.config.js" \
                           "${DEPLOY_ROOT}/ecosystem.config.js"

                        pm2 start "${DEPLOY_ROOT}/ecosystem.config.js"

                    else

                        echo "ecosystem.config.js not found."

                        echo "Starting backend directly."

                        pm2 start index.js \
                            --name "${PM2_APP_NAME}" \
                            --cwd "${BACKEND_ROOT}" \
                            --time

                    fi

                    echo "===== PM2 status ====="

                    pm2 status

                    echo "===== PM2 details ====="

                    pm2 describe "${PM2_APP_NAME}" || true

                    echo "Backend deployment completed."
                '''
            }
        }


        // ============================================================
        // DEPLOY FRONTEND
        // ============================================================

        stage('Deploy Frontend') {

            steps {

                sh '''
                    set -e

                    echo "======================================"
                    echo "         DEPLOY FRONTEND"
                    echo "======================================"

                    test -d "${WORKSPACE}/build"
                    test -f "${WORKSPACE}/build/index.html"

                    echo "Cleaning existing frontend."

                    rm -rf "${FRONTEND_ROOT}"

                    mkdir -p "${FRONTEND_ROOT}"

                    echo "Copying frontend build."

                    cp -a "${WORKSPACE}/build/." \
                          "${FRONTEND_ROOT}/"

                    echo "===== Frontend files ====="

                    ls -lah "${FRONTEND_ROOT}"

                    echo "Frontend deployment completed."
                '''
            }
        }


        // ============================================================
        // NGINX
        // ============================================================

        stage('Configure Nginx') {

            steps {

                sh '''
                    set -e

                    echo "======================================"
                    echo "          CONFIGURE NGINX"
                    echo "======================================"

                    echo "===== Repository nginx files ====="

                    if [ -d "${WORKSPACE}/nginx" ]; then

                        find "${WORKSPACE}/nginx" \
                            -maxdepth 2 \
                            -type f \
                            -print

                    else

                        echo "No nginx directory found."

                    fi

                    echo "===== Current nginx configuration ====="

                    sudo -n /usr/sbin/nginx -t

                    echo "Nginx configuration test successful."

                    echo "===== Reloading nginx ====="

                    sudo -n systemctl reload nginx

                    echo "Nginx reloaded."

                    sudo -n /usr/sbin/nginx -t
                '''
            }
        }


        // ============================================================
        // SAVE PM2
        // ============================================================

        stage('Save PM2 Process') {

            steps {

                sh '''
                    set -e

                    echo "======================================"
                    echo "          SAVE PM2 PROCESS"
                    echo "======================================"

                    pm2 save

                    echo "PM2 process list saved."

                    pm2 status
                '''
            }
        }


        // ============================================================
        // HEALTH CHECK
        // ============================================================

        stage('Health Check') {

            steps {

                sh '''
                    set -e

                    echo "======================================"
                    echo "           HEALTH CHECK"
                    echo "======================================"

                    echo "===== PM2 status ====="

                    pm2 status

                    echo "===== Backend process ====="

                    pm2 describe "${PM2_APP_NAME}"

                    echo "===== Backend port ====="

                    sleep 3

                    if command -v curl >/dev/null 2>&1; then

                        echo "Testing backend on port ${BACKEND_PORT}."

                        curl \
                            --fail \
                            --silent \
                            --show-error \
                            --max-time 10 \
                            "http://127.0.0.1:${BACKEND_PORT}" \
                            || true

                    fi

                    echo
                    echo "===== Nginx test ====="

                    sudo -n /usr/sbin/nginx -t

                    echo "===== Frontend ====="

                    test -f "${FRONTEND_ROOT}/index.html"

                    echo "Frontend index.html exists."

                    echo "======================================"
                    echo "       HEALTH CHECK COMPLETED"
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

Fusion deployment completed successfully.

Frontend:
${FRONTEND_ROOT}

Backend:
${BACKEND_ROOT}

PM2:
${PM2_APP_NAME}
'''
        }

        failure {

            sh '''
                set +e

                echo "======================================"
                echo "       DEPLOYMENT FAILED"
                echo "======================================"

                echo "===== Git ====="

                git log -1 --oneline 2>/dev/null || true

                echo "===== PM2 ====="

                pm2 status || true

                echo "===== PM2 logs ====="

                pm2 logs "${PM2_APP_NAME}" \
                    --lines 50 \
                    --nostream 2>/dev/null || true

                echo "===== Nginx ====="

                sudo -n /usr/sbin/nginx -t || true

                echo "===== Deployment directories ====="

                ls -lah "${DEPLOY_ROOT}" 2>/dev/null || true
                ls -lah "${FRONTEND_ROOT}" 2>/dev/null || true
                ls -lah "${BACKEND_ROOT}" 2>/dev/null || true

                echo "======================================"
                echo " Check the failed stage above."
                echo "======================================"
            '''

            echo '''
======================================
        DEPLOYMENT FAILED
======================================
Check the failed stage and Jenkins console output.
'''
        }

        always {

            echo "Cleaning Jenkins workspace."

            cleanWs(
                deleteDirs: true,
                disableDeferredWipeout: true
            )
        }
    }
}
