export function createPedalSignalRequest(request: Request) {
  return new Request(new URL("/signal", request.url), {
    headers: request.headers,
    method: request.method,
  })
}
