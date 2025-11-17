#!/bin/bash

# PolyFlow AI Engine - Production Startup Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_DIR}/.env"
DOCKER_COMPOSE_FILE="${PROJECT_DIR}/docker-compose.yml"
LOG_FILE="${PROJECT_DIR}/logs/startup.log"

# Create logs directory if it doesn't exist
mkdir -p "${PROJECT_DIR}/logs"

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} ${message}"
            echo "[${timestamp}] [INFO] ${message}" >> "$LOG_FILE"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} ${message}"
            echo "[${timestamp}] [WARN] ${message}" >> "$LOG_FILE"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} ${message}"
            echo "[${timestamp}] [ERROR] ${message}" >> "$LOG_FILE"
            ;;
        "DEBUG")
            if [[ "${DEBUG:-false}" == "true" ]]; then
                echo -e "${BLUE}[DEBUG]${NC} ${message}"
                echo "[${timestamp}] [DEBUG] ${message}" >> "$LOG_FILE"
            fi
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log "ERROR" "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log "ERROR" "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    # Check if Docker is running
    if ! docker info &> /dev/null; then
        log "ERROR" "Docker is not running. Please start Docker first."
        exit 1
    fi

    log "INFO" "Prerequisites check passed ✓"
}

# Environment validation
validate_environment() {
    log "INFO" "Validating environment configuration..."

    if [[ ! -f "$ENV_FILE" ]]; then
        log "WARN" "Environment file not found. Creating from example..."
        cp "${PROJECT_DIR}/.env.example" "$ENV_FILE"
        log "WARN" "Please update ${ENV_FILE} with your configuration values"
        return 1
    fi

    # Source environment file
    source "$ENV_FILE"

    # Check required environment variables
    local required_vars=(
        "PRIMARY_AI_PROVIDER"
        "PORT"
        "NODE_ENV"
    )

    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done

    # Check AI provider specific variables
    if [[ "$PRIMARY_AI_PROVIDER" == "openai" ]] && [[ -z "$OPENAI_API_KEY" ]]; then
        missing_vars+=("OPENAI_API_KEY")
    fi

    if [[ "$PRIMARY_AI_PROVIDER" == "anthropic" ]] && [[ -z "$ANTHROPIC_API_KEY" ]]; then
        missing_vars+=("ANTHROPIC_API_KEY")
    fi

    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log "ERROR" "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            log "ERROR" "  - $var"
        done
        return 1
    fi

    log "INFO" "Environment validation passed ✓"
    return 0
}

# Build services
build_services() {
    log "INFO" "Building AI Engine services..."

    cd "$PROJECT_DIR"

    # Build with specific target based on environment
    if [[ "$NODE_ENV" == "production" ]]; then
        log "INFO" "Building production image..."
        docker-compose build --no-cache ai-engine
    else
        log "INFO" "Building development image..."
        docker-compose build ai-engine
    fi

    log "INFO" "Services built successfully ✓"
}

# Start services
start_services() {
    log "INFO" "Starting AI Engine services..."

    cd "$PROJECT_DIR"

    # Determine which services to start based on profiles
    local profiles=()

    if [[ "${ENABLE_PROXY:-false}" == "true" ]]; then
        profiles+=("--profile" "proxy")
    fi

    if [[ "${ENABLE_MONITORING:-false}" == "true" ]]; then
        profiles+=("--profile" "monitoring")
    fi

    # Start core services
    docker-compose up -d postgres redis

    # Wait for dependencies to be ready
    log "INFO" "Waiting for database to be ready..."
    docker-compose exec -T postgres pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-aiengine}" || {
        log "WARN" "Waiting for PostgreSQL..."
        sleep 10
        docker-compose exec -T postgres pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-aiengine}"
    }

    log "INFO" "Waiting for Redis to be ready..."
    docker-compose exec -T redis redis-cli ping | grep -q PONG || {
        log "WARN" "Waiting for Redis..."
        sleep 5
        docker-compose exec -T redis redis-cli ping | grep -q PONG
    }

    # Start main application
    docker-compose up -d "${profiles[@]}" ai-engine

    log "INFO" "Services started successfully ✓"
}

# Health check
health_check() {
    log "INFO" "Performing health check..."

    local max_attempts=30
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        if curl -f http://localhost:${PORT:-3001}/health &> /dev/null; then
            log "INFO" "Health check passed ✓"
            return 0
        fi

        log "DEBUG" "Health check attempt $attempt/$max_attempts failed"
        sleep 2
        ((attempt++))
    done

    log "ERROR" "Health check failed after $max_attempts attempts"
    return 1
}

# Show status
show_status() {
    log "INFO" "Service Status:"
    docker-compose ps

    echo ""
    log "INFO" "Service URLs:"
    echo "  - AI Engine: http://localhost:${PORT:-3001}"
    echo "  - Health Check: http://localhost:${PORT:-3001}/health"
    echo "  - API Documentation: http://localhost:${PORT:-3001}/api/docs"

    if [[ "${ENABLE_MONITORING:-false}" == "true" ]]; then
        echo "  - Prometheus: http://localhost:${PROMETHEUS_PORT:-9090}"
        echo "  - Grafana: http://localhost:${GRAFANA_PORT:-3000}"
    fi

    if [[ "${ENABLE_PROXY:-false}" == "true" ]]; then
        echo "  - Nginx Proxy: http://localhost:${NGINX_PORT:-80}"
    fi
}

# Cleanup function
cleanup() {
    log "INFO" "Stopping services..."
    cd "$PROJECT_DIR"
    docker-compose down
    log "INFO" "Services stopped"
}

# Main execution
main() {
    local command="${1:-start}"

    case $command in
        "start")
            log "INFO" "Starting PolyFlow AI Engine..."
            check_prerequisites
            if validate_environment; then
                build_services
                start_services
                if health_check; then
                    show_status
                    log "INFO" "PolyFlow AI Engine started successfully! 🚀"
                else
                    log "ERROR" "Service failed to start properly"
                    cleanup
                    exit 1
                fi
            else
                log "ERROR" "Environment validation failed. Please fix configuration and try again."
                exit 1
            fi
            ;;
        "stop")
            cleanup
            ;;
        "restart")
            cleanup
            sleep 2
            main "start"
            ;;
        "status")
            show_status
            ;;
        "logs")
            docker-compose logs -f ai-engine
            ;;
        "build")
            check_prerequisites
            build_services
            ;;
        *)
            echo "Usage: $0 {start|stop|restart|status|logs|build}"
            echo ""
            echo "Commands:"
            echo "  start    - Start all services"
            echo "  stop     - Stop all services"
            echo "  restart  - Restart all services"
            echo "  status   - Show service status"
            echo "  logs     - Show and follow AI Engine logs"
            echo "  build    - Build services without starting"
            exit 1
            ;;
    esac
}

# Handle script interruption
trap cleanup SIGINT SIGTERM

# Run main function
main "$@"