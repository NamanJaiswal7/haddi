# 🏗️ Terraform Infrastructure for Haddi Application

This directory contains Terraform configurations to deploy the Haddi application infrastructure on AWS.

## 📋 Prerequisites

1. **Terraform** (version >= 1.0)
   ```bash
   # macOS
   brew install terraform
   
   # Or download from https://www.terraform.io/downloads.html
   ```

2. **AWS CLI** configured with appropriate permissions
   ```bash
   aws configure
   ```

3. **Docker** for building and pushing images

## 🚀 Quick Start

### 1. **Configure Variables**

Copy the example variables file and update it:
```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:
```hcl
aws_region = "us-east-1"
db_password = "YourSecurePassword123!"
jwt_secret = "your-super-secure-jwt-secret-here"
create_alb = true  # Set to true if you want external access
```

### 2. **Initialize Terraform**

```bash
terraform init
```

### 3. **Plan the Deployment**

```bash
terraform plan
```

### 4. **Deploy Infrastructure**

```bash
terraform apply
```

### 5. **Build and Push Docker Image**

After infrastructure is created, build and push your Docker image:

```bash
# Get ECR login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t haddi-app .

# Tag for ECR
docker tag haddi-app:latest $(terraform output -raw ecr_repository_url):latest

# Push to ECR
docker push $(terraform output -raw ecr_repository_url):latest
```

### 6. **Update ECS Service**

```bash
aws ecs update-service \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --service haddi-service \
  --force-new-deployment
```

## 🏗️ Infrastructure Components

This Terraform configuration creates:

### **Networking**
- Uses default VPC and subnets
- Security groups for application and database

### **Database**
- RDS PostgreSQL instance (t3.micro)
- Encrypted storage
- Automated backups
- Subnet group

### **Secrets Management**
- AWS Secrets Manager for database URL
- AWS Secrets Manager for JWT secret

### **Container Registry**
- ECR repository for Docker images
- Image scanning enabled

### **Container Orchestration**
- ECS Fargate cluster
- Task definition with proper IAM roles
- ECS service with health checks

### **Load Balancing** (Optional)
- Application Load Balancer
- Target group with health checks
- HTTP listener

### **Monitoring**
- CloudWatch log group
- Container insights enabled

## 🔧 Configuration Options

### **Environment Variables**

You can customize the deployment by modifying `terraform.tfvars`:

```hcl
# Different regions
aws_region = "eu-west-1"

# Different database instance types
# (Modify main.tf for this)
instance_class = "db.t3.small"

# Enable load balancer
create_alb = true

# Different environments
environment = "production"
```

### **Scaling Configuration**

To modify scaling settings, edit the ECS service in `main.tf`:

```hcl
resource "aws_ecs_service" "haddi" {
  # ... existing configuration ...
  desired_count = 2  # Increase for high availability
  
  # Add auto-scaling
  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight           = 1
  }
}
```

## 📊 Monitoring and Logs

### **View Application Logs**
```bash
aws logs tail "/ecs/haddi" --follow --region us-east-1
```

### **Check ECS Service Status**
```bash
aws ecs describe-services \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --services haddi-service
```

### **Monitor RDS Performance**
```bash
aws rds describe-db-instances --db-instance-identifier haddi-db
```

## 🔄 Updates and Maintenance

### **Update Application**
```bash
# Build and push new image
docker build -t haddi-app .
docker tag haddi-app:latest $(terraform output -raw ecr_repository_url):latest
docker push $(terraform output -raw ecr_repository_url):latest

# Force new deployment
aws ecs update-service \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --service haddi-service \
  --force-new-deployment
```

### **Update Infrastructure**
```bash
terraform plan
terraform apply
```

### **Scale Application**
```bash
aws ecs update-service \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --service haddi-service \
  --desired-count 3
```

## 🗑️ Cleanup

To destroy all resources:
```bash
terraform destroy
```

**⚠️ Warning:** This will delete all resources including the database and its data.

## 🔒 Security Considerations

### **Network Security**
- RDS is in private subnets
- Security groups restrict access
- Application load balancer for external access

### **Secrets Management**
- Database credentials in Secrets Manager
- JWT secrets in Secrets Manager
- No hardcoded secrets in code

### **IAM Best Practices**
- Least privilege principle
- ECS task execution role with minimal permissions
- No long-term access keys in containers

## 💰 Cost Optimization

### **Current Configuration**
- RDS t3.micro: ~$15/month
- ECS Fargate: ~$15-30/month
- ALB (if enabled): ~$20/month
- **Total: ~$50-65/month**

### **Cost Reduction Options**
1. **Use Spot Instances:**
   ```hcl
   capacity_provider_strategy {
     capacity_provider = "FARGATE_SPOT"
     weight           = 1
   }
   ```

2. **Reduce RDS Instance Size:**
   ```hcl
   instance_class = "db.t3.micro"  # Already minimal
   ```

3. **Disable ALB** (if not needed):
   ```hcl
   create_alb = false
   ```

## 🚨 Troubleshooting

### **Common Issues**

1. **ECS Task Failing:**
   ```bash
   # Check task logs
   aws logs describe-log-streams --log-group-name "/ecs/haddi"
   aws logs get-log-events --log-group-name "/ecs/haddi" --log-stream-name "stream-name"
   ```

2. **Database Connection Issues:**
   ```bash
   # Check RDS status
   aws rds describe-db-instances --db-instance-identifier haddi-db
   
   # Check security groups
   aws ec2 describe-security-groups --group-ids sg-xxxxx
   ```

3. **Image Pull Issues:**
   ```bash
   # Verify ECR repository
   aws ecr describe-repositories --repository-names haddi-app
   
   # Check IAM permissions
   aws iam get-role --role-name ecsTaskExecutionRole
   ```

### **Useful Commands**

```bash
# Get all outputs
terraform output

# Check ECS service events
aws ecs describe-services \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --services haddi-service \
  --query 'services[0].events'

# Check RDS connectivity
aws rds describe-db-instances \
  --db-instance-identifier haddi-db \
  --query 'DBInstances[0].DBInstanceStatus'
```

## 📞 Support

For issues:
1. Check Terraform plan output
2. Review AWS CloudWatch logs
3. Check ECS service events
4. Verify IAM permissions
5. Check security group rules

---

**Next Steps:**
1. Set up CI/CD pipeline
2. Configure monitoring and alerting
3. Set up backup strategies
4. Implement auto-scaling
5. Configure custom domain and SSL 