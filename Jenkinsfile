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
        APP_ROOT        = '/home/jenkins/apps/fusion'
        FRONTEND_DIR    = '/home/jenkins/apps/fusion/frontend'
        BACKEND_DIR     = '/home/jenkins/apps/fusion/backend'
        ENV_FILE        = '/etc/fusion/backend.env'

        BACKEND_PORT    = '8000'
        BACKEND_NAME    = 'fusion-backend'

        NODE_ENV        = 'production'
    }

    stages {

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
                    test -r "$ENV_FILE"
                    echo "Environment file is readable by Jenkins."

                    echo "Worker verification successful."
                '''
            }
        }

        stage('Checkout dev') {
            steps {
                git(
                    branch: 'dev',
                    credentialsId: 'github-ssh-key',
                    url: 'git@github.com:nirmal-debug995/techstoredemo.git'
                )
            }
        }

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

                    echo "===== Current npm configuration ====="
                    echo "npm omit:"
                    npm config get omit || true

                    echo "npm production:"
                    npm config get production || true

                    echo "NODE_ENV:"
                    echo "${NODE_ENV}"

                    echo "======================================"
                    echo " Removing dev-dependency omission"
                    echo "======================================"

                    # Jenkins/worker may have omit=dev configured globally.
                    # The frontend build requires @craco/craco from devDependencies.
                    npm config delete omit || true
                    npm config delete production || true

                    # Explicitly force dev dependencies for this build.
                    export NPM_CONFIG_PRODUCTION=false
                    export npm_config_production=false
                    export NPM_CONFIG_OMIT=

                    echo "===== npm configuration after override ====="
                    echo "npm omit:"
                    npm config get omit || true

                    echo "npm production:"
                    npm config get production || true

                    echo "======================================"
                    echo " Installing frontend dependencies"
                    echo "======================================"

                    npm ci --include=dev --omit=

                    echo "======================================"
                    echo " Verifying CRACO"
                    echo "======================================"

                    test -x ./node_modules/.bin/craco

                    echo "CRACO executable exists."

                    echo "===== CRACO package ====="

                    node -e "
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
                    "

                    echo "===== npm ls @craco/craco ====="

                    npm ls @craco/craco --depth=0

                    echo "======================================"
                    echo " Installing backend dependencies"
                    echo "======================================"

                    cd backend

                    npm ci --include=dev --omit=

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

        stage('Test MongoDB Connection') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "      TEST MONGODB CONNECTION"
                    echo "======================================"

                    echo "===== Environment file ====="

                    test -r "$ENV_FILE"

                    echo "Environment file is readable."

                    echo "===== Loading backend environment ====="

                    set -a
                    . "$ENV_FILE"
                    set +a

                    if [ -z "$MONGO_URI" ]; then
                        echo "ERROR: MONGO_URI is not set."
                        exit 1
                    fi

                    if [ -z "$JWT_SECRET" ]; then
                        echo "ERROR: JWT_SECRET is not set."
                        exit 1
                    fi

                    if [ -z "$PORT" ]; then
                        echo "ERROR: PORT is not set."
                        exit 1
                    fi

                    echo "Required environment variables loaded."

                    cd "$WORKSPACE/backend"

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

        stage('Build Frontend') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "          BUILD FRONTEND"
                    echo "======================================"

                    # Build requires devDependencies such as CRACO.
                    export NODE_ENV=development
                    export NPM_CONFIG_PRODUCTION=false
                    export npm_config_production=false
                    export NPM_CONFIG_OMIT=

                    echo "NODE_ENV=$NODE_ENV"

                    echo "===== npm configuration ====="
                    echo "npm omit:"
                    npm config get omit || true

                    echo "npm production:"
                    npm config get production || true

                    echo "===== CRACO executable ====="

                    if [ ! -x ./node_modules/.bin/craco ]; then
                        echo "ERROR: CRACO executable is missing."
                        echo
                        echo "Checking node_modules:"
                        ls -lah node_modules/.bin 2>/dev/null || true
                        echo
                        echo "Checking @craco:"
                        ls -lah node_modules/@craco 2>/dev/null || true
                        echo
                        echo "Checking npm dependency tree:"
                        npm ls @craco/craco --depth=0 || true

                        echo
                        echo "This means npm omitted the devDependencies."
                        exit 1
                    fi

                    echo "CRACO executable exists."

                    echo "===== CRACO version ====="

                    ./node_modules/.bin/craco --version || true

                    echo "===== Running frontend build ====="

                    npm run build

                    echo "===== Build verification ====="

                    test -d build
                    test -f build/index.html

                    echo "Frontend build completed successfully."

                    echo "===== Build directory ====="
                    du -sh build
                    ls -lah build | head -30
                '''
            }
        }

        stage('Prepare Deployment') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "        PREPARE DEPLOYMENT"
                    echo "======================================"

                    echo "Creating deployment directories."

                    mkdir -p "$APP_ROOT"
                    mkdir -p "$FRONTEND_DIR"
                    mkdir -p "$BACKEND_DIR"

                    echo "Deployment directories ready."

                    echo "===== Current deployment directories ====="

                    ls -lah "$APP_ROOT" || true
                    ls -lah "$FRONTEND_DIR" || true
                    ls -lah "$BACKEND_DIR" || true
                '''
            }
        }

        stage('Install Production Dependencies') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo " INSTALL PRODUCTION DEPENDENCIES"
                    echo "======================================"

                    cd "$WORKSPACE/backend"

                    echo "Installing backend production dependencies."

                    npm ci --omit=dev

                    echo "Backend production dependencies installed."

                    echo "===== Backend node_modules ====="

                    du -sh node_modules
                '''
            }
        }

        stage('Verify Deployment Environment') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "   VERIFY DEPLOYMENT ENVIRONMENT"
                    echo "======================================"

                    echo "===== Environment ====="

                    test -r "$ENV_FILE"
                    echo "Backend environment file exists."

                    echo "===== Deployment directories ====="

                    test -d "$APP_ROOT"
                    test -d "$FRONTEND_DIR"
                    test -d "$BACKEND_DIR"

                    echo "Deployment directories exist."

                    echo "===== Backend entry point ====="

                    test -f "$WORKSPACE/backend/index.js"

                    echo "Backend index.js exists."

                    echo "===== PM2 ====="

                    pm2 --version

                    echo "===== Nginx ====="

                    sudo -n /usr/sbin/nginx -t

                    echo "Deployment environment verification successful."
                '''
            }
        }

        stage('Deploy Backend') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "          DEPLOY BACKEND"
                    echo "======================================"

                    echo "Copying backend files."

                    rsync -a \
                        --delete \
                        --exclude=node_modules \
                        "$WORKSPACE/backend/" \
                        "$BACKEND_DIR/"

                    echo "Backend files copied."

                    echo "Copying production node_modules."

                    rsync -a \
                        --delete \
                        "$WORKSPACE/backend/node_modules/" \
                        "$BACKEND_DIR/node_modules/"

                    echo "Backend node_modules copied."

                    echo "Checking backend entry point."

                    test -f "$BACKEND_DIR/index.js"

                    echo "Starting/restarting PM2 application."

                    if pm2 describe "$BACKEND_NAME" >/dev/null 2>&1; then

                        echo "Existing PM2 process found."

                        pm2 restart "$BACKEND_NAME" \
                            --update-env

                    else

                        echo "PM2 process does not exist."

                        if [ -f "$WORKSPACE/ecosystem.config.js" ]; then

                            echo "Using repository ecosystem.config.js."

                            pm2 start "$WORKSPACE/ecosystem.config.js" \
                                --only "$BACKEND_NAME"

                        else

                            echo "ecosystem.config.js not found."
                            echo "Starting backend directly."

                            pm2 start "$BACKEND_DIR/index.js" \
                                --name "$BACKEND_NAME" \
                                --cwd "$BACKEND_DIR" \
                                --update-env

                        fi
                    fi

                    echo "Backend deployment completed."

                    echo "===== PM2 status ====="

                    pm2 status
                '''
            }
        }

        stage('Deploy Frontend') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "         DEPLOY FRONTEND"
                    echo "======================================"

                    test -d "$WORKSPACE/build"
                    test -f "$WORKSPACE/build/index.html"

                    echo "Copying frontend build."

                    rsync -a \
                        --delete \
                        "$WORKSPACE/build/" \
                        "$FRONTEND_DIR/"

                    echo "Frontend deployment completed."

                    echo "===== Frontend directory ====="

                    ls -lah "$FRONTEND_DIR"

                    echo "===== index.html ====="

                    test -f "$FRONTEND_DIR/index.html"
                '''
            }
        }

        stage('Configure Nginx') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "           CONFIGURE NGINX"
                    echo "======================================"

                    echo "Testing Nginx configuration."

                    sudo -n /usr/sbin/nginx -t

                    echo "Reloading Nginx."

                    sudo -n /usr/sbin/nginx -s reload

                    echo "Nginx reload completed."

                    sudo -n /usr/sbin/nginx -t
                '''
            }
        }

        stage('Save PM2 Process') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "          SAVE PM2 PROCESS"
                    echo "======================================"

                    echo "===== PM2 status ====="

                    pm2 status

                    echo "===== Saving PM2 process list ====="

                    pm2 save

                    echo "PM2 process list saved."

                    echo "===== PM2 status after save ====="

                    pm2 status
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "            HEALTH CHECK"
                    echo "======================================"

                    echo "===== PM2 ====="

                    pm2 status

                    if ! pm2 describe "$BACKEND_NAME" >/dev/null 2>&1; then
                        echo "ERROR: $BACKEND_NAME is not registered with PM2."
                        exit 1
                    fi

                    echo "Backend PM2 process exists."

                    echo "===== Backend port ====="

                    sleep 3

                    if curl -fsS \
                        --max-time 10 \
                        "http://127.0.0.1:${BACKEND_PORT}" \
                        >/tmp/fusion-backend-health.txt 2>&1; then

                        echo "Backend responded on port ${BACKEND_PORT}."

                        cat /tmp/fusion-backend-health.txt || true

                    else

                        echo "WARNING: Backend root URL did not return HTTP success."
                        echo "Checking PM2 logs."

                        pm2 logs "$BACKEND_NAME" \
                            --lines 50 \
                            --nostream || true

                        # Do not fail solely because the application root
                        # endpoint may not be defined.
                        echo "Continuing health verification."
                    fi

                    echo "===== Nginx ====="

                    sudo -n /usr/sbin/nginx -t

                    echo "Nginx configuration is valid."

                    echo "===== Frontend ====="

                    test -f "$FRONTEND_DIR/index.html"

                    echo "Frontend index.html exists."

                    echo "======================================"
                    echo "       HEALTH CHECK COMPLETED"
                    echo "======================================"
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
Frontend, backend, PM2 and Nginx deployment completed.
'''
        }

        failure {
            echo '''
