# AWS Deployment Guide for Haddi Backend

This guide provides step-by-step instructions for deploying the Haddi educational platform backend on AWS using modern cloud services.

## 🏗️ AWS Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CloudFront    │    │   Application   │    │   RDS           │
│   (CDN/SSL)     │◄──►│   Load Balancer │◄──►│   PostgreSQL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│   ECS Fargate   │◄─────────────┘
                        │   (Containers)  │
                        └─────────────────┘
                                │
                        ┌─────────────────┐
                        │   ElastiCache   │
                        │   (Redis)       │
                        └─────────────────┘
```

## 📋 Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Docker installed locally
- Domain name (optional but recommended)
- SSL certificate (can use AWS Certificate Manager)

## 🚀 Deployment Options

### Option 1: ECS Fargate (Recommended)
- Serverless container management
- Auto-scaling capabilities
- Pay-per-use pricing

### Option 2: EC2 with Docker
- Full control over infrastructure
- Cost-effective for consistent workloads
- More configuration options

### Option 3: AWS App Runner
- Fully managed service
- Automatic scaling
- Zero infrastructure management

---

## 🎯 Option 1: ECS Fargate Deployment

### Step 1: Prepare AWS Infrastructure

#### 1.1 Create VPC and Networking

```bash
# Create VPC
aws ec2 create-vpc \
    --cidr-block 10.0.0.0/16 \
    --tag-specifications ResourceType=vpc,Tags=[{Key=Name,Value=haddi-vpc}]

# Create subnets
aws ec2 create-subnet \
    --vpc-id vpc-xxxxxxxxx \
    --cidr-block 10.0.1.0/24 \
    --availability-zone ap-south-1a \
    --tag-specifications ResourceType=subnet,Tags=[{Key=Name,Value=haddi-public-subnet-1}]

aws ec2 create-subnet \
    --vpc-id vpc-xxxxxxxxx \
    --cidr-block 10.0.2.0/24 \
    --availability-zone ap-south-1b \
    --tag-specifications ResourceType=subnet,Tags=[{Key=Name,Value=haddi-public-subnet-2}]

# Create private subnets for RDS
aws ec2 create-subnet \
    --vpc-id vpc-xxxxxxxxx \
    --cidr-block 10.0.3.0/24 \
    --availability-zone ap-south-1a \
    --tag-specifications ResourceType=subnet,Tags=[{Key=Name,Value=haddi-private-subnet-1}]

aws ec2 create-subnet \
    --vpc-id vpc-xxxxxxxxx \
    --cidr-block 10.0.4.0/24 \
    --availability-zone ap-south-1b \
    --tag-specifications ResourceType=subnet,Tags=[{Key=Name,Value=haddi-private-subnet-2}]
```

#### 1.2 Create Internet Gateway and Route Tables

```bash
# Create Internet Gateway
aws ec2 create-internet-gateway \
    --tag-specifications ResourceType=internet-gateway,Tags=[{Key=Name,Value=haddi-igw}]

# Attach to VPC
aws ec2 attach-internet-gateway \
    --vpc-id vpc-xxxxxxxxx \
    --internet-gateway-id igw-xxxxxxxxx

# Create route table for public subnets
aws ec2 create-route-table \
    --vpc-id vpc-xxxxxxxxx \
    --tag-specifications ResourceType=route-table,Tags=[{Key=Name,Value=haddi-public-rt}]

# Add route to internet gateway
aws ec2 create-route \
    --route-table-id rtb-xxxxxxxxx \
    --destination-cidr-block 0.0.0.0/0 \
    --gateway-id igw-xxxxxxxxx

# Associate public subnets with route table
aws ec2 associate-route-table \
    --subnet-id subnet-xxxxxxxxx \
    --route-table-id rtb-xxxxxxxxx
```

### Step 2: Create RDS Database

#### 2.1 Create DB Subnet Group

```bash
aws rds create-db-subnet-group \
    --db-subnet-group-name haddi-db-subnet-group \
    --db-subnet-group-description "Haddi database subnet group" \
    --subnet-ids subnet-private-1 subnet-private-2
