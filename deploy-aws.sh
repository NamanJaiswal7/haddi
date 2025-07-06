#!/bin/bash

# AWS Deployment Script for Haddi Application
# Supports both manual deployment and Terraform deployment

set -e

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

# Manual deployment using the existing script
manual_deploy() {
    print_status "Starting manual deployment..."
    ./aws-deploy.sh deploy
}

# Terraform deployment
terraform_deploy() {
    print_status "Starting Terraform deployment..."
    
    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform is not installed. Please install it first."
        print_status "Installation guide: https://www.terraform.io/downloads.html"
        exit 1
    fi
    
    # Check if terraform.tfvars exists
    if [ ! -f "terraform/terraform.tfvars" ]; then
        print_warning "terraform.tfvars not found. Creating from example..."
        cp terraform/terraform.tfvars.example terraform/terraform.tfvars
        print_status "Please edit terraform/terraform.tfvars with your values before continuing."
        print_status "Required variables: db_password, jwt_secret"
        exit 1
    fi
    
    # Navigate to terraform directory
    cd terraform
    
    # Initialize Terraform
    print_status "Initializing Terraform..."
    terraform init
    
    # Plan deployment
    print_status "Planning Terraform deployment..."
    terraform plan
    
    # Ask for confirmation
    read -p "Do you want to proceed with the deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Deployment cancelled."
        exit 1
    fi
    
    # Apply Terraform
    print_status "Applying Terraform configuration..."
    terraform apply -auto-approve
    
    # Get outputs
    ECR_REPO_URL=$(terraform output -raw ecr_repository_url)
    ECS_CLUSTER_NAME=$(terraform output -raw ecs_cluster_name)
    
    # Go back to root directory
    cd ..
    
    # Build and push Docker image
    print_status "Building and pushing Docker image..."
    
    # Login to ECR
    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.${AWS_REGION}.amazonaws.com
    
    # Build image
    docker build -t ${PROJECT_NAME}-app .
    
    # Tag for ECR
    docker tag ${PROJECT_NAME}-app:latest ${ECR_REPO_URL}:latest
    
    # Push to ECR
    docker push ${ECR_REPO_URL}:latest
    
    # Update ECS service
    print_status "Updating ECS service..."
    aws ecs update-service \
        --cluster ${ECS_CLUSTER_NAME} \
        --service ${PROJECT_NAME}-service \
        --force-new-deployment \
        --region ${AWS_REGION}
    
    print_success "Terraform deployment completed!"
    print_status "ECR Repository: ${ECR_REPO_URL}"
    print_status "ECS Cluster: ${ECS_CLUSTER_NAME}"
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  manual     Deploy using manual AWS CLI commands"
    echo "  terraform  Deploy using Terraform (Infrastructure as Code)"
    echo "  help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 manual     # Manual deployment"
    echo "  $0 terraform  # Terraform deployment"
    echo ""
    echo "Prerequisites:"
    echo "  - AWS CLI installed and configured"
    echo "  - Docker installed"
    echo "  - For Terraform: Terraform installed"
}

# Main script logic
main() {
    case "${1:-help}" in
        "manual")
            check_aws_cli
            check_aws_credentials
            manual_deploy
            ;;
        "terraform")
            check_aws_cli
            check_aws_credentials
            terraform_deploy
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

# Run main function with all arguments
main "$@" 