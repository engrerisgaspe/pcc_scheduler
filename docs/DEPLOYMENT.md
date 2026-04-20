# Deployment Guide

## Overview

This guide covers deploying the School Scheduler application to production environments.

## Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Build succeeds without errors
- [ ] Environment variables configured
- [ ] Database backups created
- [ ] SSL certificates obtained
- [ ] Domain configured
- [ ] Monitoring setup

## Backend Deployment

### Environment Setup

Create `.env.production` in `apps/api/`:

```env
DATABASE_URL=postgresql://user:password@prod-db.example.com:5432/school_scheduler_prod
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://scheduler.example.com
LOG_LEVEL=info
```

### Database Migration

Run migrations on production:

```bash
npx prisma migrate deploy
```

For significant schema changes:
```bash
# Create backup first
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Run migration
npx prisma migrate deploy
```

### Building & Starting

```bash
# Build
npm run build

# Start server
npm start
```

### Docker Deployment

Create `Dockerfile` in `apps/api/`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production

COPY dist ./dist

EXPOSE 4000

CMD ["node", "dist/index.js"]
```

Build and push:

```bash
docker build -t school-scheduler-api:1.0.0 .
docker push your-registry/school-scheduler-api:1.0.0
```

## Frontend Deployment

### Build Configuration

Update `apps/web/.env.production`:

```env
VITE_API_BASE_URL=https://api.scheduler.example.com
```

### Build & Deploy

```bash
npm run build
```

Deploy `dist/` folder to:

- **Static hosting** (Netlify, Vercel, AWS S3)
- **Traditional server** (nginx, Apache)
- **Docker** (containerize like backend)

### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name scheduler.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Root directory
    root /var/www/school-scheduler;
    index index.html;

    # Frontend routes - fallback to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Docker Compose

For full stack deployment:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: school_scheduler_prod
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  api:
    build: ./apps/api
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/school_scheduler_prod
      NODE_ENV: production
      PORT: 4000
    depends_on:
      - postgres
    restart: always

  web:
    build: ./apps/web
    environment:
      VITE_API_BASE_URL: http://api:4000
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - api
      - web
    restart: always

volumes:
  postgres_data:
```

Deploy:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Cloud Deployment

### AWS Deployment

**EC2 + RDS Setup**:

1. Create RDS PostgreSQL instance
2. Launch EC2 instance (Ubuntu 22.04)
3. Configure security groups
4. SSH into instance and deploy:

```bash
cd /opt/school-scheduler
git pull origin main
npm ci --only=production
npm run build
pm2 start dist/index.js --name "scheduler-api"
```

Use PM2 for process management:

```bash
npm install -g pm2
pm2 start apps/api/dist/index.js --name "scheduler-api"
pm2 start apps/web/dist/index.html --name "scheduler-web"
pm2 save
pm2 startup
```

### Vercel (Frontend)

1. Connect repository to Vercel
2. Set `VITE_API_BASE_URL` in environment
3. Deploy automatically on push

### Heroku (Backend)

```bash
# Create app
heroku create school-scheduler-api

# Add PostgreSQL
heroku addons:create heroku-postgresql:standard-0

# Deploy
git push heroku main

# Run migrations
heroku run npx prisma migrate deploy
```

## Monitoring & Logging

### Application Monitoring

Setup with New Relic or DataDog:

```typescript
// In apps/api/src/index.ts
import newrelic from 'newrelic';

// Monitor API calls
app.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});
```

### Log Aggregation

Use Winston or Bunyan:

```typescript
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

Send logs to CloudWatch, Splunk, or similar service.

### Database Monitoring

Monitor with tools like:
- PostgreSQL pg_stat_statements
- Datadog
- New Relic

## Security

### SSL/TLS

Use Let's Encrypt for free certificates:

```bash
# Certbot setup for Nginx
certbot certonly --nginx -d scheduler.example.com
```

Auto-renewal:
```bash
systemctl enable certbot-renew.timer
```

### Environment Secrets

Never commit `.env` files. Use:
- AWS Secrets Manager
- HashiCorp Vault
- Environment variables in CI/CD

### Database Security

- Enable PostgreSQL SSL
- Use strong passwords
- Restrict network access
- Enable backup encryption
- Use Row Level Security (RLS)

### API Security

- Implement authentication (JWT)
- Rate limiting
- CORS configuration
- Input validation
- SQL injection prevention (via Prisma)

## Performance Optimization

### Caching

Implement Redis for:
```typescript
const redis = new Redis();

// Cache API responses
app.get('/teachers', async (req, res) => {
  const cached = await redis.get('teachers');
  if (cached) return res.json(JSON.parse(cached));
  
  const data = await teachersOps.getAll();
  redis.set('teachers', JSON.stringify(data), 'EX', 3600);
  res.json(data);
});
```

### Database Optimization

- Add indexes on frequently queried columns
- Use database views for complex queries
- Archive old data periodically
- Monitor slow queries with `log_min_duration_statement`

### Frontend Optimization

- Enable gzip compression
- Minimize JavaScript/CSS
- Optimize images
- Use lazy loading
- Implement service workers for offline support

## Backup & Recovery

### Database Backups

```bash
# Daily backup
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz

# Weekly backup to S3
0 3 * * 0 aws s3 cp /backups/db-$(date +\%Y\%m\%d).sql.gz s3://backup-bucket/
```

### Recovery

```bash
# Restore from backup
gunzip < db-20260419.sql.gz | psql $DATABASE_URL
```

## Rollback Procedure

### If deployment fails:

1. **Identify issue** - Check logs
2. **Rollback code** - `git revert <commit>`
3. **Rollback database** - Restore from backup
4. **Redeploy** - Deploy previous version
5. **Monitor** - Watch metrics and logs

## Post-Deployment

- [ ] Verify all endpoints working
- [ ] Test login/authentication
- [ ] Check database connectivity
- [ ] Monitor error logs
- [ ] Run smoke tests
- [ ] Notify stakeholders
- [ ] Document deployment details

## Troubleshooting

### Connection Issues

```bash
# Check if ports are open
netstat -tulpn | grep LISTEN

# Test API connectivity
curl -v https://scheduler.example.com/api/health
```

### Database Issues

```bash
# Check connections
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;

# Kill idle connections
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle';
```

### Memory/Performance Issues

```bash
# Monitor system resources
htop

# Check Node memory usage
node --max-old-space-size=2048 dist/index.js
```

## Further Reading

- [AWS Deployment Best Practices](https://docs.aws.amazon.com/guides/)
- [Docker Security](https://docs.docker.com/engine/security/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-syntax.html)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