```

#### 2.2 Create Security Group for RDS

```bash
aws ec2 create-security-group \
    --group-name haddi-db-sg \
    --description "Security group for Haddi RDS" \
    --vpc-id vpc-xxxxxxxxx

# Allow PostgreSQL access from ECS
aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxxxxxxx \
    --protocol tcp \
    --port 5432 \
    --source-group sg-ecs-security-group-id
```

#### 2.3 Create RDS Instance

```bash
aws rds create-db-instance \
    --db-instance-identifier haddi-prod-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 15.4 \
    --master-username haddi_admin \
    --master-user-password "YourSecurePassword123!" \
    --allocated-storage 20 \
    --storage-type gp2 \
    --db-subnet-group-name haddi-db-subnet-group \
    --vpc-security-group-ids sg-xxxxxxxxx \
    --backup-retention-period 7 \
    --multi-az \
    --auto-minor-version-upgrade \
    --deletion-protection
```

### Step 3: Create ElastiCache Redis

#### 3.1 Create Redis Subnet Group

```bash
aws elasticache create-cache-subnet-group \
    --cache-subnet-group-name haddi-redis-subnet-group \
    --cache-subnet-group-description "Haddi Redis subnet group" \
    --subnet-ids subnet-private-1 subnet-private-2
```

#### 3.2 Create Redis Cluster

```bash
aws elasticache create-cache-cluster \
    --cache-cluster-id haddi-redis \
    --engine redis \
    --cache-node-type cache.t3.micro \
    --num-cache-nodes 1 \
    --cache-subnet-group-name haddi-redis-subnet-group \
    --security-group-ids sg-redis-security-group-id \
    --port 6379
```

### Step 4: Create S3 Bucket

```bash
# Create S3 bucket for file uploads
aws s3 mb s3://haddi-production-files

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket haddi-production-files \
    --versioning-configuration Status=Enabled

# Create bucket policy for secure access
aws s3api put-bucket-policy \
    --bucket haddi-production-files \
    --policy '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "AllowECSAccess",
                "Effect": "Allow",
                "Principal": {
                    "AWS": "arn:aws:iam::YOUR-ACCOUNT-ID:role/ecsTaskExecutionRole"
                },
                "Action": [
                    "s3:GetObject",
                    "s3:PutObject",
                    "s3:DeleteObject"
                ],
                "Resource": "arn:aws:s3:::haddi-production-files/*"
            }
        ]
    }'
```

### Step 5: Create ECR Repository

```bash
# Create ECR repository
aws ecr create-repository \
    --repository-name haddi-backend \
    --image-scanning-configuration scanOnPush=true

# Get login token
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin YOUR-ACCOUNT-ID.dkr.ecr.ap-south-1.amazonaws.com
```

### Step 6: Build and Push Docker Image

```bash
# Build production image
docker build -f Dockerfile.prod -t haddi-backend .

# Tag for ECR
docker tag haddi-backend:latest YOUR-ACCOUNT-ID.dkr.ecr.ap-south-1.amazonaws.com/haddi-backend:latest

# Push to ECR
docker push YOUR-ACCOUNT-ID.dkr.ecr.ap-south-1.amazonaws.com/haddi-backend:latest
```

### Step 7: Create ECS Cluster

```bash
# Create ECS cluster
aws ecs create-cluster \
    --cluster-name haddi-cluster \
    --capacity-providers FARGATE \
    --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1
