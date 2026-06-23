import { Role } from '../common/enums';

export interface CreateUserDto {
  firstname: string;
  lastname: string;
  email: string;

  // optionnel si Google Identity est utilisé
  password?: string;
  role: Role;

}