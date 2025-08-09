import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Req,
  BadRequestException,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { UsersService } from './services/users.service';
import { CreateUserDto } from './DTO/create-user.dto';
import { UpdateUserDto } from './DTO/update-user.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { Public } from 'src/common/decorators/public.decorator';
import { resolveTenantAndBranchScope } from 'src/common/utils/helpers/user-scope.util';
import { buildUserFiltersFromScope } from 'src/common/utils/helpers/build-user-filters-scope.util';
import { UserFilterDto } from './DTO/user-filter.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post()
  @Roles(Role.SuperAdmin, Role.Admin, Role.Leader)
  async create(@Body() dto: CreateUserDto, @Req() req: any) {
    const { role: requesterRole } = req.user;

    // 🔒 Líder só pode criar voluntários
    if (requesterRole === Role.Leader && dto.role !== Role.Volunteer) {
      throw new ForbiddenException('Líder só pode criar voluntários');
    }

    // 🔐 Resolve tenant e branch com base segura
    const { tenantId, branchId } = resolveTenantAndBranchScope(req.user, {
      dtoTenantId: dto.tenantId,
      dtoBranchId: dto.branchId,
    });
    console.log(branchId);

    const safeDto: CreateUserDto = {
      ...dto,
      tenantId,
      branchId,
    };
    return this.usersService.create(safeDto, tenantId);
  }

  @Get()
  @Roles(Role.SuperAdmin, Role.Admin)
  async findAll(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.usersService.findAll(tenantId);
  }


  @Get('filter')
  @Roles(Role.SuperAdmin, Role.Admin, Role.Leader)
  async filterUsers(@Query() query: UserFilterDto, @Req() req: any) {
    const filters = buildUserFiltersFromScope(req.user, query);
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);

    return this.usersService.findWithFilters(filters, { page, limit });
  }

  @Get(':id')
  @Roles(Role.SuperAdmin, Role.Admin, Role.Leader)
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.usersService.findOne(id, tenantId);
  }

  @Put(':id')
  @Roles(Role.SuperAdmin, Role.Admin, Role.Leader)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: any,
  ) {
    const tenantId = req.user.tenantId;
    return this.usersService.update(id, updateUserDto, tenantId);
  }

  @Delete(':id')
  @Roles(Role.SuperAdmin, Role.Admin)
  async remove(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.usersService.remove(id, tenantId);
  }
}
