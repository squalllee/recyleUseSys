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

export async function loginService(username: string, password: string): Promise<LoginResult> {
  const response = await fetch('http://localhost/lowPricePurSer/loginService/login', {
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
