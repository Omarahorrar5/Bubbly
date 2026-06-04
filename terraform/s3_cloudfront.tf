# --- S3 Bucket for Frontend Assets ---
resource "aws_s3_bucket" "frontend" {
  bucket        = "${var.app_name}-frontend-bucket-${random_id.bucket_suffix.hex}" # Ensure globally unique name
  force_destroy = true                                                              # Allows terraform destroy to empty bucket first
}

# Configure website hosting settings on the S3 bucket
resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html" # SPA fallback routing
  }
}

# Allow public access to the S3 bucket so it can serve static files directly
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# S3 Bucket Policy to allow public read access (GetObject) on website files
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  # Ensure public access block is updated before attaching policy
  depends_on = [aws_s3_bucket_public_access_block.frontend]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend.arn}/*"
      }
    ]
  })
}
