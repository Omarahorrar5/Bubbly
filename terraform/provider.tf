terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Commented out by default. If you want to store your terraform state in S3,
  # create the bucket and DynamoDB table first, then uncomment this block.
  # backend "s3" {
  #   bucket         = "bubbly-terraform-state"
  #   key            = "bubbly/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "bubbly-terraform-locks"
  # }
}

provider "aws" {
  region                   = var.aws_region
  shared_credentials_files = ["~/.aws/credentials"]
}
