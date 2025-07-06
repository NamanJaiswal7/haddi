#!/bin/bash

# AWS Deployment Script for Haddi Application
# This script automates the deployment to AWS ECS

set -e

echo "🚀 Starting AWS deployment for Haddi application..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
PROJECT_NAME="haddi"
AWS_REGION="us-east-1"
ECR_REPOSITORY_NAME="${PROJECT_NAME}-app"
ECS_CLUSTER_NAME="${PROJECT_NAME}-cluster"
ECS_SERVICE_NAME="${PROJECT_NAME}-service"
TASK_DEFINITION_NAME="${PROJECT_NAME}-task"

# Check if AWS CLI is installed
check_aws_cli() {
    print_status "Checking AWS CLI installation..."
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        print_status "Installation guide: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        exit 1
    fi
    print_success "AWS CLI is installed"
}

# Check AWS credentials
check_aws_credentials() {
    print_status "Checking AWS credentials..."
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    print_success "AWS credentials are configured"
}

# Create ECR repository
create_ecr_repository() {
    print_status "Creating ECR repository..."
    if ! aws ecr describe-repositories --repository-names ${ECR_REPOSITORY_NAME} --region ${AWS_REGION} &> /dev/null; then
        aws ecr create-repository --repository-name ${ECR_REPOSITORY_NAME} --region ${AWS_REGION}
        print_success "ECR repository created"
    else
        print_status "ECR repository already exists"
    fi
}

# Get ECR login token
get_ecr_login() {
    print_status "Getting ECR login token..."
    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.${AWS_REGION}.amazonaws.com
    print_success "Logged in to ECR"
}

# Build and push Docker image
build_and_push_image() {
    print_status "Building Docker image..."
    docker build -t ${ECR_REPOSITORY_NAME}:latest .
    
    print_status "Tagging image for ECR..."
    ECR_URI=$(aws ecr describe-repositories --repository-names ${ECR_REPOSITORY_NAME} --region ${AWS_REGION} --query 'repositories[0].repositoryUri' --output text)
    docker tag ${ECR_REPOSITORY_NAME}:latest ${ECR_URI}:latest
    
    print_status "Pushing image to ECR..."
    docker push ${ECR_URI}:latest
    print_success "Image pushed to ECR"
}

# Create ECS cluster
create_ecs_cluster() {
    print_status "Creating ECS cluster..."
    if ! aws ecs describe-clusters --clusters ${ECS_CLUSTER_NAME} --region ${AWS_REGION} &> /dev/null; then
        aws ecs create-cluster --cluster-name ${ECS_CLUSTER_NAME} --region ${AWS_REGION}
        print_success "ECS cluster created"
    else
        print_status "ECS cluster already exists"
    fi
}

# Create task definition
create_task_definition() {
    print_status "Creating ECS task definition..."
    
    # Get ECR URI
    ECR_URI=$(aws ecr describe-repositories --repository-names ${ECR_REPOSITORY_NAME} --region ${AWS_REGION} --query 'repositories[0].repositoryUri' --output text)
    
    # Create task definition JSON
    cat > task-definition.json << EOF
{
    "family": "${TASK_DEFINITION_NAME}",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "512",
    "memory": "1024",
    "executionRoleArn": "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/ecsTaskExecutionRole",
    "containerDefinitions": [
        {
            "name": "${PROJECT_NAME}-app",
            "image": "${ECR_URI}:latest",
            "portMappings": [
                {
                    "containerPort": 4545,
                    "protocol": "tcp"
                }
            ],
            "environment": [
                {
                    "name": "NODE_ENV",
                    "value": "production"
                },
                {
                    "name": "PORT",
                    "value": "4545"
                }
            ],
            "secrets": [
                {
                    "name": "DATABASE_URL",
                    "valueFrom": "arn:aws:secretsmanager:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):secret:haddi/database-url"
                },
                {
                    "name": "JWT_SECRET",
                    "valueFrom": "arn:aws:secretsmanager:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):secret:haddi/jwt-secret"
                }
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/${PROJECT_NAME}",
                    "awslogs-region": "${AWS_REGION}",
                    "awslogs-stream-prefix": "ecs"
                }
            },
            "healthCheck": {
                "command": ["CMD-SHELL", "curl -f http://localhost:4545/health || exit 1"],
                "interval": 30,
                "timeout": 5,
                "retries": 3,
                "startPeriod": 40
            }
        }
    ]
}
EOF
    
    # Register task definition
    aws ecs register-task-definition --cli-input-json file://task-definition.json --region ${AWS_REGION}
    print_success "Task definition created"
}

