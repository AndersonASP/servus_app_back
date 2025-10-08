import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Tenant } from 'src/modules/tenants/schemas/tenant.schema';

describe('Events (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let token: string;

  const tenantId = '64b6f8b1f1f1f1f1f1f1f1f1'; // dummy ObjectId-like
  const branchId = null; // test tenant-admin routes

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();

    token = jwtService.sign({
      sub: '507f1f77bcf86cd799439011',
      roles: ['tenant_admin'],
      ministryId: null,
    });

    // Ensure tenant exists for TenantMiddleware
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

  let eventId: string;

  it('should create a weekly recurring event', async () => {
    const dto = {
      name: 'Culto de Quarta',
      eventDate: new Date(Date.UTC(2025, 0, 1, 0, 0, 0)).toISOString(),
      eventTime: '19:30',
      recurrenceType: 'weekly',
      recurrencePattern: { interval: 1, daysOfWeek: [3] },
      eventType: 'global',
      isGlobal: true,
      status: 'published',
    };

    const res = await request(app.getHttpServer())
      .post(`/tenants/${tenantId}/events`)
      .set('x-tenant-id', tenantId)
      .set('Authorization', `Bearer ${token}`)
      .send(dto)
      .expect(201);

    expect(res.body).toHaveProperty('_id');
    eventId = res.body._id;
  });

  it('should return pre-calculated recurrences for current month', async () => {
    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    const res = await request(app.getHttpServer())
      .get(`/tenants/${tenantId}/events/recurrences`)
      .query({ month })
      .set('x-tenant-id', tenantId)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body.instances)).toBe(true);
  });

  it('should skip a single occurrence', async () => {
    // choose an instance date (e.g., next Wednesday)
    const base = new Date();
    const dow = 3; // Wednesday
    const diff = (dow - base.getUTCDay() + 7) % 7;
    const target = new Date(
      Date.UTC(
        base.getUTCFullYear(),
        base.getUTCMonth(),
        base.getUTCDate() + diff,
        19,
        30,
        0,
      ),
    );

    await request(app.getHttpServer())
      .delete(`/tenants/${tenantId}/events/${eventId}/instances`)
      .query({ date: target.toISOString() })
      .set('x-tenant-id', tenantId)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // assert recurrence no longer includes the skipped date
    const month = `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}`;
    const rec = await request(app.getHttpServer())
      .get(`/tenants/${tenantId}/events/recurrences`)
      .query({ month })
      .set('x-tenant-id', tenantId)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const exists = (rec.body.instances || []).some((i: any) => {
      const d = new Date(i.instanceDate).toISOString();
      return i.eventId?._id?.toString() === eventId ||
        i.eventId?.toString() === eventId
        ? d === target.toISOString()
        : false;
    });
    expect(exists).toBe(false);
  });

  it('should cancel series after a date (inclusive)', async () => {
    const from = new Date(Date.UTC(2025, 6, 1, 19, 30, 0));

    await request(app.getHttpServer())
      .patch(`/tenants/${tenantId}/events/${eventId}/cancel-after`)
      .query({ from: from.toISOString() })
      .set('x-tenant-id', tenantId)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const month = `${from.getUTCFullYear()}-${String(from.getUTCMonth() + 1).padStart(2, '0')}`;
    const rec = await request(app.getHttpServer())
      .get(`/tenants/${tenantId}/events/recurrences`)
      .query({ month })
      .set('x-tenant-id', tenantId)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const existsAfter = (rec.body.instances || []).some((i: any) => {
      const d = new Date(i.instanceDate);
      return (
        (i.eventId?._id?.toString() === eventId ||
          i.eventId?.toString() === eventId) &&
        d >= from
      );
    });
    expect(existsAfter).toBe(false);
  });

  it('should delete entire series', async () => {
    await request(app.getHttpServer())
      .delete(`/tenants/${tenantId}/events/${eventId}`)
      .set('x-tenant-id', tenantId)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
