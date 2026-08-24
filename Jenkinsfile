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

        // Nginx serves the frontend from here
        FRONTEND_DIR = '/var/www/fusion'

        // Backend application directory
        BACKEND_DIR = '/home/jenkins/apps/fusion/backend'

        // Backend environment variables
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
        // INSTALL DEPENDENCIES
        // ============================================================

        stage('Install Dependencies') {

            steps {

                sh '''
                    set -e

                    echo "======================================"
                    echo "       INSTALL DEPENDENCIES"
                    echo "======================================"

                    echo "Installing frontend dependencies..."

                    npm install

                    echo "Installing backend dependencies..."

                    cd backend

                    npm install

                    echo "Dependencies installed successfully."
                '''
            }
        }


        // ============================================================
        // BUILD FRONTEND
        // ============================================================

        stage('Build Frontend') {

            steps {

                withEnv(['CI=false']) {

                    sh '''
                        set -e

                        echo "======================================"
                        echo "          BUILD FRONTEND"
                        echo "======================================"

                        npm run build

                        test -d build
                        test -f build/index.html

                        echo "Frontend build successful."

                        du -sh build
                    '''
                }
            }
        }


        // ============================================================
        // TEST MONGODB
        // ============================================================

        stage('Test MongoDB') {

            steps {

                sh '''
                    set -e

                    echo "======================================"
                    echo "           TEST MONGODB"
                    echo "======================================"

                    if [ ! -r "${ENV_FILE}" ]; then
                        echo "ERROR: ${ENV_FILE} is not readable."
                        exit 1
                    fi

                    cd backend

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
        // DEPLOY FRONTEND
        // ============================================================

        stage('Deploy Frontend') {

            steps {

                sh '''
                    set -e

                    echo "======================================"
                    echo "          DEPLOY FRONTEND"
                    echo "======================================"

                    test -d build
                    test -f build/index.html

                    echo "Frontend deployment directory:"
                    echo "${FRONTEND_DIR}"

                    echo "Creating frontend directory..."

                    sudo -n mkdir -p "${FRONTEND_DIR}"

                    echo "Removing old frontend..."

                    sudo -n rm -rf "${FRONTEND_DIR:?}"/*

                    echo "Copying new frontend..."

                    sudo -n cp -a "${WORKSPACE}/build/." \
                        "${FRONTEND_DIR}/"

                    test -f "${FRONTEND_DIR}/index.html"

                    echo "Frontend deployed successfully."

                    echo "Frontend files:"

                    sudo -n ls -lah "${FRONTEND_DIR}"
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
                    echo "           DEPLOY BACKEND"
                    echo "======================================"

                    echo "Creating backend directory..."

                    mkdir -p "${BACKEND_DIR}"

                    echo "Removing old backend..."

                    rm -rf "${BACKEND_DIR:?}"/*

                    echo "Copying backend..."

                    cp -a "${WORKSPACE}/backend/." \
                        "${BACKEND_DIR}/"

                    cd "${BACKEND_DIR}"

                    test -f package.json

                    test -f index.js

                    echo "Installing production dependencies..."

                    npm install --omit=dev

                    echo "Backend deployed successfully."
                '''
            }
        }


        // ============================================================
        // RESTART BACKEND
        // ============================================================

        stage('Restart Backend') {

            steps {

                sh '''
                    set -e

                    echo "======================================"
                    echo "          RESTART BACKEND"
                    echo "======================================"

                    cd "${BACKEND_DIR}"

                    echo "Loading backend environment..."

                    if [ ! -r "${ENV_FILE}" ]; then
                        echo "ERROR: ${ENV_FILE} is not readable."
                        exit 1
                    fi

                    set +x

                    set -a
                    . "${ENV_FILE}"
                    set +a

                    set -x

                    echo "Checking required MongoDB variable..."

                    if [ -z "${MONGO_URI:-}" ]; then
                        echo "ERROR: MONGO_URI is missing."
                        exit 1
                    fi

                    echo "Stopping existing PM2 application..."

                    pm2 delete "${APP_NAME}-backend" 2>/dev/null || true

                    echo "Starting backend with PM2..."

                    pm2 start index.js \
                        --name "${APP_NAME}-backend" \
                        --cwd "${BACKEND_DIR}" \
                        --time

                    echo "Saving PM2 process list..."

                    pm2 save

                    echo "===== PM2 STATUS ====="

                    pm2 status

                    echo "Backend started successfully."
                '''
            }
        }


        // ============================================================
        // RELOAD NGINX
        // ============================================================

        stage('Reload Nginx') {

            steps {

                sh '''
                    set -e

                    echo "======================================"
                    echo "           RELOAD NGINX"
                    echo "======================================"

                    echo "Testing Nginx configuration..."

                    sudo -n nginx -t

                    echo "Reloading Nginx..."

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
                    set -e

                    echo "======================================"
                    echo "            HEALTH CHECK"
                    echo "======================================"

                    echo "Waiting for backend..."

                    sleep 5


                    echo "===== PM2 STATUS ====="

                    pm2 describe "${APP_NAME}-backend"


                    echo "===== CHECKING BACKEND PROCESS ====="

                    if ! pm2 describe "${APP_NAME}-backend" | grep -q "online"; then

                        echo "ERROR: Backend is not online."

                        echo "===== BACKEND LOGS ====="

                        pm2 logs "${APP_NAME}-backend" \
                            --lines 50 \
                            --nostream || true

                        exit 1
                    fi

                    echo "Backend PM2 process is ONLINE."


                    echo "===== CHECKING BACKEND PORT ====="

                    if curl \
                        --fail \
                        --silent \
                        --show-error \
                        --max-time 10 \
                        "http://127.0.0.1:${BACKEND_PORT}/" \
                        >/tmp/fusion-backend-response.txt 2>&1
                    then

                        echo "Backend HTTP check successful."

                    else

                        echo "WARNING: Backend root endpoint did not return HTTP 2xx."

                        echo "Backend response:"

                        cat /tmp/fusion-backend-response.txt || true

                        echo "PM2 is online, continuing."
                    fi


                    echo "===== CHECKING FRONTEND FILE ====="

                    sudo -n test -f "${FRONTEND_DIR}/index.html"

                    echo "Frontend index.html exists."


                    echo "===== CHECKING NGINX ====="

                    sudo -n nginx -t


                    echo "===== CHECKING FRONTEND THROUGH NGINX ====="

                    curl \
                        --fail \
                        --silent \
                        --show-error \
                        --max-time 10 \
                        http://127.0.0.1/ \
                        -o /tmp/fusion-frontend.html

                    grep -q "<html" /tmp/fusion-frontend.html

                    echo "Frontend HTTP check successful."


                    echo "===== CHECKING API THROUGH NGINX ====="

                    curl \
                        --silent \
                        --show-error \
                        --max-time 10 \
                        http://127.0.0.1/api/ \
                        -o /tmp/fusion-api-response.txt \
                        || true

                    echo "API request completed."


                    echo
                    echo "======================================"
                    echo "       DEPLOYMENT SUCCESSFUL"
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
'''

            sh '''
                set +e

                echo "======================================"
                echo "          FAILURE INFORMATION"
                echo "======================================"

                echo
                echo "===== PM2 STATUS ====="

                pm2 status

                echo
                echo "===== BACKEND DETAILS ====="

                pm2 describe "${APP_NAME}-backend" || true

                echo
                echo "===== BACKEND LOGS ====="

                pm2 logs "${APP_NAME}-backend" \
                    --lines 50 \
                    --nostream || true

                echo
                echo "===== NGINX CONFIGURATION ====="

                sudo -n nginx -t || true

                echo
                echo "===== FRONTEND DIRECTORY ====="

                sudo -n ls -lah "${FRONTEND_DIR}" || true

                echo
                echo "===== BACKEND DIRECTORY ====="

                ls -lah "${BACKEND_DIR}" || true
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