```

### Step 8: Create Task Definition

Create `task-definition.json`:

```json
{
    "family": "haddi-backend",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "256",
    "memory": "512",
    "executionRoleArn": "arn:aws:iam::YOUR-ACCOUNT-ID:role/ecsTaskExecutionRole",
    "taskRoleArn": "arn:aws:iam::YOUR-ACCOUNT-ID:role/ecsTaskRole",
    "containerDefinitions": [
        {
            "name": "haddi-backend",
            "image": "YOUR-ACCOUNT-ID.dkr.ecr.ap-south-1.amazonaws.com/haddi-backend:latest",
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
                },
                {
                    "name": "DATABASE_URL",
                    "value": "postgresql://haddi_admin:YourSecurePassword123!@haddi-prod-db.xxxxxxxxx.ap-south-1.rds.amazonaws.com:5432/haddi_prod"
                },
                {
                    "name": "JWT_SECRET",
                    "value": "your-super-secure-jwt-secret-key-for-production"
                },
                {
                    "name": "AWS_REGION",
                    "value": "ap-south-1"
                },
                {
                    "name": "AWS_S3_BUCKET",
                    "value": "haddi-production-files"
                }
            ],
            "secrets": [
                {
                    "name": "AWS_ACCESS_KEY_ID",
                    "valueFrom": "arn:aws:secretsmanager:ap-south-1:YOUR-ACCOUNT-ID:secret:haddi/aws-credentials:ACCESS_KEY_ID::"
                },
                {
                    "name": "AWS_SECRET_ACCESS_KEY",
                    "valueFrom": "arn:aws:secretsmanager:ap-south-1:YOUR-ACCOUNT-ID:secret:haddi/aws-credentials:SECRET_ACCESS_KEY::"
                },
                {
                    "name": "SMTP_USER",
                    "valueFrom": "arn:aws:secretsmanager:ap-south-1:YOUR-ACCOUNT-ID:secret:haddi/smtp-credentials:USERNAME::"
                },
                {
                    "name": "SMTP_PASS",
                    "valueFrom": "arn:aws:secretsmanager:ap-south-1:YOUR-ACCOUNT-ID:secret:haddi/smtp-credentials:PASSWORD::"
                }
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/haddi-backend",
                    "awslogs-region": "ap-south-1",
                    "awslogs-stream-prefix": "ecs"
                }
            },
            "healthCheck": {
                "command": ["CMD-SHELL", "curl -f http://localhost:4545/health || exit 1"],
                "interval": 30,
                "timeout": 5,
                "retries": 3,
                "startPeriod": 60
            }
        }
    ]
}
```

Register the task definition:

```bash
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

### Step 9: Create Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
    --name haddi-alb \
    --subnets subnet-public-1 subnet-public-2 \
    --security-groups sg-alb-security-group-id

# Create target group
aws elbv2 create-target-group \
    --name haddi-tg \
    --protocol HTTP \
    --port 4545 \
    --vpc-id vpc-xxxxxxxxx \
    --target-type ip \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3

# Create listener
aws elbv2 create-listener \
    --load-balancer-arn arn:aws:elasticloadbalancing:ap-south-1:YOUR-ACCOUNT-ID:loadbalancer/app/haddi-alb/xxxxxxxxx \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:ap-south-1:YOUR-ACCOUNT-ID:targetgroup/haddi-tg/xxxxxxxxx
```

### Step 10: Create ECS Service

```bash
aws ecs create-service \
    --cluster haddi-cluster \
    --service-name haddi-backend-service \
    --task-definition haddi-backend:1 \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-public-1,subnet-public-2],securityGroups=[sg-ecs-security-group-id],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:ap-south-1:YOUR-ACCOUNT-ID:targetgroup/haddi-tg/xxxxxxxxx,containerName=haddi-backend,containerPort=4545"
```

### Step 11: Set up CloudWatch Logs

```bash
# Create log group
aws logs create-log-group --log-group-name /ecs/haddi-backend

# Set retention policy
aws logs put-retention-policy \
    --log-group-name /ecs/haddi-backend \
    --retention-in-days 30
```

### Step 12: Configure Auto Scaling

```bash
# Create auto scaling target
aws application-autoscaling register-scalable-target \
    --service-namespace ecs \
    --scalable-dimension ecs:service:DesiredCount \
    --resource-id service/haddi-cluster/haddi-backend-service \
    --min-capacity 2 \
    --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
    --service-namespace ecs \
    --scalable-dimension ecs:service:DesiredCount \
    --resource-id service/haddi-cluster/haddi-backend-service \
    --policy-name haddi-cpu-scaling \
    --policy-type TargetTrackingScaling \
    --target-tracking-scaling-policy-configuration '{
        "TargetValue": 70.0,
        "PredefinedMetricSpecification": {
            "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
        }
    }'
