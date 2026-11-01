export async function fetchHealth(): Promise<string> {
  const response = await fetch('/actuator/health/readiness', {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Backend is not ready');
  const data: unknown = await response.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    !('status' in data) ||
    data.status !== 'UP'
  ) {
    throw new Error('Backend is not ready');
  }
  return data.status;
}