# Create CloudWatch log group
create_log_group() {
    print_status "Creating CloudWatch log group..."
    if ! aws logs describe-log-groups --log-group-name-prefix "/ecs/${PROJECT_NAME}" --region ${AWS_REGION} | grep -q "/ecs/${PROJECT_NAME}"; then
        aws logs create-log-group --log-group-name "/ecs/${PROJECT_NAME}" --region ${AWS_REGION}
        print_success "CloudWatch log group created"
    else
        print_status "CloudWatch log group already exists"
    fi
}

# Create ECS service
create_ecs_service() {
    print_status "Creating ECS service..."
    
    # Get default VPC and subnets
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region ${AWS_REGION})
    SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" --query 'Subnets[*].SubnetId' --output text --region ${AWS_REGION} | tr '\t' ',' | sed 's/,$//')
    
    # Create security group if it doesn't exist
    SG_NAME="${PROJECT_NAME}-sg"
    SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=${SG_NAME}" --query 'SecurityGroups[0].GroupId' --output text --region ${AWS_REGION})
    
    if [ "$SG_ID" == "None" ]; then
        SG_ID=$(aws ec2 create-security-group --group-name ${SG_NAME} --description "Security group for ${PROJECT_NAME}" --vpc-id ${VPC_ID} --region ${AWS_REGION} --query 'GroupId' --output text)
        aws ec2 authorize-security-group-ingress --group-id ${SG_ID} --protocol tcp --port 4545 --cidr 0.0.0.0/0 --region ${AWS_REGION}
        print_success "Security group created"
    fi
    
    # Create service
    if ! aws ecs describe-services --cluster ${ECS_CLUSTER_NAME} --services ${ECS_SERVICE_NAME} --region ${AWS_REGION} &> /dev/null; then
        aws ecs create-service \
            --cluster ${ECS_CLUSTER_NAME} \
            --service-name ${ECS_SERVICE_NAME} \
            --task-definition ${TASK_DEFINITION_NAME} \
            --desired-count 1 \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS}],securityGroups=[${SG_ID}],assignPublicIp=ENABLED}" \
            --region ${AWS_REGION}
        print_success "ECS service created"
    else
        print_status "ECS service already exists"
    fi
}

# Main deployment function
deploy() {
    print_status "Starting deployment process..."
    
    check_aws_cli
    check_aws_credentials
    create_ecr_repository
    get_ecr_login
    build_and_push_image
    create_ecs_cluster
    create_log_group
    create_task_definition
    create_ecs_service
    
    print_success "Deployment completed successfully!"
    print_status "Your application should be available at: http://localhost:4545 (within the VPC)"
    print_warning "Note: You'll need to set up an Application Load Balancer or API Gateway for external access"
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  deploy      Deploy the application to AWS ECS"
    echo "  destroy     Remove all AWS resources (not implemented)"
    echo "  logs        View application logs"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 deploy   # Deploy to AWS ECS"
}

# Main script logic
main() {
    case "${1:-help}" in
        "deploy")
            deploy
            ;;
        "destroy")
            print_error "Destroy functionality not implemented yet"
            ;;
        "logs")
            print_status "Viewing logs..."
            aws logs tail "/ecs/${PROJECT_NAME}" --follow --region ${AWS_REGION}
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

# Run main function with all arguments
main "$@" 