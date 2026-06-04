output "frontend_url" {
  value       = "http://${aws_s3_bucket_website_configuration.frontend.website_endpoint}"
  description = "The static website hosting URL for the frontend React app"
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.frontend.id
  description = "The name of the S3 bucket where frontend assets should be synced"
}

output "backend_ecr_url" {
  value       = aws_ecr_repository.backend.repository_url
  description = "The ECR repository URL for the backend Docker image"
}

output "backend_alb_dns" {
  value       = "http://${aws_lb.alb.dns_name}"
  description = "The DNS name of the Application Load Balancer routing to the backend"
}

output "rds_endpoint" {
  value       = aws_db_instance.postgres.endpoint
  description = "The connection endpoint for the RDS PostgreSQL database"
}

output "rds_database_name" {
  value       = aws_db_instance.postgres.db_name
  description = "The database name"
}

output "rds_username" {
  value       = aws_db_instance.postgres.username
  description = "The database master username"
}

output "rds_password" {
  value       = random_password.db_password.result
  sensitive   = true
  description = "The database master password (run 'terraform output -raw rds_password' to view)"
}
