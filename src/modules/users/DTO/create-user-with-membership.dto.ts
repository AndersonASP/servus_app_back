import { Type } from 'class-transformer';
import { IsObject, ValidateNested } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { MembershipRole } from 'src/common/enums/role.enum';

export class CreateUserMembershipDataDto {
  role: MembershipRole;
  branchId?: string;
  ministryId?: string;
}

export class CreateUserWithMembershipDto {
  @IsObject()
  @ValidateNested()
  @Type(() => CreateUserDto)
  userData: CreateUserDto;

  @IsObject()
  @ValidateNested()
  @Type(() => CreateUserMembershipDataDto)
  membershipData: CreateUserMembershipDataDto;
} 