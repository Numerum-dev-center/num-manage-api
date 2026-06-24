import { AttendanceStatus } from "../common/enums";

export interface AttendanceDto {

    id: string;

    studentId: string;

    date: string;

    status: AttendanceStatus;
}