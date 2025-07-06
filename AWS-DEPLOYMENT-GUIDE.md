# 🚀 AWS Deployment Guide for Haddi Application

This guide will walk you through deploying your Haddi application on AWS using ECS Fargate, RDS, and other AWS services.

## 📋 Prerequisites

### 1. **AWS Account Setup**
- [ ] Create an AWS account
- [ ] Set up billing alerts
- [ ] Create an IAM user with appropriate permissions

### 2. **Local Environment Setup**
- [ ] Install AWS CLI: `brew install awscli` (macOS) or follow [AWS CLI installation guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- [ ] Configure AWS credentials: `aws configure`
- [ ] Install Docker Desktop
- [ ] Install jq: `brew install jq` (macOS)

### 3. **Required AWS Permissions**
Your IAM user needs these permissions:
- ECS (Elastic Container Service)
- ECR (Elastic Container Registry)
- RDS (Relational Database Service)
- Secrets Manager
- CloudWatch Logs
- EC2 (for VPC and security groups)
- IAM (for task execution role)

## 🏗️ Step-by-Step Deployment

### **Step 1: Set Up AWS RDS Database**

1. **Create RDS PostgreSQL Instance:**
   ```bash
   # Create RDS subnet group
   aws rds create-db-subnet-group \
     --db-subnet-group-name haddi-db-subnet-group \
     --db-subnet-group-description "Subnet group for Haddi database" \
     --subnet-ids subnet-xxxxx,subnet-yyyyy
   
   # Create RDS instance
   aws rds create-db-instance \
     --db-instance-identifier haddi-db \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --master-username haddi_user \
     --master-user-password "YourSecurePassword123!" \
     --allocated-storage 20 \
     --db-name haddi_db \
     --vpc-security-group-ids sg-xxxxx \
     --db-subnet-group-name haddi-db-subnet-group \
     --backup-retention-period 7 \
     --storage-encrypted
   ```

2. **Wait for RDS to be available** (check AWS Console)

### **Step 2: Set Up AWS Secrets Manager**

1. **Store Database URL:**
   ```bash
   aws secretsmanager create-secret \
     --name "haddi/database-url" \
     --description "Database connection string for Haddi app" \
     --secret-string "postgresql://haddi_user:YourSecurePassword123!@haddi-db.xxxxx.us-east-1.rds.amazonaws.com:5432/haddi_db"
   ```

2. **Store JWT Secret:**
   ```bash
   aws secretsmanager create-secret \
     --name "haddi/jwt-secret" \
     --description "JWT secret for Haddi app" \
     --secret-string "your-super-secure-jwt-secret-here"
   ```

### **Step 3: Create IAM Role for ECS**

1. **Create ECS Task Execution Role:**
   ```bash
   # Create the role
   aws iam create-role \
     --role-name ecsTaskExecutionRole \
     --assume-role-policy-document '{
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Principal": {
             "Service": "ecs-tasks.amazonaws.com"
           },
           "Action": "sts:AssumeRole"
         }
       ]
     }'
   
   # Attach the required policy
   aws iam attach-role-policy \
     --role-name ecsTaskExecutionRole \
     --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
   
   # Add permissions for Secrets Manager
   aws iam put-role-policy \
     --role-name ecsTaskExecutionRole \
     --policy-name SecretsManagerAccess \
     --policy-document '{
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": [
             "secretsmanager:GetSecretValue"
           ],
           "Resource": [
             "arn:aws:secretsmanager:us-east-1:*:secret:haddi/*"
           ]
         }
       ]
     }'
   ```

### **Step 4: Deploy Using the Script**

1. **Run the deployment script:**
   ```bash
   ./aws-deploy.sh deploy
   ```

   This will:
   - Create ECR repository
   - Build and push Docker image
   - Create ECS cluster
   - Create task definition
   - Create ECS service

### **Step 5: Set Up Application Load Balancer (Optional)**

For external access, create an ALB:

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name haddi-alb \
  --subnets subnet-xxxxx subnet-yyyyy \
  --security-groups sg-xxxxx

# Create target group
aws elbv2 create-target-group \
  --name haddi-tg \
  --protocol HTTP \
  --port 4545 \
  --vpc-id vpc-xxxxx \
  --target-type ip \
  --health-check-path /health

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:xxxxx:loadbalancer/app/haddi-alb/xxxxx \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:xxxxx:targetgroup/haddi-tg/xxxxx
```

## 🔧 Manual Deployment Steps (Alternative)

If you prefer manual deployment:

### **1. Create ECR Repository**
```bash
aws ecr create-repository --repository-name haddi-app --region us-east-1
```

### **2. Build and Push Docker Image**
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t haddi-app .

# Tag for ECR
docker tag haddi-app:latest $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com/haddi-app:latest

# Push to ECR
docker push $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com/haddi-app:latest
```

### **3. Create ECS Cluster**
```bash
aws ecs create-cluster --cluster-name haddi-cluster --region us-east-1
```

### **4. Create Task Definition**
```bash
# Create task-definition.json file (see the script for content)
aws ecs register-task-definition --cli-input-json file://task-definition.json --region us-east-1
```

### **5. Create ECS Service**
```bash
aws ecs create-service \
  --cluster haddi-cluster \
  --service-name haddi-service \
  --task-definition haddi-task \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx,subnet-yyyyy],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}" \
  --region us-east-1
```

## 🌐 Domain and SSL Setup

### **1. Register Domain (if needed)**
- Use Route 53 or external registrar
- Point to your ALB

### **2. Set Up SSL Certificate**
```bash
# Request certificate
aws acm request-certificate \
  --domain-name yourdomain.com \
  --validation-method DNS \
  --region us-east-1

# Add HTTPS listener to ALB
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:xxxxx:loadbalancer/app/haddi-alb/xxxxx \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:us-east-1:xxxxx:certificate/xxxxx \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:xxxxx:targetgroup/haddi-tg/xxxxx
```

## 📊 Monitoring and Logging

### **1. CloudWatch Logs**
```bash
# View application logs
aws logs tail "/ecs/haddi" --follow --region us-east-1
```

### **2. Set Up CloudWatch Alarms**
```bash
# CPU utilization alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "haddi-cpu-high" \
  --alarm-description "High CPU utilization" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

## 🔄 CI/CD Pipeline (Optional)

### **GitHub Actions Workflow**
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v1
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    
    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1
    
    - name: Build, tag, and push image to Amazon ECR
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        ECR_REPOSITORY: haddi-app
        IMAGE_TAG: latest
      run: |
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
        docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
    
    - name: Update ECS service
      run: |
        aws ecs update-service --cluster haddi-cluster --service haddi-service --force-new-deployment
```

## 💰 Cost Optimization

### **1. Use Spot Instances (for non-critical workloads)**
```bash
aws ecs create-service \
  --cluster haddi-cluster \
  --service-name haddi-service \
  --task-definition haddi-task \
  --desired-count 1 \
  --launch-type FARGATE \
  --capacity-provider-strategy capacityProvider=FARGATE_SPOT,weight=1
```

### **2. Set up Auto Scaling**
```bash
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/haddi-cluster/haddi-service \
  --min-capacity 1 \
  --max-capacity 5
```

## 🛡️ Security Best Practices

### **1. Network Security**
- Use private subnets for RDS
- Restrict security group rules
- Use VPC endpoints for AWS services

### **2. Secrets Management**
- Never hardcode secrets
- Use AWS Secrets Manager
- Rotate secrets regularly

### **3. IAM Best Practices**
- Use least privilege principle
- Enable CloudTrail logging
- Use IAM roles instead of access keys

## 🔍 Troubleshooting

### **Common Issues:**

1. **ECS Task Failing:**
   ```bash
   # Check task logs
   aws logs describe-log-streams --log-group-name "/ecs/haddi" --region us-east-1
   aws logs get-log-events --log-group-name "/ecs/haddi" --log-stream-name "stream-name"
   ```

2. **Database Connection Issues:**
   - Check RDS security group
   - Verify database URL in Secrets Manager
   - Check VPC connectivity

3. **Image Pull Issues:**
   - Verify ECR repository exists
   - Check IAM permissions
   - Ensure image is pushed to ECR

## 📞 Support

For issues:
1. Check AWS CloudWatch logs
2. Review ECS service events
3. Check RDS performance insights
4. Monitor CloudWatch metrics

## 🎯 Next Steps

After deployment:
1. Set up monitoring and alerting
2. Configure backup strategies
3. Set up CI/CD pipeline
4. Implement auto-scaling
5. Set up domain and SSL
6. Configure CDN (CloudFront) if needed

---

**Estimated Monthly Cost (us-east-1):**
- ECS Fargate: ~$15-30/month
- RDS PostgreSQL: ~$15-25/month
- ALB: ~$20/month
- CloudWatch: ~$5-10/month
- **Total: ~$55-85/month**

*Costs vary based on usage and region.* 