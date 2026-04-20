/**
 * API Routes Integration Test Example
 * Demonstrates how to test API endpoints
 * 
 * Run with: npm run test
 * 
 * TODO: This is a template. Customize based on your actual routes.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock Express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Example teacher routes (when refactored from routes.ts)
  app.get('/teachers', (req, res) => {
    res.json([
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        employeeId: 'E001',
        employmentType: 'FULL_TIME',
        maxWeeklyLoadHours: 24,
      },
    ]);
  });

  app.post('/teachers', (req, res) => {
    const { firstName, lastName, employeeId, employmentType, maxWeeklyLoadHours } = req.body;

    if (!firstName || !lastName || !employeeId) {
      return res.status(400).json({
        error: 'Validation failed',
        details: 'Missing required fields',
      });
    }

    res.status(201).json({
      id: '3',
      firstName,
      lastName,
      employeeId,
      employmentType: employmentType || 'FULL_TIME',
      maxWeeklyLoadHours: maxWeeklyLoadHours || 24,
    });
  });

  return app;
};

describe('API Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /health', () => {
    it('should return health check', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /teachers', () => {
    it('should return list of teachers', async () => {
      const response = await request(app).get('/teachers');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('firstName');
    });
  });

  describe('POST /teachers', () => {
    it('should create a new teacher', async () => {
      const newTeacher = {
        firstName: 'Alice',
        lastName: 'Johnson',
        employeeId: 'E003',
        employmentType: 'FULL_TIME',
        maxWeeklyLoadHours: 24,
      };

      const response = await request(app).post('/teachers').send(newTeacher);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.firstName).toBe('Alice');
      expect(response.body.lastName).toBe('Johnson');
    });

    it('should return 400 if required fields are missing', async () => {
      const incompleteTeacher = {
        firstName: 'Bob',
        // Missing lastName and employeeId
      };

      const response = await request(app).post('/teachers').send(incompleteTeacher);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});
