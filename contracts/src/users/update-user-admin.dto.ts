import { Role } from '../common/enums';

export interface UpdateUserAdminDto {
  role?: Role;
  isActive?: boolean;
}