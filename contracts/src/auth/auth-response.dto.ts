import { UserDto } from '../users/user.dto';

export interface AuthResponseDto {

    accessToken: string;

    refreshToken: string;

    user: UserDto;
}