```

---

## 🎯 Option 2: EC2 with Docker Deployment

### Step 1: Create EC2 Instance

```bash
# Create security group
aws ec2 create-security-group \
    --group-name haddi-ec2-sg \
    --description "Security group for Haddi EC2 instance" \
    --vpc-id vpc-xxxxxxxxx

# Allow SSH access
aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxxxxxxx \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0

# Allow HTTP/HTTPS access
aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxxxxxxx \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxxxxxxx \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0

# Launch EC2 instance
aws ec2 run-instances \
    --image-id ami-xxxxxxxxx \
    --count 1 \
    --instance-type t3.medium \
    --key-name your-key-pair \
    --security-group-ids sg-xxxxxxxxx \
    --subnet-id subnet-xxxxxxxxx \
    --tag-specifications ResourceType=instance,Tags=[{Key=Name,Value=haddi-backend-server}]
```

### Step 2: Install Docker on EC2

SSH into your EC2 instance and run:

```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install -y docker

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Step 3: Deploy Application

```bash
# Clone repository
git clone <your-repo-url>
cd haddi

# Create production environment file
cp .env.example .env.production
# Edit .env.production with your values

# Deploy using Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🎯 Option 3: AWS App Runner Deployment

### Step 1: Prepare Application

Ensure your application has:
- `Dockerfile` in root directory
- Health check endpoint at `/health`
- Proper environment variable handling

### Step 2: Create App Runner Service

```bash
# Create App Runner service
aws apprunner create-service \
    --service-name haddi-backend \
    --source-configuration '{
        "AuthenticationConfiguration": {
            "AccessRoleArn": "arn:aws:iam::YOUR-ACCOUNT-ID:role/service-role/AppRunnerECRAccessRole"
        },
        "ImageRepository": {
            "ImageIdentifier": "YOUR-ACCOUNT-ID.dkr.ecr.ap-south-1.amazonaws.com/haddi-backend:latest",
            "ImageRepositoryType": "ECR",
            "ImageConfiguration": {
                "Port": "4545",
                "RuntimeEnvironmentVariables": {
                    "NODE_ENV": "production",
                    "PORT": "4545"
                }
            }
        }
    }' \
    --instance-configuration '{
        "Cpu": "256",
        "Memory": "512"
    }'
```

---

## 🔧 Post-Deployment Configuration

### 1. Set up Domain and SSL

```bash
# Request SSL certificate
aws acm request-certificate \
    --domain-name your-domain.com \
    --validation-method DNS \
    --subject-alternative-names "*.your-domain.com"

# Add DNS records for validation
# Follow the validation instructions provided by AWS
```

### 2. Configure CloudFront (Optional)

```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
    --distribution-config '{
        "CallerReference": "haddi-backend-'$(date +%s)'",
        "Origins": {
            "Quantity": 1,
            "Items": [
                {
                    "Id": "haddi-alb",
                    "DomainName": "haddi-alb-xxxxxxxxx.ap-south-1.elb.amazonaws.com",
                    "CustomOriginConfig": {
                        "HTTPPort": 80,
                        "HTTPSPort": 443,
                        "OriginProtocolPolicy": "http-only"
                    }
                }
            ]
        },
        "DefaultCacheBehavior": {
            "TargetOriginId": "haddi-alb",
            "ViewerProtocolPolicy": "redirect-to-https",
            "TrustedSigners": {
                "Enabled": false,
                "Quantity": 0
            },
            "ForwardedValues": {
                "QueryString": true,
                "Cookies": {
                    "Forward": "all"
                }
            },
            "MinTTL": 0
        },
        "Enabled": true,
        "PriceClass": "PriceClass_100"
    }'
```

### 3. Set up Monitoring

```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
    --dashboard-name "Haddi-Backend-Monitoring" \
    --dashboard-body '{
        "widgets": [
            {
                "type": "metric",
                "properties": {
                    "metrics": [
                        ["AWS/ECS", "CPUUtilization", "ServiceName", "haddi-backend-service", "ClusterName", "haddi-cluster"]
                    ],
                    "period": 300,
                    "stat": "Average",
                    "region": "ap-south-1",
                    "title": "ECS CPU Utilization"
                }
            }
        ]
    }'
