export async function GET() {
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api`,
    { headers: { 'Content-Type': 'text/plain' } }
  )
}
