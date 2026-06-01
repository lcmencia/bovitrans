/** @type {import('next').NextConfig} */
const nextConfig = {
  // Necesario para la imagen Docker mínima (ver Dockerfile, etapa runner)
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
