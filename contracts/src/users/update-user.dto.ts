import { Role } from '../common/enums';

export interface UpdateUserDto {
  firstname?: string;
  lastname?: string;
  email?: string;

  phone?: string;

}