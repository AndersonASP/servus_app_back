export enum Role {
  SuperAdmin = 'superadmin',  // Controle geral do sistema (Servus)
  Admin = 'admin',            // Dono da igreja matriz
  BranchAdmin = 'branchadmin',// Admin de filial (opcional, se igreja tem várias sedes)
  Leader = 'leader',          // Líder de ministérios
  Volunteer = 'volunteer',    // Voluntário comum
}