pipeline {

    agent {
        label 'fusion-app-worker'
    }

    environment {
        APP_NAME = 'fusion-electronics'
        WORKSPACE_DIR = '/home/jenkins/workspace/Fusion-GitHub-Checkout-Test'

        BACKEND_DIR = '/home/jenkins/workspace/Fusion-GitHub-Checkout-Test/backend'
        FRONTEND_BUILD_DIR = '/home/jenkins/workspace/Fusion-GitHub-Checkout-Test/build'

        DEPLOY_DIR = '/opt/fusion'
        BACKEND_DEPLOY_DIR = '/opt/fusion/backend'
        FRONTEND_DEPLOY_DIR = '/var/www/fusion'

        BACKEND_ENV_FILE = '/etc/fusion/backend.env'

        BACKEND_PORT = '8000'

        NODE_ENV = 'development'

        PM2_APP_NAME = 'fusion-backend'

        NGINX_CONFIG = '/etc/nginx/nginx.conf'
    }

    stages {

        /*
         * ============================================================
         * VERIFY WORKER
         * ============================================================
         */
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

                    if [ ! -r "${BACKEND_ENV_FILE}" ]; then
                        echo "ERROR: ${BACKEND_ENV_FILE} is not readable by Jenkins."
                        exit 1
                    fi

                    echo "Environment file is readable by Jenkins."

                    echo "===== Worker verification completed ====="
                '''
            }
        }


        /*
         * ============================================================
         * CHECKOUT DEV
         * ============================================================
         */
        stage('Checkout dev') {
            steps {
                git(
                    branch: 'dev',
                    credentialsId: 'github-ssh-key',
                    url: 'git@github.com:nirmal-debug995/techstoredemo.git'
                )
            }
        }


        /*
         * ============================================================
         * VERIFY CHECKOUT
         * ============================================================
         */
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

                    echo "===== Root package.json ====="

                    node <<'NODE'
const p = require('./package.json');

console.log('name:', p.name);
console.log('version:', p.version);
console.log('build:', p.scripts && p.scripts.build);

console.log(
    '@craco/craco:',
    p.devDependencies && p.devDependencies['@craco/craco']
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


        /*
         * ============================================================
         * INSTALL DEPENDENCIES
         * ============================================================
         */
        stage('Install Dependencies') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "        INSTALL DEPENDENCIES"
                    echo "======================================"

                    export NODE_ENV=development

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

                    echo "===== Installing frontend dependencies ====="

                    npm ci --include=dev

                    echo "===== Verify CRACO ====="

                    test -x ./node_modules/.bin/craco
                    test -d ./node_modules/@craco/craco

                    echo "CRACO package installed."

                    echo "===== CRACO version ====="

                    node -p "require('./node_modules/@craco/craco/package.json').version"

                    echo "===== npm ls CRACO ====="

                    npm ls @craco/craco --depth=0

                    echo "===== Installing backend dependencies ====="

                    cd backend

                    npm ci --include=dev

                    echo "===== Verify Mongoose ====="

                    node -p "require('mongoose').version"

                    echo "===== Dependency installation completed ====="
                '''
            }
        }


        /*
         * ============================================================
         * VERIFY BUILD DEPENDENCIES
         *
         * This stage confirms that node_modules survives between
         * Install Dependencies and Build Frontend.
         * ============================================================
         */
        stage('Verify Build Dependencies') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "     VERIFY BUILD DEPENDENCIES"
                    pwd

                        echo "ERROR: node_modules directory does not exist."
                        exit 1
                    fi

                    echo "node_modules exists."

                    echo "===== CRACO directory ====="

                    if [ ! -d node_modules/@craco ]; then
                        echo "ERROR: node_modules/@craco does not exist."
                        exit 1
                    fi

                    if [ ! -d node_modules/@craco/craco ]; then
                        echo "ERROR: node_modules/@craco/craco does not exist."
                        exit 1
                    fi

                    echo "CRACO package directory exists."

                    echo "===== CRACO executable ====="

                    if [ ! -x node_modules/.bin/craco ]; then
                        echo "ERROR: node_modules/.bin/craco does not exist or is not executable."
                        exit 1
                    fi

                    echo "CRACO executable exists."

                    echo "===== CRACO version ====="

                    node -p "require('./node_modules/@craco/craco/package.json').version"

                    echo "===== npm ls CRACO ====="

                    npm ls @craco/craco --depth=0
                    echo "===== node_modules ====="

                    if [ ! -d node_modules ]; then

                    echo "======================================"

                    echo "===== Workspace ====="
                    echo "===== package script ====="


                    node -p "require('./package.json').scripts.build"


                    echo "Build dependency verification successful."
                '''

            }
        }


        /*
         * ============================================================
         * TEST MONGODB CONNECTION
         * ============================================================
         */
        stage('Test MongoDB Connection') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "        TEST MONGODB CONNECTION"
                    echo "======================================"

                    echo "===== Environment file ====="

                    if [ ! -r "${BACKEND_ENV_FILE}" ]; then
                        echo "ERROR: Backend environment file is not readable."
                        exit 1
                    fi

                    echo "Environment file is readable."

                    echo "===== Loading backend environment ====="

                    set -a
                    . "${BACKEND_ENV_FILE}"
                    set +a

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

                    cd "${BACKEND_DIR}"

                    echo "===== Testing MongoDB connection ====="

                    node <<'NODE'
const mongoose = require('mongoose');

mongoose.connect(
    process.env.MONGO_URI,
    {
        serverSelectionTimeoutMS: 15000
    }
)
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


        /*
         * ============================================================
         * BUILD FRONTEND
         * ============================================================
         */
        stage('Build Frontend') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "           BUILD FRONTEND"
                    echo "======================================"

                    export NODE_ENV=development

                    echo "NODE_ENV=${NODE_ENV}"

                    echo "===== Current directory ====="
                    pwd

                    echo "===== Node ====="
                    node -v

                    echo "===== NPM ====="
                    npm -v

                    echo "===== Verify CRACO ====="

                    test -x ./node_modules/.bin/craco
                    test -d ./node_modules/@craco/craco

                    echo "CRACO executable exists."

                    echo "===== CRACO version ====="

                    node -p "require('./node_modules/@craco/craco/package.json').version"

                    echo "===== npm ls CRACO ====="

                    npm ls @craco/craco --depth=0

                    echo "===== Running frontend build ====="

                    npm run build

                    echo "===== Frontend build completed ====="

                    echo "===== Verify build directory ====="

                    if [ ! -d build ]; then
                        echo "ERROR: build directory was not created."
                        exit 1
                    fi

                    echo "Frontend build directory exists."

                    ls -la build
                '''
            }
        }


        /*
         * ============================================================
         * PREPARE DEPLOYMENT
         * ============================================================
         */
        stage('Prepare Deployment') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "        PREPARE DEPLOYMENT"
                    echo "======================================"

                    echo "===== Verify frontend build ====="

                    test -d "${FRONTEND_BUILD_DIR}"

                    echo "Frontend build found."

                    echo "===== Verify backend ====="

                    test -f "${BACKEND_DIR}/package.json"

                    echo "Backend package.json found."

                    echo "===== Verify environment file ====="

                    test -r "${BACKEND_ENV_FILE}"

                    echo "Backend environment file found."

                    echo "===== Create deployment directories ====="

                    sudo -n mkdir -p "${DEPLOY_DIR}"
                    sudo -n mkdir -p "${BACKEND_DEPLOY_DIR}"
                    sudo -n mkdir -p "${FRONTEND_DEPLOY_DIR}"

                    echo "Deployment directories ready."
                '''
            }
        }


        /*
         * ============================================================
         * INSTALL PRODUCTION DEPENDENCIES
         * ============================================================
         */
        stage('Install Production Dependencies') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "   INSTALL PRODUCTION DEPENDENCIES"
                    echo "======================================"

                    TEMP_BACKEND="${WORKSPACE}/.backend-production"

                    rm -rf "${TEMP_BACKEND}"

                    mkdir -p "${TEMP_BACKEND}"

                    echo "===== Copy backend application ====="

                    cp -a "${BACKEND_DIR}/." "${TEMP_BACKEND}/"

                    cd "${TEMP_BACKEND}"

                    echo "===== Install production dependencies ====="

                    npm ci --omit=dev

                    echo "===== Production dependencies installed ====="

                    test -d node_modules

                    echo "Production backend prepared."
                '''
            }
        }


        /*
         * ============================================================
         * VERIFY DEPLOYMENT ENVIRONMENT
         * ============================================================
         */
        stage('Verify Deployment Environment') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "    VERIFY DEPLOYMENT ENVIRONMENT"
                    echo "======================================"

                    echo "===== PM2 ====="

                    pm2 --version

                    echo "===== Nginx ====="

                    sudo -n /usr/sbin/nginx -t

                    echo "===== Backend environment ====="

                    test -r "${BACKEND_ENV_FILE}"

                    echo "Backend environment file is available."

                    echo "===== Frontend build ====="

                    test -d "${FRONTEND_BUILD_DIR}"

                    echo "Frontend build is available."

                    echo "Deployment environment verification successful."
                '''
            }
        }


        /*
         * ============================================================
         * DEPLOY BACKEND
         * ============================================================
         */
        stage('Deploy Backend') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "          DEPLOY BACKEND"
                    echo "======================================"

                    TEMP_BACKEND="${WORKSPACE}/.backend-production"

                    if [ ! -d "${TEMP_BACKEND}" ]; then
                        echo "ERROR: Production backend directory not found."
                        exit 1
                    fi

                    echo "===== Stop existing backend ====="

                    pm2 delete "${PM2_APP_NAME}" 2>/dev/null || true

                    echo "===== Deploy backend files ====="

                    sudo -n rm -rf "${BACKEND_DEPLOY_DIR}"

                    sudo -n mkdir -p "${BACKEND_DEPLOY_DIR}"

                    sudo -n cp -a "${TEMP_BACKEND}/." "${BACKEND_DEPLOY_DIR}/"

                    echo "===== Set backend ownership ====="

                    sudo -n chown -R jenkins:jenkins "${BACKEND_DEPLOY_DIR}"

                    echo "===== Copy environment file ====="

                    if [ ! -r "${BACKEND_ENV_FILE}" ]; then
                        echo "ERROR: Backend environment file unavailable."
                        exit 1
                    fi

                    echo "Environment file remains managed at:"
                    echo "${BACKEND_ENV_FILE}"

                    echo "===== Start backend with PM2 ====="

                    cd "${BACKEND_DEPLOY_DIR}"

                    if [ -f ecosystem.config.js ]; then

                        echo "Using ecosystem.config.js"

                        pm2 start ecosystem.config.js --update-env

                    else

                        echo "ecosystem.config.js not found."

                        echo "Starting backend directly."

                        set -a
                        . "${BACKEND_ENV_FILE}"
                        set +a

                        pm2 start server.js \
                            --name "${PM2_APP_NAME}" \
                            --update-env
                    fi

                    echo "===== Save PM2 process list ====="

                    pm2 save

                    echo "===== PM2 status ====="

                    pm2 status

                    echo "Backend deployment completed."
                '''
            }
        }


        /*
         * ============================================================
         * DEPLOY FRONTEND
         * ============================================================
         */
        stage('Deploy Frontend') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "         DEPLOY FRONTEND"
                    echo "======================================"

                    echo "===== Verify build ====="

                    test -d "${FRONTEND_BUILD_DIR}"

                    echo "===== Clear existing frontend ====="

                    sudo -n rm -rf "${FRONTEND_DEPLOY_DIR}"

                    sudo -n mkdir -p "${FRONTEND_DEPLOY_DIR}"

                    echo "===== Copy frontend build ====="

                    sudo -n cp -a "${FRONTEND_BUILD_DIR}/." \
                        "${FRONTEND_DEPLOY_DIR}/"

                    echo "===== Set frontend ownership ====="

                    sudo -n chown -R www-data:www-data \
                        "${FRONTEND_DEPLOY_DIR}"

                    echo "===== Set frontend permissions ====="

                    sudo -n find "${FRONTEND_DEPLOY_DIR}" \
                        -type d \
                        -exec chmod 755 {} \\;

                    sudo -n find "${FRONTEND_DEPLOY_DIR}" \
                        -type f \
                        -exec chmod 644 {} \\;

                    echo "Frontend files deployed."

                    echo "===== Verify Nginx configuration ====="

                    sudo -n /usr/sbin/nginx -t

                    echo "===== Reload Nginx ====="

                    sudo -n systemctl reload nginx

                    echo "Nginx reloaded successfully."
                '''
            }
        }


        /*
         * ============================================================
         * HEALTH CHECK
         * ============================================================
         */
        stage('Health Check') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "            HEALTH CHECK"
                    echo "======================================"

                    echo "===== PM2 status ====="

                    pm2 status

                    echo "===== Backend process ====="

                    if ! pm2 describe "${PM2_APP_NAME}" > /dev/null 2>&1; then
                        echo "ERROR: PM2 application is not running."
                        pm2 status
                        exit 1
                    fi

                    echo "PM2 application exists."

                    echo "===== Wait for backend ====="

                    sleep 5

                    echo "===== Backend HTTP health check ====="

                    HEALTH_OK=0

                    for i in 1 2 3 4 5 6 7 8 9 10
                    do

                        echo "Health check attempt ${i}/10"

                        if curl \
                            --fail \
                            --silent \
                            --show-error \
                            --max-time 10 \
                            "http://127.0.0.1:${BACKEND_PORT}/health"
                        then

                            echo
                            echo "Backend health check successful."

                            HEALTH_OK=1

                            break

                        else

                            echo "Backend not ready yet."

                            sleep 3

                        fi

                    done

                    if [ "${HEALTH_OK}" -ne 1 ]; then

                        echo "ERROR: Backend health check failed."

                        echo "===== PM2 status ====="

                        pm2 status

                        echo "===== PM2 logs ====="

                        pm2 logs "${PM2_APP_NAME}" \
                            --lines 100 \
                            --nostream || true

                        exit 1
                    fi

                    echo "===== Nginx health check ====="

                    if ! curl \
                        --fail \
                        --silent \
                        --show-error \
                        --max-time 10 \
                        "http://127.0.0.1/"
                    then

                        echo "ERROR: Nginx/frontend health check failed."

                        sudo -n /usr/sbin/nginx -t

                        exit 1
                    fi

                    echo
                    echo "Frontend health check successful."

                    echo "======================================"
                    echo "       ALL HEALTH CHECKS PASSED"
                    echo "======================================"
                '''
            }
        }
    }


    /*
     * ================================================================
     * POST ACTIONS
     * ================================================================
     */
    post {

        success {

            echo '''
======================================
       DEPLOYMENT SUCCESSFUL
======================================
Frontend and backend deployment completed successfully.
'''
        }

        failure {

            echo '''
======================================
        DEPLOYMENT FAILED
======================================
Check the failed stage and Jenkins console output.
'''
        }

        always {

            echo "===== Pipeline completed ====="

            script {

                sh '''
                    echo "===== Final PM2 status ====="

                    pm2 status || true

                    echo "===== Final Nginx test ====="

                    sudo -n /usr/sbin/nginx -t || true
                '''
            }
        }
    }
}