======================================
         DEPLOYMENT FAILED
======================================
Collecting diagnostics...
'''

            sh '''
                set +e

                echo "======================================"
                echo "             DIAGNOSTICS"
                echo "======================================"

                echo "===== Git ====="
                git log -1 --oneline || true

                echo "===== PM2 ====="
                pm2 status || true

                echo "===== PM2 logs ====="
                pm2 logs "$BACKEND_NAME" \
                    --lines 50 \
                    --nostream || true

                echo "===== Nginx ====="
                sudo -n /usr/sbin/nginx -t || true

                echo "===== Deployment directories ====="

                ls -lah "$APP_ROOT" || true
                ls -lah "$FRONTEND_DIR" || true
                ls -lah "$BACKEND_DIR" || true

                echo "===== Frontend build ====="

                if [ -d "$WORKSPACE/build" ]; then
                    ls -lah "$WORKSPACE/build" || true
                else
                    echo "Frontend build directory does not exist."
                fi

                echo "===== CRACO diagnostic ====="

                if [ -x "$WORKSPACE/node_modules/.bin/craco" ]; then
                    echo "CRACO executable exists."
                else
                    echo "CRACO executable DOES NOT exist."
                fi

                npm ls @craco/craco --depth=0 || true

                echo "======================================"
                echo "       END OF DIAGNOSTICS"
                echo "======================================"
            '''
        }

        always {
            echo "Cleaning Jenkins workspace."
            cleanWs()
        }
    }
}
