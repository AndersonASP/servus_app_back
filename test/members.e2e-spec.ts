import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Tenant } from 'src/modules/tenants/schemas/tenant.schema';

describe('Members (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  const tenantId = '64b6f8b1f1f1f1f1f1f1f1f1';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();

    const tenantModel = app.get(getModelToken(Tenant.name));
    await tenantModel.create({
      _id: tenantId,
      name: 'Tenant E2E',
      code: `tenant-e2e-${Date.now()}`,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/members (POST)', () => {
    it('should create a member successfully', () => {
      const createMemberDto = {
        name: 'João Silva',
        email: 'joao@example.com',
        phone: '11999999999',
        memberships: [
          {
            role: 'volunteer',
            ministryId: 'ministry123',
            isActive: true,
          },
        ],
      };

      // Mock JWT token
      const mockToken = jwtService.sign({
        userId: 'user123',
        memberships: [{ tenant: 'tenant123', role: 'tenant_admin' }],
      });

      return request(app.getHttpServer())
        .post(`/tenants/${tenantId}/members`)
        .set('x-tenant-id', tenantId)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(createMemberDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('João Silva');
          expect(res.body.email).toBe('joao@example.com');
        });
    });

    it('should return 400 when required fields are missing', () => {
      const invalidDto = {
        name: '',
        memberships: [],
      };

      const mockToken = jwtService.sign({
        userId: 'user123',
        memberships: [{ tenant: 'tenant123', role: 'tenant_admin' }],
      });

      return request(app.getHttpServer())
        .post(`/tenants/${tenantId}/members`)
        .set('x-tenant-id', tenantId)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidDto)
        .expect(400);
    });

    it('should return 401 when no token provided', () => {
      const createMemberDto = {
        name: 'João Silva',
        email: 'joao@example.com',
        memberships: [
          {
            role: 'volunteer',
            ministryId: 'ministry123',
            isActive: true,
          },
        ],
      };

      return request(app.getHttpServer())
        .post(`/tenants/${tenantId}/members`)
        .set('x-tenant-id', tenantId)
        .send(createMemberDto)
        .expect(401);
    });
  });

  describe('/members (GET)', () => {
    it('should return members list', () => {
      const mockToken = jwtService.sign({
        userId: 'user123',
        memberships: [{ tenant: 'tenant123', role: 'tenant_admin' }],
      });

      return request(app.getHttpServer())
        .get(`/tenants/${tenantId}/members`)
        .set('x-tenant-id', tenantId)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('members');
          expect(res.body).toHaveProperty('total');
          expect(Array.isArray(res.body.members)).toBe(true);
        });
    });
  });
});
