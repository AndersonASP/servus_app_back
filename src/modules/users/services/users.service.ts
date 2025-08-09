import {
  ConflictException,
  Injectable,
  NotFoundException,
  HttpException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../DTO/create-user.dto';
import { UpdateUserDto } from '../DTO/update-user.dto';
import { User } from '../schema/user.schema';
import { Role } from 'src/common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(createUserDto: CreateUserDto, tenantId?: string) {
    try {
      // ✅ Se não for superadmin, obrigar tenantId
      if (createUserDto.role !== Role.SuperAdmin && !tenantId) {
        throw new BadRequestException(
          'Tenant ID é obrigatório para este usuário.',
        );
      }

      // ✅ Evitar duplicação de e-mail por tenant ou globalmente
      const normalizedEmail = createUserDto.email.toLowerCase().trim();
      const query: any = { email: normalizedEmail };
      if (createUserDto.role !== Role.SuperAdmin) {
        query.tenantId = tenantId;
      }

      const existingUser = await this.userModel.findOne(query).exec();
      if (existingUser) {
        throw new ConflictException(
          'Já existe um usuário com este e-mail neste contexto.',
        );
      }

      // ✅ Hash de senha, se existir
      const hashedPassword = createUserDto.password
        ? await bcrypt.hash(createUserDto.password, 10)
        : null;

      // ✅ Criação do usuário
      const createdUser = new this.userModel({
        ...createUserDto,
        picture: createUserDto.picture || '', // deve trazer a url da imagem na AWS
        password: hashedPassword,
        tenantId: createUserDto.role === Role.SuperAdmin ? null : tenantId,
        branchId: createUserDto.branchId || null, // 👈 adicione isso!
      });

      return await createdUser.save();
    } catch (error) {
      console.error('Erro ao criar usuário:', error.message);
      if (
        error instanceof ConflictException ||
        error.name === 'MongoServerError'
      ) {
        throw new ConflictException(error.message);
      }
      throw new InternalServerErrorException('Erro interno ao criar usuário');
    }
  }

  async findAll(tenantId: string) {
    return this.userModel.find({ tenantId }).exec();
  }

  async findOne(id: string, tenantId: string) {
    const user = await this.userModel.findOne({ _id: id, tenantId }).exec();
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, tenantId: string) {
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.userModel
      .findOneAndUpdate({ _id: id, tenantId }, updateUserDto, { new: true })
      .exec();

    if (!updatedUser) throw new NotFoundException('Usuário não encontrado');
    return updatedUser;
  }

  async remove(id: string, tenantId: string) {
    const deletedUser = await this.userModel
      .findOneAndDelete({ _id: id, tenantId })
      .exec();
    if (!deletedUser) throw new NotFoundException('Usuário não encontrado');
    return deletedUser;
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email }).exec();
  }

  async findWithFilters(
    filters: any,
    options?: { page?: number; limit?: number },
  ) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.userModel
        .find(filters)
        .select('-password')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      this.userModel.countDocuments(filters),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async addRefreshToken(
    userId: string | Types.ObjectId,
    token: string,
    deviceId: string,
    isNewSession = false,
    absoluteExpiry?: Date,
  ) {
    const now = new Date();

    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 dia

    // Se é nova sessão ou absoluteExpiry não existe, cria um novo
    const finalAbsoluteExpiry =
      isNewSession || !absoluteExpiry
        ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        : absoluteExpiry;

    // Remove tokens duplicados ou expirados
    await this.userModel.findByIdAndUpdate(userId, {
      $pull: {
        refreshTokens: {
          $or: [{ deviceId }, { expiresAt: { $lt: new Date() } }],
        },
      },
    });
    
    // Salva o novo token com absoluteExpiry preservado
    const update = {
      token,
      deviceId,
      expiresAt,
      absoluteExpiry: finalAbsoluteExpiry,
    };

    return this.userModel.findByIdAndUpdate(
      userId,
      { $push: { refreshTokens: update } },
      { new: true },
    );
  }

  async findByRefreshToken(token: string) {
    return this.userModel
      .findOne({
        'refreshTokens.token': token,
        'refreshTokens.expiresAt': { $gt: new Date() },
      })
      .exec();
  }

  async removeRefreshToken(userId: string, token: string) {
    return this.userModel.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: { token } },
    });
  }
}
