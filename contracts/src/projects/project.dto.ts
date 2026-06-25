import { ProjectStatus } from "../common/enums";

export interface ProjectDto {

    id: string;

    title: string;

    description: string;

    technologies: string[];

    githubUrl: string;

    demoUrl: string;

    deadline: string;

    status: ProjectStatus;
}