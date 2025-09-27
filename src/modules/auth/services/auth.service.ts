import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Membership } from 'src/modules/membership/schemas/membership.schema';
import { Tenant } from 'src/modules/tenants/schemas/tenant.schema';
import { MembershipRole, Role, findHighestPriorityMembership, findLeaderPrimaryMembership } from 'src/common/enums/role.enum';
import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { UsersService } from 'src/modules/users/services/users.service';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { LoginUserDto } from '../dto/login-user.dto';
import { LoginResponseDto, UserContextDto } from '../dto/login-response.dto';
import { getCombinedPermissions } from 'src/common/utils/permissions.util';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,

    @InjectModel(Membership.name) private readonly memModel: Model<Membership>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID?.trim());
  }

  // 🔐 Login por e-mail/senha (tenantSlug opcional para montar contexto)
  async login(loginDto: LoginUserDto, deviceId: string, tenantSlug?: string) {
    console.log('🔐 [AUTH] Iniciando processo de login...');
    console.log('📧 [AUTH] Email recebido:', loginDto.email);
    console.log('🔑 [AUTH] Senha recebida:', loginDto.password ? '***' : 'VAZIA');
    console.log('🏢 [AUTH] TenantSlug:', tenantSlug || 'NENHUM');
    console.log('📱 [AUTH] DeviceId:', deviceId);

    // Normalizar email para busca
    const normalizedEmail = loginDto.email.toLowerCase().trim();
    console.log('📧 [AUTH] Email normalizado:', normalizedEmail);

    const user = await this.usersService.findByEmail(normalizedEmail);
    console.log('👤 [AUTH] Usuário encontrado:', !!user);
    
    if (user) {
      console.log('👤 [AUTH] Dados do usuário:');
      console.log('   - ID:', user._id);
      console.log('   - Nome:', user.name);
      console.log('   - Email:', user.email);
      console.log('   - Role:', user.role);
      console.log('   - Tem senha:', !!user.password);
      console.log('   - TenantId:', user.tenantId);
      console.log('   - Ativo:', user.isActive);
    }

    const invalid = new UnauthorizedException('Usuário ou senha inválidos');

    if (!user) {
      console.log('❌ [AUTH] Usuário não encontrado - lançando erro');
      throw invalid;
    }
    
    if (!user.password) {
      console.log('❌ [AUTH] Usuário sem senha - conta Google');
      throw new UnauthorizedException(
        'Esta conta não possui senha. Entre com Google ou defina uma senha.',
      );
    }

    // Verificar se o usuário está ativo
    if (!user.isActive) {
      console.log('❌ [AUTH] Usuário inativo - bloqueando login');
      throw new UnauthorizedException(
        'Sua conta está aguardando aprovação do líder do ministério. Entre em contato com o líder ou aguarde a aprovação.',
      );
    }

    console.log('🔐 [AUTH] Comparando senhas...');
    const ok = await bcrypt.compare(loginDto.password ?? '', user.password);
    console.log('🔐 [AUTH] Senha válida:', ok);
    
    if (!ok) {
      console.log('❌ [AUTH] Senha incorreta - lançando erro');
      throw invalid;
    }

    console.log('✅ [AUTH] Credenciais válidas - gerando tokens...');

    return this.generateTokensAndResponse(user, deviceId, {
      isNewSession: true,
      tenantSlug,
    });
  }

  // 🔐 Login Google (tenantSlug opcional para montar contexto)
  async googleLogin(idToken: string, deviceId: string, tenantSlug?: string) {
    if (!idToken) throw new UnauthorizedException('Token Google ausente');

    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID?.trim(),
    });
    const payload = ticket.getPayload();
    if (!payload?.email)
      throw new UnauthorizedException('Google token sem e-mail');

    const email = payload.email;
    const name = payload.name ?? '';
    const picture = payload.picture ?? '';
    const googleId = payload.sub ?? '';

    let user = await this.usersService.findByEmail(email);
    if (!user) {
      console.log('❌ [AUTH] Usuário não encontrado na base de dados:', email);
      throw new NotFoundException(`Usuário com email ${email} não está cadastrado no sistema. Entre em contato com o administrador para solicitar acesso.`);
    }

    // Verificar se o usuário está ativo
    if (!user.isActive) {
      console.log('❌ [AUTH] Usuário inativo - bloqueando login Google');
      throw new UnauthorizedException(
        'Sua conta está aguardando aprovação do líder do ministério. Entre em contato com o líder ou aguarde a aprovação.',
      );
    }

    return this.generateTokensAndResponse(user, deviceId, {
      isNewSession: true,
      tenantSlug,
    });
  }

  private async generateTokensAndResponse(
    user: any, // Temporariamente usando any para evitar erro de import
    deviceId: string,
    opts?: {
      isNewSession?: boolean;
      absoluteExpiry?: Date;
      tenantSlug?: string;
    },
  ): Promise<LoginResponseDto> {
    const now = new Date();
    const sessionExpiry = new Date(
      now.getTime() +
        (this.configService.get<number>('environment.jwt.refreshExpiresIn') || 604800) * 1000,
    );
    const absoluteExpiry =
      opts?.absoluteExpiry ||
      new Date(
        now.getTime() +
          (this.configService.get<number>('JWT_ABSOLUTE_EXPIRES_IN') || 2592000) * 1000,
      );

    // Gerar refresh token
    const refreshToken = this.jwtService.sign(
      {
        sub: user._id.toString(),
        deviceId,
        type: 'refresh',
      },
      {
        secret: this.configService.get<string>('environment.jwt.refreshSecret'),
        expiresIn: this.configService.get<number>('environment.jwt.refreshExpiresIn'),
      },
    );

    // 🆕 Preparar claims de segurança para o access token
    const securityClaims = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      deviceId,
      type: 'access',
      // Contexto de segurança (será preenchido abaixo)
      tenantId: null as string | null, // ObjectId como string
      branchId: null as string | null,
      membershipRole: null as string | null,
      permissions: [] as string[],
    };

    // Salvar refresh token no usuário
    await this.usersService.addRefreshToken(
      user._id.toString(),
      refreshToken,
      deviceId,
      opts?.isNewSession ?? true,
      absoluteExpiry,
    );

    // 🆕 Preparar resposta base (sem dados sensíveis)
    const response: LoginResponseDto = {
      access_token: '', // Será preenchido abaixo
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: this.configService.get<number>('environment.jwt.accessExpiresIn') || 3600, // Usa configuração do ConfigService
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        // Só inclui picture se existir
        ...(user.picture && { picture: user.picture }),
      },
      // 🚫 REMOVIDO: tenant, branches, memberships do body
      // Esses dados agora vêm do JWT token
    };

    // 🎯 Contexto específico (apenas se tenantSlug foi fornecido)
    if (opts?.tenantSlug) {
      // Verifica se é um ObjectId válido antes de fazer a query
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(opts.tenantSlug);
      if (!isValidObjectId) {
        throw new NotFoundException('Tenant não encontrado.');
      }

      // tenantSlug agora é o ObjectId do tenant
      const tenant = await this.tenantModel
        .findById(opts.tenantSlug)
        .select('_id name logoUrl')
        .lean();

      if (tenant) {
        // Buscar memberships do usuário neste tenant
        console.log('🔍 [AUTH] Buscando memberships do usuário:');
        console.log('   - User ID:', user._id);
        console.log('   - Tenant ID:', opts.tenantSlug);
        
        const memberships = await this.memModel
          .find({
            user: user._id,
            tenant: new Types.ObjectId(opts.tenantSlug), // ObjectId do tenant
            isActive: true,
          })
          .populate({
            path: 'branch',
            select: '_id branchId name',
            match: { isActive: true },
          })
          .populate({
            path: 'ministry',
            select: '_id name',
            match: { isActive: true },
          })
          .select('role branch ministry isActive')
          .lean();
          
        console.log('🔍 [AUTH] Memberships encontrados:', memberships.length);
        memberships.forEach((m, index) => {
          console.log(`   - Membership ${index + 1}:`);
          console.log(`     - Role: ${m.role}`);
          console.log(`     - IsActive: ${m.isActive}`);
          console.log(`     - Branch: ${m.branch ? 'Sim' : 'Não'}`);
          console.log(`     - Ministry: ${m.ministry ? 'Sim' : 'Não'}`);
        });

        if (memberships.length > 0) {
          // 🆕 Atualizar claims de segurança com dados do tenant específico
          const mainMembership = memberships[0];
          console.log('🔍 [AUTH] Usando membership principal:');
          console.log('   - Role do usuário:', user.role);
          console.log('   - Role do membership:', mainMembership.role);
          console.log('   - Membership ativo:', mainMembership.isActive);
          
          securityClaims.tenantId = tenant._id.toString(); // ObjectId como string
          securityClaims.branchId =
            (mainMembership.branch as any)?.branchId || null;
          securityClaims.membershipRole = mainMembership.role;
          securityClaims.permissions = getCombinedPermissions(
            user.role,
            mainMembership.role,
          );
          
          console.log('🔍 [AUTH] Claims de segurança definidos:');
          console.log('   - membershipRole:', securityClaims.membershipRole);
          console.log('   - permissions:', securityClaims.permissions);

          // 🆕 Adicionar dados não sensíveis na resposta (apenas para UI)
          response.tenant = {
            id: tenant._id.toString(),
            tenantId: tenant._id.toString(), // ObjectId como string
            name: tenant.name,
            // Só inclui logoUrl se existir
            ...(tenant.logoUrl && { logoUrl: tenant.logoUrl }),
          };

          // Processar memberships (apenas dados não sensíveis)
          response.memberships = memberships.map((m) => ({
            id: m._id.toString(),
            role: m.role,
            permissions: getCombinedPermissions(user.role, m.role), // ✅ Adicionado de volta
            // Só inclui branch se existir e estiver ativa
            ...(m.branch && {
              branch: {
                id: m.branch._id.toString(),
                branchId: (m.branch as any).branchId,
                name: (m.branch as any).name,
              },
            }),
            // Só inclui ministry se existir e estiver ativo
            ...(m.ministry && {
              ministry: {
                id: m.ministry._id.toString(),
                name: (m.ministry as any).name,
              },
            }),
          }));

          // Extrair branches únicas
          const uniqueBranches = new Map();
          memberships.forEach((m) => {
            if (m.branch) {
              const branchId = m.branch._id.toString();
              if (!uniqueBranches.has(branchId)) {
                uniqueBranches.set(branchId, {
                  id: branchId,
                  branchId: (m.branch as any).branchId,
                  name: (m.branch as any).name,
                });
              }
            }
          });

          if (uniqueBranches.size > 0) {
            response.branches = Array.from(uniqueBranches.values());
          }
        }
      }
    } else {
      // 🆕 Se não foi fornecido tenantSlug, busca todos os memberships ativos do usuário
      console.log('🔍 Buscando todos os memberships do usuário...');

      const allMemberships = await this.memModel
        .find({
          user: user._id,
          isActive: true,
        })
        .populate({
          path: 'branch',
          select: '_id branchId name',
          match: { isActive: true },
        })
        .populate({
          path: 'ministry',
          select: '_id name',
          match: { isActive: true },
        })
        .select('role branch ministry tenant')
        .lean();

      console.log(`📋 Encontrados ${allMemberships.length} memberships ativos`);

      if (allMemberships.length > 0) {
        // 🆕 TRATAMENTO ESPECIAL PARA SERVUSADMIN
        if (user.role === Role.ServusAdmin) {
          console.log(
            '👑 ServusAdmin detectado - definindo permissões globais',
          );

          // ServusAdmin tem acesso global sem depender de membership
          securityClaims.tenantId = 'servus-system';
          securityClaims.branchId = null;
          securityClaims.membershipRole = 'servus_admin';
          securityClaims.permissions = getCombinedPermissions(user.role); // Apenas permissões globais

          console.log('🔐 ServusAdmin - claims definidos:', {
            tenantId: securityClaims.tenantId,
            membershipRole: securityClaims.membershipRole,
            permissions: securityClaims.permissions.length,
          });
        } else {
          // 🆕 Atualizar claims de segurança com dados do primeiro membership
          const firstMembership = allMemberships[0];
          if (firstMembership.tenant) {
            // firstMembership.tenant é um ObjectId
            const tenantId = firstMembership.tenant.toString();
            
            securityClaims.tenantId = tenantId;
            securityClaims.branchId =
              (firstMembership.branch as any)?.branchId || null;
            securityClaims.membershipRole = firstMembership.role;
            securityClaims.permissions = getCombinedPermissions(
              user.role,
              firstMembership.role,
            );

            // 🆕 Atualizar o tenantId do usuário se estiver null
            if (!user.tenantId && tenantId) {
              await this.usersService.update(user._id.toString(), { tenantId: tenantId }, tenantId);
            }
          }
        }

        // Processar todos os memberships (apenas dados não sensíveis)
        response.memberships = allMemberships.map((m) => ({
          id: m._id.toString(),
          role: m.role,
          permissions: getCombinedPermissions(user.role, m.role), // ✅ Adicionado de volta
          // Inclui tenant se existir (m.tenant é ObjectId)
          ...(m.tenant && {
            tenant: {
              id: m.tenant.toString(),
              tenantId: m.tenant.toString(),
              name: 'Tenant', // Nome será preenchido pelo frontend se necessário
            },
          }),
          // Só inclui branch se existir e estiver ativa
          ...(m.branch && {
            branch: {
              id: m.branch._id.toString(),
              branchId: (m.branch as any).branchId,
              name: (m.branch as any).name,
            },
          }),
          // Só inclui ministry se existir e estiver ativo
          ...(m.ministry && {
            ministry: {
              id: m.ministry._id.toString(),
              name: (m.ministry as any).name,
            },
          }),
        }));

        // Se o usuário tem apenas um tenant, define como tenant principal
        const uniqueTenants = new Map();
        allMemberships.forEach((m) => {
          if (m.tenant) {
            // m.tenant é uma string UUID
            const tenantId = m.tenant;
            if (tenantId && !uniqueTenants.has(tenantId)) {
              uniqueTenants.set(tenantId, {
                id: tenantId,
                tenantId: tenantId,
                name: 'Tenant', // Nome será preenchido pelo frontend se necessário
              });
            }
          }
        });

        if (uniqueTenants.size === 1) {
          // Usuário tem apenas um tenant, define como principal
          const mainTenant = uniqueTenants.values().next().value;
          response.tenant = mainTenant;
          console.log(
            `✅ Tenant principal definido: ${mainTenant.name} (${mainTenant.tenantId})`,
          );
        } else if (uniqueTenants.size > 1) {
          // Usuário tem múltiplos tenants, não define um como principal
          console.log(
            `⚠️ Usuário tem ${uniqueTenants.size} tenants - não definindo principal`,
          );
        }

        // Extrair branches únicas de todos os memberships
        const uniqueBranches = new Map();
        allMemberships.forEach((m) => {
          if (m.branch) {
            const branchId = m.branch._id.toString();
            if (!uniqueBranches.has(branchId)) {
              uniqueBranches.set(branchId, {
                id: branchId,
                branchId: (m.branch as any).branchId,
                name: (m.branch as any).name,
              });
            }
          }
        });

        if (uniqueBranches.size > 0) {
          response.branches = Array.from(uniqueBranches.values());
          console.log(`🏢 Encontradas ${uniqueBranches.size} branches únicas`);
        }
      }
    }

    // 🆕 Gerar access token com claims de segurança
    const accessToken = this.jwtService.sign(securityClaims, {
      secret: this.configService.get<string>('environment.jwt.accessSecret'),
      expiresIn: this.configService.get<number>('environment.jwt.accessExpiresIn'),
    });

    // 🆕 Atualizar resposta com o token gerado
    response.access_token = accessToken;

    console.log('🔐 Login response (seguro):', {
      user: response.user.name,
      role: securityClaims.role,
      tenantId: securityClaims.tenantId,
      branchId: securityClaims.branchId,
      membershipRole: securityClaims.membershipRole,
      permissions: securityClaims.permissions.length,
    });

    return response;
  }

  async refreshToken(token: string, deviceId: string, tenantSlug?: string) {
    const user = await this.usersService.findByRefreshToken(token);
    if (!user)
      throw new UnauthorizedException('Refresh token inválido ou expirado');

    const session = user.refreshTokens.find((rt) => rt.token === token);
    if (!session) throw new UnauthorizedException('Sessão não encontrada');

    if (
      session.absoluteExpiry &&
      new Date() > new Date(session.absoluteExpiry)
    ) {
      await this.usersService.removeRefreshToken(user._id.toString(), token);
      throw new UnauthorizedException('Sessão expirada, faça login novamente');
    }

    const preservedAbsoluteExpiry = session.absoluteExpiry;
    await this.usersService.removeRefreshToken(user._id.toString(), token);

    // o front pode mandar o tenantSlug atual num header/param da rota de refresh se você quiser reaplicar contexto
    return this.generateTokensAndResponse(user, deviceId, {
      isNewSession: false,
      absoluteExpiry: preservedAbsoluteExpiry,
      tenantSlug,
    });
  }

  async getUserContext(userId: string): Promise<UserContextDto> {
    console.log('🔍 getUserContext - userId recebido:', userId);
    console.log('🔍 getUserContext - tipo do userId:', typeof userId);

    // Buscar todos os memberships ativos do usuário
    console.log(
      '🔍 getUserContext - Buscando memberships para userId:',
      userId,
    );

    // Converter userId para ObjectId
    const userIdObjectId = new Types.ObjectId(userId);
    console.log(
      '🔍 getUserContext - userId convertido para ObjectId:',
      userIdObjectId,
    );

    const allMemberships = await this.memModel
      .find({
        user: userIdObjectId,
        isActive: true,
      })
      .populate({
        path: 'tenant',
        select: '_id name logoUrl',
        match: { isActive: true },
      })
      .populate({
        path: 'branch',
        select: '_id branchId name',
        match: { isActive: true },
      })
      .populate({
        path: 'ministry',
        select: '_id name',
        match: { isActive: true },
      })
      .select('role branch ministry tenant')
      .lean();

    console.log(
      '🔍 getUserContext - memberships encontrados:',
      allMemberships.length,
    );
    console.log(
      '🔍 getUserContext - memberships detalhados:',
      JSON.stringify(allMemberships, null, 2),
    );

    // Buscar dados do usuário para combinar permissões
    const user = await this.usersService.findById(userId);
    console.log(
      '🔍 getUserContext - usuário encontrado:',
      user ? 'SIM' : 'NÃO',
    );
    if (!user) {
      console.log(
        '❌ getUserContext - usuário não encontrado para ID:',
        userId,
      );
      throw new UnauthorizedException('Usuário não encontrado');
    }

    console.log('🔍 getUserContext - usuário:', {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // 🔍 TRATAMENTO ESPECIAL PARA SERVUSADMIN
    if (user.role === Role.ServusAdmin) {
      console.log(
        '👑 getUserContext - ServusAdmin detectado, retornando acesso global',
      );

      // Para ServusAdmin, buscar TODOS os tenants ativos do sistema
      const allTenants = await this.tenantModel
        .find({ isActive: true })
        .select('_id tenantId name logoUrl')
        .lean();

      console.log(
        `🔍 getUserContext - ServusAdmin: ${allTenants.length} tenants encontrados`,
      );

      const tenants = allTenants.map((tenant) => ({
        id: tenant._id.toString(),
        tenantId: tenant._id.toString(), // ObjectId como string
        name: tenant.name,
        ...(tenant.logoUrl && { logoUrl: tenant.logoUrl }),
        memberships: [
          {
            id: 'servus-admin-global',
            role: MembershipRole.TenantAdmin, // Role máximo para ServusAdmin
            permissions: getCombinedPermissions(
              user.role,
              MembershipRole.TenantAdmin,
            ),
            // ServusAdmin não tem branch/ministry específicos
          },
        ],
        branches: [], // ServusAdmin vê todas as branches de todos os tenants
      }));

      return { tenants };
    }

    // 👥 TRATAMENTO NORMAL PARA USUÁRIOS COM MEMBERSHIP
    console.log('👥 getUserContext - Usuário normal, processando memberships');
    console.log('🔍 getUserContext - Memberships encontrados:', allMemberships);

    // 🆕 DETERMINAR MEMBERSHIP PRINCIPAL POR PRIORIDADE DE ROLE
    // Para líderes, usar lógica específica que prioriza o membership de líder
    const primaryMembership = findLeaderPrimaryMembership(allMemberships);
    console.log('🎯 [RolePriority] Membership principal selecionado:', primaryMembership ? {
      role: primaryMembership.role,
      ministry: primaryMembership.ministry?._id?.toString(),
      branch: primaryMembership.branch?._id?.toString()
    } : 'nenhum');

    // Agrupar por tenant
    const tenantsMap = new Map();

    allMemberships.forEach((membership) => {
      console.log('🔍 Processando membership:', membership);

      if (!membership.tenant) {
        console.log('❌ Membership sem tenant, pulando...');
        return; // Skip se tenant foi removido/inativo
      }

      // membership.tenant é uma string UUID
      const tenantId = membership.tenant;
      console.log('🔍 Tenant ID:', tenantId);

      if (!tenantsMap.has(tenantId)) {
        tenantsMap.set(tenantId, {
          id: tenantId,
          tenantId: tenantId,
          name: 'Tenant', // Nome será preenchido pelo frontend se necessário
          memberships: [],
          branchesMap: new Map(),
        });
      }

      const tenant = tenantsMap.get(tenantId);

      // Adicionar membership
      const membershipData: any = {
        id: membership._id.toString(),
        role: membership.role,
        permissions: getCombinedPermissions(user.role, membership.role),
        isPrimary: primaryMembership && membership._id.toString() === primaryMembership._id.toString(),
      };

      // Adicionar branch se existir
      if (membership.branch) {
        const branchData = membership.branch as any;
        membershipData.branch = {
          id: branchData._id.toString(),
          branchId: branchData.branchId,
          name: branchData.name,
        };

        // Adicionar ao mapa de branches únicas
        tenant.branchesMap.set(
          branchData._id.toString(),
          membershipData.branch,
        );
      }

      // Adicionar ministry se existir
      if (membership.ministry) {
        const ministryData = membership.ministry as any;
        membershipData.ministry = {
          id: ministryData._id.toString(),
          name: ministryData.name,
        };
      }

      console.log('🔍 Adicionando membership ao tenant:', membershipData);
      tenant.memberships.push(membershipData);
    });

    // Converter para o formato final
    const tenants = Array.from(tenantsMap.values()).map((tenant) => ({
      id: tenant.id,
      tenantId: tenant.tenantId,
      name: tenant.name,
      ...(tenant.logoUrl && { logoUrl: tenant.logoUrl }),
      memberships: tenant.memberships,
      branches: Array.from(tenant.branchesMap.values()),
    }));

    return { tenants };
  }

  async logout(userId: string, deviceId: string) {
    await this.usersService.removeRefreshToken(userId, deviceId);
  }
}
