export const JwtConfig = {
  access: {
    secret: process.env.JWT_ACCESS_SECRET || 'default-access-secret-change-in-production',
    expiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_IN || '3600'), // 1 hora em segundos
  },
  refresh: {
    secret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production',
    expiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '604800'), // 7 dias em segundos
  },
}; 