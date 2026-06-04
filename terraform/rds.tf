# --- RDS Subnet Group ---
resource "aws_db_subnet_group" "rds" {
  name       = "${var.app_name}-db-subnet-group"
  subnet_ids = [aws_subnet.database_1.id, aws_subnet.database_2.id]

  tags = {
    Name = "${var.app_name}-db-subnet-group"
  }
}

# --- RDS Security Group ---
resource "aws_security_group" "rds" {
  name        = "${var.app_name}-rds-sg"
  description = "Allow inbound PostgreSQL traffic from ECS tasks"
  vpc_id      = aws_vpc.main.id

  # Allow inbound traffic on port 5432 only from private subnets (where ECS tasks run)
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_subnet.private_1.cidr_block, aws_subnet.private_2.cidr_block]
  }



  # Allow all outbound traffic (for system operations)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.app_name}-rds-sg"
  }
}

# --- RDS PostgreSQL Instance ---
resource "aws_db_instance" "postgres" {
  identifier             = "${var.app_name}-db"
  allocated_storage      = 20
  max_allocated_storage  = 100
  storage_type           = "gp3"
  engine                 = "postgres"
  engine_version         = "15"
  instance_class         = "db.t4g.micro" # Cost-effective instance type
  db_name                = "bubbly"
  username               = "postgres"
  password               = random_password.db_password.result
  db_subnet_group_name   = aws_db_subnet_group.rds.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  skip_final_snapshot    = true
  multi_az               = false
  publicly_accessible    = false

  tags = {
    Name        = "${var.app_name}-db-instance"
    Environment = var.environment
  }
}
