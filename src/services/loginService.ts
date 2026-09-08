export interface LoginUserInfo {
  TMNAME: string
  JOBName: string
  [key: string]: unknown
}

export interface LoginResult {
  ok: boolean
  message: string
  user_info: LoginUserInfo | null
}

const LOGIN_URL = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_LOGIN_URL
  || 'http://localhost/lowPricePurSer/loginService/login'

export async function loginService(username: string, password: string): Promise<LoginResult> {
  const response = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  const data = await response.json()

  return {
    ok: response.ok,
    message: data.message ?? '',
    user_info: data.user_info ?? null,

    
  }
}
