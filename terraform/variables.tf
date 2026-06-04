variable "aws_region" {
  description = "AWS region to deploy resources into"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for tagging and naming resources"
  type        = string
  default     = "bubbly"
}

variable "instance_type" {
  description = "EC2 instance type (t3.small or larger recommended due to ML service requirements)"
  type        = string
  default     = "t3.small"
}

variable "ssh_public_key_path" {
  description = "Path to the SSH public key"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "allowed_ssh_cidr" {
  description = "CIDR block allowed to SSH into the EC2 instance"
  type        = string
  default     = "0.0.0.0/0"
}

variable "dockerhub_username" {
  description = "Docker Hub username where the bubbly-backend, bubbly-frontend, and bubbly-ml images are hosted"
  type        = string
}

variable "db_name" {
  description = "Name of the PostgreSQL database"
  type        = string
  default     = "bubbly"
}

variable "db_username" {
  description = "PostgreSQL administrator username"
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "PostgreSQL database password"
  type        = string
  sensitive   = true
}

variable "session_secret" {
  description = "Express session secret key"
  type        = string
  sensitive   = true
  default     = "bubbly-session-secret-key-change-me"
}
