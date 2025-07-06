terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC and Networking
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Security Groups
resource "aws_security_group" "app" {
  name_prefix = "haddi-app-"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 4545
    to_port     = 4545
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "haddi-app-sg"
  }
}

resource "aws_security_group" "rds" {
  name_prefix = "haddi-rds-"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  tags = {
    Name = "haddi-rds-sg"
  }
}

# RDS Subnet Group
resource "aws_db_subnet_group" "haddi" {
  name       = "haddi-db-subnet-group"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name = "haddi-db-subnet-group"
  }
}

# RDS Instance
resource "aws_db_instance" "haddi" {
  identifier = "haddi-db"
  
  engine         = "postgres"
  engine_version = "14"
  instance_class = "db.t3.micro"
  
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp2"
  storage_encrypted     = true
  
  db_name  = "haddi_db"
  username = "haddi_user"
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.haddi.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = true
  
  tags = {
    Name = "haddi-database"
  }
}

# Secrets Manager
resource "aws_secretsmanager_secret" "database_url" {
  name        = "haddi/database-url"
  description = "Database connection string for Haddi app"
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id = aws_secretsmanager_secret.database_url.id
  secret_string = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.haddi.endpoint}/${aws_db_instance.haddi.db_name}"
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "haddi/jwt-secret"
  description = "JWT secret for Haddi app"
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret
}

# ECR Repository
resource "aws_ecr_repository" "haddi" {
  name                 = "haddi-app"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "haddi" {
  name = "haddi-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "haddi" {
  name              = "/ecs/haddi"
  retention_in_days = 7
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution" {
  name = "ecsTaskExecutionRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_task_execution_secrets" {
  name = "SecretsManagerAccess"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.database_url.arn,
          aws_secretsmanager_secret.jwt_secret.arn
        ]
      }
    ]
  })
}

# ECS Task Definition
resource "aws_ecs_task_definition" "haddi" {
  family                   = "haddi-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name  = "haddi-app"
      image = "${aws_ecr_repository.haddi.repository_url}:latest"

      portMappings = [
        {
          containerPort = 4545
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "PORT"
          value = "4545"
        }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_secretsmanager_secret.database_url.arn
        },
        {
          name      = "JWT_SECRET"
          valueFrom = aws_secretsmanager_secret.jwt_secret.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.haddi.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:4545/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 40
      }
    }
  ])

  tags = {
    Name = "haddi-task-definition"
  }
}

# ECS Service
resource "aws_ecs_service" "haddi" {
  name            = "haddi-service"
  cluster         = aws_ecs_cluster.haddi.id
  task_definition = aws_ecs_task_definition.haddi.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.default.ids
    security_groups  = [aws_security_group.app.id]
    assign_public_ip = true
  }

  depends_on = [aws_ecs_task_definition.haddi]

  tags = {
    Name = "haddi-service"
  }
}

# Application Load Balancer (Optional)
resource "aws_lb" "haddi" {
  count              = var.create_alb ? 1 : 0
  name               = "haddi-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.app.id]
  subnets            = data.aws_subnets.default.ids

  enable_deletion_protection = false

  tags = {
    Name = "haddi-alb"
  }
}

resource "aws_lb_target_group" "haddi" {
  count       = var.create_alb ? 1 : 0
  name        = "haddi-tg"
  port        = 4545
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }
}

resource "aws_lb_listener" "haddi" {
  count             = var.create_alb ? 1 : 0
  load_balancer_arn = aws_lb.haddi[0].arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.haddi[0].arn
  }
}

# Outputs
output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.haddi.repository_url
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.haddi.name
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.haddi.endpoint
}

output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = var.create_alb ? aws_lb.haddi[0].dns_name : "No ALB created"
} 