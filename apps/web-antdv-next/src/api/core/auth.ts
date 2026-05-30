import { miniRequestClient, requestClient } from '#/api/request';

export interface CaptchaResult {
  is_enabled: boolean;
  expire_seconds: number;
  uuid: string;
  image: string;
}

export interface LoginParams {
  username: string;
  password: string;
  uuid: string;
  captcha: string;
}

export interface LoginResult {
  access_token: string;
  session_uuid: string;
}

export interface RegisterEmailCaptchaParams {
  email: string;
  nickname?: string;
}

export interface RegisterParams {
  nickname?: string;
  email: string;
  captcha: string;
  password: string;
  confirm_password: string;
}

export interface RegisterResult {
  message: string;
  email: string;
}

export type RefreshTokenResult = LoginResult;

/**
 * 登录验证码
 */
export async function getCaptchaApi() {
  return requestClient.get<CaptchaResult>('/api/v1/auth/captcha');
}

/**
 * 登录
 */
export async function loginApi(data: LoginParams) {
  return requestClient.post<LoginResult>('/api/v1/auth/login', data);
}

/**
 * 注册邮箱验证码
 */
export async function sendRegisterEmailCaptchaApi(
  data: RegisterEmailCaptchaParams,
) {
  return requestClient.post('/api/v1/auth/register/email-captcha', data);
}

/**
 * 注册
 */
export async function registerApi(data: RegisterParams) {
  return requestClient.post<RegisterResult>('/api/v1/auth/register', data);
}

/**
 * 刷新accessToken
 */
export async function refreshTokenApi() {
  return miniRequestClient.post<RefreshTokenResult>(
    '/api/v1/auth/refresh',
    undefined,
    {
      withCredentials: true,
    },
  );
}

/**
 * 退出登录
 */
export async function logoutApi() {
  return requestClient.post('/api/v1/auth/logout');
}

/**
 * 获取用户权限码
 */
export async function getAccessCodesApi() {
  return requestClient.get<string[]>('/api/v1/auth/codes');
}
