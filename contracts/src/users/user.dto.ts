import { Role, UserStatus } from "../common/enums";

export interface UserDto {

    id: string;

    firstname: string;

    lastname: string;

    email: string;

    role: Role;

    status: UserStatus;

    createdAt: string;
}