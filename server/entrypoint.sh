#!/bin/sh

# Print environment for debugging
echo "Database URL: $DATABASE_URL"

wait_for_postgres() {
  echo "Waiting for PostgreSQL to start..."
  max_attempts=30
  attempt_num=1
  
  # First check if PostgreSQL itself is up
  until pg_isready -h ${POSTGRES_HOST} -p ${POSTGRES_PORT} -U ${POSTGRES_USER} > /dev/null 2>&1; do
    if [ $attempt_num -eq $max_attempts ]; then
      echo "Error: Exceeded maximum attempts waiting for PostgreSQL to start."
      exit 1
    fi
    echo "Attempt $attempt_num/$max_attempts: PostgreSQL is unavailable - sleeping"
    attempt_num=$(expr $attempt_num + 1)
    sleep 2
  done
  
  echo "PostgreSQL server is up! Now checking if database is ready by running a simple Prisma command..."
  
  # Test Prisma connection by running a simple command
  attempt_num=1
  until cd /usr/src/app/server && bunx prisma validate > /dev/null 2>&1; do
    if [ $attempt_num -eq $max_attempts ]; then
      echo "Error: Exceeded maximum attempts waiting for Prisma to connect to PostgreSQL."
      # Try to get more diagnostics
      echo "Attempting to run Prisma validate with details:"
      cd /usr/src/app/server && bunx prisma validate
      exit 1
    fi
    echo "Attempt $attempt_num/$max_attempts: Prisma cannot connect to database - sleeping"
    attempt_num=$(expr $attempt_num + 1)
    sleep 2
  done
  
  echo "PostgreSQL is up and running with Prisma connection confirmed!"
}

# Wait for PostgreSQL
wait_for_postgres

# Run database migrations
echo "Running database migrations..."
cd /usr/src/app/server && bunx prisma migrate deploy

# Start the application
echo "Starting application..."
cd /usr/src/app && bun run server/src/index.ts 