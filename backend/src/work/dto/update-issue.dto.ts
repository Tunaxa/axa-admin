import { AppKey, IssuePriority, IssueStatus } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * Every field is optional; only what is sent is changed.
 *
 * `workspaceId` is deliberately absent — moving an issue between workspaces is
 * a different operation from editing it, with its own rules about the project
 * and assignee coming along.
 */
export class UpdateIssueDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(IssueStatus)
  status?: IssueStatus;

  @IsOptional()
  @IsEnum(IssuePriority)
  priority?: IssuePriority;

  /// `null` unassigns the issue.
  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;

  /// `null` detaches the issue from its project.
  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  /// `null` clears the linked application.
  @IsOptional()
  @IsEnum(AppKey)
  app?: AppKey | null;
}
