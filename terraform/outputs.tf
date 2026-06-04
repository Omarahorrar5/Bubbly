output "instance_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.main.public_ip
}

output "instance_public_dns" {
  description = "Public DNS of the EC2 instance"
  value       = aws_instance.main.public_dns
}

output "frontend_url" {
  description = "URL to access the frontend application"
  value       = "http://${aws_instance.main.public_ip}"
}

output "backend_url" {
  description = "URL to access the backend API"
  value       = "http://${aws_instance.main.public_ip}:3000"
}

output "ssh_command" {
  description = "Command to SSH into the EC2 instance"
  value       = "ssh -i ${replace(var.ssh_public_key_path, ".pub", "")} ubuntu@${aws_instance.main.public_ip}"
}

output "rds_endpoint" {
  description = "Connection endpoint of the RDS instance"
  value       = aws_db_instance.main.endpoint
}
