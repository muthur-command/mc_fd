import { post } from '@/services/request'

export interface EmailCaptchaParams {
  recipients: string
}

export function getEmailCaptchaApi(data: EmailCaptchaParams) {
  return post('/v1/emails/captcha', data)
}
