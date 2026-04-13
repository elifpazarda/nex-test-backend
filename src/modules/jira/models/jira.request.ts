import { IsEmail, IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class SaveJiraConnectionRequest {
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  baseUrl: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  apiToken: string;
}
