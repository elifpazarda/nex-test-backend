import { IsNotEmpty, IsString } from 'class-validator';

export class JiraOAuthCallbackQuery {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  state: string;
}
