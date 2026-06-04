terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# --- Variables ---

variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS region to deploy resources"
}

variable "app_name" {
  type        = string
  default     = "bubbly"
  description = "Application name for tagging and naming"
}

variable "environment" {
  type        = string
  default     = "production"
  description = "Deployment environment"
}

# --- Random Password for RDS ---
resource "random_password" "db_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# --- Alphanumeric S3 Bucket Suffix ---
resource "random_id" "bucket_suffix" {
  byte_length = 4
}
