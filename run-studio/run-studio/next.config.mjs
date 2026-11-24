/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: false,
  async headers() {
    return [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }, { key: 'Service-Worker-Allowed', value: '/' }] }];
  }
};
