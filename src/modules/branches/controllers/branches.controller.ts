import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Delete,
  Req,
} from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { BranchService } from '../services/branches.service';
import { CreateBranchDto } from '../DTO/create-branches.dto';

@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post()
  @Roles(Role.SuperAdmin, Role.Admin)
  async create(@Body() createBranchDto: CreateBranchDto, @Req() req: any) {
    const tenantId = req.user.tenantId;
    const email = req.user.email;

    return this.branchService.create(createBranchDto, email, tenantId);
  }

  @Get()
  @Roles(Role.SuperAdmin, Role.Admin)
  async list(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.branchService.findAll(tenantId);
  }

  @Get('detail/:branchId')
  @Roles(Role.SuperAdmin, Role.Admin, Role.Leader)
  async getBranch(@Param('branchId') branchId: string) {
    return this.branchService.findById(branchId);
  }

  @Delete(':branchId')
  @Roles(Role.SuperAdmin, Role.Admin)
  async deactivate(@Param('branchId') branchId: string) {
    return this.branchService.deactivate(branchId);
  }
}
