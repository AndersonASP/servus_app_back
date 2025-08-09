import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant } from '../schemas/tenant.schema';
import { CreateTenantDto } from '../DTO/create-tenant.dto';

@Injectable()
export class TenantService {
  constructor(@InjectModel(Tenant.name) private tenantModel: Model<Tenant>) {}

  async create(createTenantDto: CreateTenantDto, createdBy: string) {
    const exists = await this.tenantModel.findOne({
      $or: [{ name: createTenantDto.name }, { tenantId: createTenantDto.tenantId }]
    });

    if (exists) throw new ConflictException('Já existe um tenant com esse nome ou tenantId.');

    const baseId = (createTenantDto.tenantId || createTenantDto.name)
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 20);

    const tenantId = createTenantDto.tenantId || `${baseId}-${Date.now()}`;

    const tenant = new this.tenantModel({
      ...createTenantDto,
      tenantId,
      createdBy,
      isActive: true,
    });

    return tenant.save();
  }

  async findAll() {
    return this.tenantModel.find();
  }

  async findById(tenantId: string) {
    const tenant = await this.tenantModel.findOne({ tenantId });
    if (!tenant) throw new NotFoundException('Tenant não encontrado.');
    return tenant;
  }

  async deactivate(tenantId: string) {
    const updated = await this.tenantModel.findOneAndUpdate(
      { tenantId },
      { isActive: false },
      { new: true }
    );

    if (!updated) throw new NotFoundException('Tenant não encontrado para desativar.');
    return updated;
  }
}