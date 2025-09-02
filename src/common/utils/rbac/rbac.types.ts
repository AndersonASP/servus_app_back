import { Types } from 'mongoose';

export type LeaderPair = {
  branch?: Types .ObjectId;           // undefined/null => matriz
  ministry: Types.ObjectId;
};

export type RbacScope = {
  isServusAdmin: boolean;
  isTenantAdmin: boolean;
  branchAdminIds: Types.ObjectId[];  // branches onde é branch_admin
  leaderPairs: LeaderPair[];         // (branch,ministry) onde é líder
};