```

### 4. Set up Alarms

```bash
# Create CPU alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "Haddi-High-CPU" \
    --alarm-description "High CPU utilization for Haddi backend" \
    --metric-name CPUUtilization \
    --namespace AWS/ECS \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions arn:aws:sns:ap-south-1:YOUR-ACCOUNT-ID:topic/haddi-alerts
```

---

## 🔍 Monitoring and Maintenance

### 1. View Logs

```bash
# View ECS logs
aws logs tail /ecs/haddi-backend --follow

# View ALB logs
aws logs describe-log-groups --log-group-name-prefix /aws/applicationloadbalancer
```

### 2. Scale Application

```bash
# Scale ECS service
aws ecs update-service \
    --cluster haddi-cluster \
    --service haddi-backend-service \
    --desired-count 4
```

### 3. Update Application

```bash
# Build and push new image
docker build -f Dockerfile.prod -t haddi-backend .
docker tag haddi-backend:latest YOUR-ACCOUNT-ID.dkr.ecr.ap-south-1.amazonaws.com/haddi-backend:latest
docker push YOUR-ACCOUNT-ID.dkr.ecr.ap-south-1.amazonaws.com/haddi-backend:latest

# Update ECS service
aws ecs update-service \
    --cluster haddi-cluster \
    --service haddi-backend-service \
    --force-new-deployment
```

---

## 💰 Cost Optimization

### 1. Use Spot Instances (EC2)
```bash
# Launch spot instance
aws ec2 request-spot-instances \
    --spot-price "0.05" \
    --instance-count 1 \
    --type one-time \
    --launch-specification '{
        "ImageId": "ami-xxxxxxxxx",
        "InstanceType": "t3.medium",
        "KeyName": "your-key-pair",
        "SecurityGroupIds": ["sg-xxxxxxxxx"],
        "SubnetId": "subnet-xxxxxxxxx"
    }'
```

### 2. Use Reserved Instances (RDS)
```bash
# Purchase reserved instance
aws rds purchase-reserved-db-instances-offering \
    --reserved-db-instances-offering-id "1-ABCD1234-5678-90AB-CDEF-1234567890AB" \
    --db-instance-count 1
```

### 3. Enable S3 Lifecycle Policies
```bash
# Create lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
    --bucket haddi-production-files \
    --lifecycle-configuration '{
        "Rules": [
            {
                "ID": "MoveToIA",
                "Status": "Enabled",
                "Transitions": [
                    {
                        "Days": 30,
                        "StorageClass": "STANDARD_IA"
                    }
                ]
            }
        ]
    }'
```

---

## 🚨 Troubleshooting

### Common Issues and Solutions

1. **ECS Service Won't Start**
   ```bash
   # Check service events
   aws ecs describe-services \
       --cluster haddi-cluster \
       --services haddi-backend-service
   
   # Check task logs
   aws logs tail /ecs/haddi-backend --follow
   ```

2. **Database Connection Issues**
   ```bash
   # Test RDS connectivity
   aws rds describe-db-instances \
       --db-instance-identifier haddi-prod-db
   
   # Check security groups
   aws ec2 describe-security-groups \
       --group-ids sg-xxxxxxxxx
   ```

3. **ALB Health Check Failures**
   ```bash
   # Check target health
   aws elbv2 describe-target-health \
       --target-group-arn arn:aws:elasticloadbalancing:ap-south-1:YOUR-ACCOUNT-ID:targetgroup/haddi-tg/xxxxxxxxx
   ```

---

## 📞 Support and Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **ECS Best Practices**: https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/
- **RDS Best Practices**: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html
- **AWS Support**: https://aws.amazon.com/support/

---

**Note**: Replace `YOUR-ACCOUNT-ID`, `vpc-xxxxxxxxx`, `subnet-xxxxxxxxx`, `sg-xxxxxxxxx`, and other placeholder values with your actual AWS resource identifiers. 